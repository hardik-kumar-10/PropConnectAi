import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  createSession,
  saveMessage,
  upsertLead,
  updateSession,
  Lead,
  supabase
} from '@/app/lib/supabase'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface LeadData {
  budget?: string
  location?: string
  bhk_type?: string
  timeline?: string
  score?: number
  lead_name?: string
  phone?: string
  preferences?: string
  // Populated after Google Places lookup
  formatted_address?: string
  lat?: number
  lng?: number
  nearby_landmarks?: string[]
  listings?: any[]
}

// ── Google Places helper ───────────────────────────────────────────────────

async function enrichLocation(location: string): Promise<{
  formatted_address?: string
  lat?: number
  lng?: number
  nearby_landmarks?: string[]
}> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey || !location) return {}

  try {
    // 1. Geocode the location string
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        location + ', India'
      )}&key=${apiKey}`
    )
    const geoData = await geoRes.json()
    if (geoData.status !== 'OK') return {}

    const { lat, lng } = geoData.results[0].geometry.location
    const formatted_address: string = geoData.results[0].formatted_address

    // 2. Fetch nearby landmarks (metro, schools, hospitals within 2 km)
    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=2000&type=transit_station|school|hospital&key=${apiKey}`
    )
    const placesData = await placesRes.json()

    const nearby_landmarks: string[] = (placesData.results || [])
      .slice(0, 5)
      .map((p: { name: string }) => p.name)

    return { formatted_address, lat, lng, nearby_landmarks }
  } catch (err) {
    console.error('[Places] enrichLocation error:', err)
    return {}
  }
}

// ── System prompts ─────────────────────────────────────────────────────────

function buildSalesSystemPrompt(landmarks: string[], marketData?: string, listings?: any[]): string {
  const landmarkContext =
    landmarks.length > 0
      ? `\n\nNearby landmarks you can mention naturally in conversation: ${landmarks.join(', ')}.`
      : ''

  const marketContext = marketData
    ? `\n\nMarket insights for this area:\n${marketData}`
    : ''

  const listingContext = listings && listings.length > 0
    ? `\n\nCRITICAL: You MUST mention at least 2 of these specific properties by their FULL NAME and PRICE in your reply:
    ${listings.map(l => `- "${l.title}" available for ${l.price}`).join('\n')}
    
    If you don't mention the name and price, you are failing your job.`
    : ''

  return `You are PropAi, a friendly and persuasive real estate sales agent for PropConnect AI, specialising in the Indian property market.

Your goals:
1. Build rapport quickly in a natural, warm, and professional tone.
2. Understand the buyer's needs (budget, location, BHK, timeline).
3. Pitch specific properties using the REAL-TIME LISTINGS provided below.
4. Always end with a natural, open-ended question.

Guidelines:
- Language: Sophisticated English. Strictly NO Hinglish.
- NO EMOJIS.
- Be extremely specific. Mention property names and exact prices.
- FORMATTING: Use clear bullet points and line breaks for listing properties. For example:
  - **Property Name**: Price and details.
- If listings are provided, prioritize pitching them over general advice.${landmarkContext}${marketContext}${listingContext}`
}

const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction engine. Given a real estate sales conversation, extract structured JSON with these exact keys:
{
  "budget": string or null,
  "location": string or null,
  "bhk_type": string or null,
  "timeline": string or null,
  "lead_name": string or null,
  "phone": string or null,
  "preferences": string or null (capture any other specific needs like floor, amenities, pet-friendly, etc.),
  "score": number (0-100)
}

Scoring guide:
- +20 if budget is mentioned
- +20 if location is mentioned
- +20 if BHK type is mentioned
- +20 if timeline is mentioned
- +20 if name or phone is mentioned

