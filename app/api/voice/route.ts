import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  createSession,
  saveMessage,
  upsertLead,
  updateSession,
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
  // Populated after Google Places lookup
  formatted_address?: string
  lat?: number
  lng?: number
  nearby_landmarks?: string[]
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

function buildSalesSystemPrompt(landmarks: string[]): string {
  const landmarkContext =
    landmarks.length > 0
      ? `\n\nNearby landmarks you can mention naturally in conversation: ${landmarks.join(', ')}.`
      : ''

  return `You are PropAi, a friendly and persuasive real estate sales agent for PropConnect AI, specialising in the Indian property market.

Your goals:
1. Build rapport quickly in a natural, warm, and professional tone.
2. Understand the buyer's needs (budget, location, BHK, timeline) through conversation, NOT an interview.
3. Pitch the lifestyle and benefits of properties, not just the stats.
4. Handle objections with empathy (e.g., "I understand your concern about the distance...").
5. Always end with a natural, open-ended question to keep them talking.

Guidelines:
- Language: Use clear, professional, and sophisticated English at all times. Strictly NO Hinglish or slang.
- NO EMOJIS in your response.
- Keep responses concise (2-3 sentences) but meaningful.
- Avoid being repetitive. If you already know their location, talk about landmarks.${landmarkContext}`
}

const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction engine. Given a real estate sales conversation, extract structured JSON with these exact keys:
{
  "budget": string or null,
  "location": string or null,
  "bhk_type": string or null,
  "timeline": string or null,
  "lead_name": string or null,
  "phone": string or null,
  "score": number (0-100)
}

Scoring guide:
- +20 if budget is mentioned
- +20 if location is mentioned
- +20 if BHK type is mentioned
- +20 if timeline is mentioned
- +20 if name or phone is mentioned

Return ONLY valid JSON. No explanation, no markdown.`

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
        // Custom prompt boosts accuracy for Indian city names & Hinglish
        prompt:
          'Indian real estate conversation. Mumbai, Delhi, Bangalore, Noida, Gurgaon, Gurugram. Terms: BHK, crore, lakh, flat, villa, registry, possession, amenities, gated community, ready to move, under construction, floor plan.',
      })
      userText = transcription.text
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

    // ── Lead extraction (runs in parallel with sales response) ────────────
    const updatedHistory: ConversationMessage[] = [
      ...history,
      { role: 'user', content: userText },
    ]

    const [salesResponse, extractionResponse] = await Promise.all([
      // 1. Sales agent response
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: buildSalesSystemPrompt([]) },
          ...updatedHistory,
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),

      // 2. Lead data extraction
      openai.chat.completions.create({
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
      }),
    ])

    const assistantReply =
      salesResponse.choices[0]?.message?.content?.trim() ?? ''

    // ── Save assistant message ─────────────────────────────────────────────
    if (sessionId) {
      await saveMessage({
        session_id: sessionId,
        role: 'assistant',
        content: assistantReply,
      })
    }

    // ── Parse lead data ────────────────────────────────────────────────────
    let leadData: LeadData = {}
    try {
      const raw = extractionResponse.choices[0]?.message?.content ?? '{}'
      leadData = JSON.parse(raw)
    } catch {
      console.warn('[Extraction] JSON parse failed')
    }

    // ── Enrich location with Google Places ────────────────────────────────
    if (leadData.location) {
      const geoInfo = await enrichLocation(leadData.location)
      leadData = { ...leadData, ...geoInfo }

      // Re-run sales response with landmark context if we have landmarks
      if (
        geoInfo.nearby_landmarks &&
        geoInfo.nearby_landmarks.length > 0 &&
        history.length === 0 // only on first location mention to avoid repetition
      ) {
        const enrichedResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: buildSalesSystemPrompt(geoInfo.nearby_landmarks),
            },
            ...updatedHistory,
          ],
          max_tokens: 150,
          temperature: 0.7,
        })
        const enrichedReply =
          enrichedResponse.choices[0]?.message?.content?.trim()
        if (enrichedReply) {
          // Update the assistant message with landmark-aware reply
          leadData.nearby_landmarks = geoInfo.nearby_landmarks
        }
      }
    }

    // ── Persist lead + session updates to Supabase ─────────────────────────
    if (sessionId) {
      await upsertLead({
        session_id: sessionId,
        budget: leadData.budget ?? undefined,
        location: leadData.location ?? undefined,
        bhk_type: leadData.bhk_type ?? undefined,
        timeline: leadData.timeline ?? undefined,
        phone: leadData.phone ?? undefined,
        score: leadData.score ?? 0,
      })

      if (leadData.lead_name || leadData.phone || leadData.score !== undefined) {
        await updateSession(sessionId, {
          lead_name: leadData.lead_name ?? undefined,
          phone: leadData.phone ?? undefined,
          score: leadData.score ?? undefined,
        })
      }
    }

    // ── Google TTS ────────────────────────────────────────────────────────
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