Return ONLY valid JSON. No explanation, no markdown.`

// ── NoBroker API helper ────────────────────────────────────────────────────

async function fetchNoBrokerListings(lat: number, lng: number, bhk?: string, locationName?: string): Promise<any[]> {
  try {
    const searchParam = Buffer.from(JSON.stringify([{
      lat,
      lon: lng,
      placeId: "custom_id", // Simplified for internal use
      placeName: locationName || "Selected Area"
    }])).toString('base64');

    // Map BHK type to NoBroker codes (BHK1, BHK2, etc.)
    let typeCode = 'BHK2'; // Default
    if (bhk) {
      const match = bhk.match(/\d/);
      if (match) typeCode = `BHK${match[0]}`;
    }

    // Determine city from locationName or fallback to bangalore
    let city = 'bangalore';
    const locLower = (locationName || '').toLowerCase();
    if (locLower.includes('mumbai')) city = 'mumbai';
    else if (locLower.includes('delhi')) city = 'delhi';
    else if (locLower.includes('chennai')) city = 'chennai';
    else if (locLower.includes('pune')) city = 'pune';
    else if (locLower.includes('hyderabad')) city = 'hyderabad';
    else if (locLower.includes('gurgaon') || locLower.includes('gurugram')) city = 'gurgaon';

    const url = `https://www.nobroker.in/api/v1/property/filter/region/all?pageNo=1&searchParam=${searchParam}&type=${typeCode}&city=${city}&radius=2.0`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.properties || []).slice(0, 10).map((p: any) => ({
      title: p.propertyTitle,
      price: p.priceDisplay || `${p.price / 100000} Lakhs`,
      type: p.secondaryTitle,
      link: `https://www.nobroker.in/property/buy/bangalore/${p.propertyId}`,
      lat: p.latitude,
      lng: p.longitude,
      source: 'NoBroker'
    }));
  } catch (err) {
    console.error('[NoBroker] fetch error:', err);
    return [];
  }
}

// ── Market Data helper ─────────────────────────────────────────────────────

async function getMarketInsights(city?: string, area?: string): Promise<string> {
  if (!city && !area) return '';

  try {
    let query = supabase.from('market_data').select('*');
    if (area) query = query.ilike('area', `%${area}%`);
    if (city) query = query.ilike('city', `%${city}%`);

    const { data, error } = await query.limit(50);
    if (error || !data || data.length === 0) return '';

    const avgRent = Math.round(data.reduce((sum, item) => sum + item.rent_amount, 0) / data.length);
    const petFriendly = data.filter(item => item.animal_allowance === 'acept').length / data.length > 0.5;
    const furnishedRatio = data.filter(item => item.furniture === 'furnished').length / data.length;

    return `- Average rent in this area is approximately ₹${avgRent.toLocaleString()}.
- ${petFriendly ? 'Most properties here are pet-friendly.' : 'Pet policies vary by building.'}
- ${furnishedRatio > 0.4 ? 'A good portion of units come furnished.' : 'Most units are unfurnished, giving you more freedom to design.'}`;
  } catch (err) {
    console.error('[MarketData] error:', err);
    return '';
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioBlob = formData.get('audio') as File | null
    const historyRaw = formData.get('history') as string | null
    let sessionId = formData.get('session_id') as string | null

    const history: ConversationMessage[] = historyRaw
      ? JSON.parse(historyRaw)
      : []

    // ── Create session on first turn ───────────────────────────────────────
    if (!sessionId) {
      console.log('[API] Creating new session...')
      sessionId = await createSession()
      console.log('[API] Session ID:', sessionId)
    }

    if (!sessionId) {
      console.error('[API] Failed to create session. Check your Supabase keys in .env.local')
    }

    // ── STT: Transcribe audio ──────────────────────────────────────────────
    let userText = ''
    if (audioBlob) {
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: audioBlob,
        language: 'en', // Force English transcription
        // Custom prompt boosts accuracy for Indian city names & strictly enforces English
        prompt:
          'Indian real estate conversation in English. Transcribe strictly in English. Mumbai, Delhi, Bangalore, Noida, Gurgaon, Gurugram. Terms: BHK, crore, lakh, flat, villa, registry, possession, amenities, gated community, ready to move, under construction, floor plan, next month, immediate, next year, timeline.',
      })
      userText = transcription.text

      // ── Hallucination Filter ──────────────────────────────────────────────
      const hallucinations = [
        'next word, snake',
        'thanks for watching',
        'please subscribe',
        'next time',
      ]
      const lowerText = userText.toLowerCase().trim().replace(/[.,!]/g, '')
      if (hallucinations.some(h => lowerText === h)) {
        console.warn('[Whisper] Hallucination detected:', userText)
        return NextResponse.json({ error: 'Audio unclear, please try again' }, { status: 400 })
      }
    } else {
      // Allow text-only fallback (useful for testing)
      userText = (formData.get('text') as string) || ''
    }

    if (!userText.trim()) {
      return NextResponse.json({ error: 'No input received' }, { status: 400 })
    }

    // ── Save user message ──────────────────────────────────────────────────
    if (sessionId) {
      await saveMessage({ session_id: sessionId, role: 'user', content: userText })
    }

    // ── 1. Lead extraction ────────────────────────────────────────────────
    const updatedHistory: ConversationMessage[] = [
      ...history,
      { role: 'user', content: userText },
    ]

    const extractionResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Conversation so far:\n${updatedHistory
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n')}`,
        },
      ],
      max_tokens: 200,
      temperature: 0,
    })

    let leadData: LeadData = {}
    try {
      const raw = extractionResponse.choices[0]?.message?.content ?? '{}'
      leadData = JSON.parse(raw)
    } catch {
      console.warn('[Extraction] JSON parse failed')
    }

    // ── 2. Intelligence Gathering ──────────────────────────────────────────
    let marketInsights = ''
    let listings: any[] = []

    if (leadData.location) {
      const geoInfo = await enrichLocation(leadData.location)
      leadData = { ...leadData, ...geoInfo }

      const [insights, realListings] = await Promise.all([
        getMarketInsights(
          geoInfo.formatted_address?.split(',').slice(-2, -1)[0]?.trim() || 'Bangalore',
          leadData.location
        ),
        geoInfo.lat && geoInfo.lng
          ? fetchNoBrokerListings(geoInfo.lat, geoInfo.lng, leadData.bhk_type, leadData.location)
          : Promise.resolve([])
      ])

      marketInsights = insights
      listings = realListings
      leadData.listings = listings
    }

    // ── 3. Sales Agent Response (with full context) ────────────────────────
    const salesResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: buildSalesSystemPrompt(leadData.nearby_landmarks || [], marketInsights, listings)
        },
        ...updatedHistory,
      ],
      max_tokens: 250,
      temperature: 0.7,
    })

    const assistantReply = salesResponse.choices[0]?.message?.content?.trim() ?? ''

    // ── 4. Persistence ─────────────────────────────────────────────────────
    if (sessionId) {
      await Promise.all([
        saveMessage({ session_id: sessionId, role: 'assistant', content: assistantReply }),
        upsertLead({
          session_id: sessionId,
          budget: leadData.budget ?? undefined,
          location: leadData.location ?? undefined,
          bhk_type: leadData.bhk_type ?? undefined,
          timeline: leadData.timeline ?? undefined,
          phone: leadData.phone ?? undefined,
          preferences: leadData.preferences ?? undefined,
          score: leadData.score ?? 0,
        } as Lead),
        (leadData.lead_name || leadData.phone || leadData.score !== undefined)
          ? updateSession(sessionId, {
            lead_name: leadData.lead_name ?? undefined,
            phone: leadData.phone ?? undefined,
            score: leadData.score ?? undefined,
          })
          : Promise.resolve()
      ])
    }

    // ── 5. Google TTS ──────────────────────────────────────────────────────
    let audioBase64: string | null = null
    if (process.env.GOOGLE_TTS_API_KEY) {
      try {
        const ttsRes = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: {
                text: assistantReply.replace(/[^\x00-\x7F]/g, "") // Removes non-ASCII characters (emojis)
              },
              voice: { languageCode: 'en-IN', name: 'en-IN-Wavenet-D' },
              audioConfig: { audioEncoding: 'MP3', speakingRate: 1.05 },
            }),
          }
        )
        const ttsData = await ttsRes.json()
        audioBase64 = ttsData.audioContent ?? null
      } catch (err) {
        console.warn('[TTS] Google TTS failed, falling back to Web Speech', err)
      }
    }

    return NextResponse.json({
      reply: assistantReply,
      transcript: userText,
      lead_data: leadData,
      session_id: sessionId,
      audio_base64: audioBase64,
    })
  } catch (err) {
    console.error('[Voice API] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}