import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE = "https://api.openai.com/v1";
const CHAT_MODEL = "gpt-4o-mini";          // fast & cheap; swap to "gpt-4o" if you want top quality
const STT_MODEL = "whisper-1";

const sessions: Record<string, { role: "user" | "assistant"; content: string }[]> = {};

// ── OpenAI Whisper STT ─────────────────────────────────────────────────────────
async function transcribeAudio(audioBuffer: ArrayBuffer, mimeType: string): Promise<string> {
  // OpenAI /v1/audio/transcriptions expects multipart/form-data with a `file` field
  const ext = mimeType.includes("webm") ? "webm"
    : mimeType.includes("ogg") ? "ogg"
      : mimeType.includes("mp4") ? "mp4"
        : "webm";

  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer], { type: mimeType }), `audio.${ext}`);
  formData.append("model", STT_MODEL);
  formData.append("temperature", "0"); // reduce hallucinations
  // Prompt with Indian city names helps Whisper recognize them accurately.
  // The conversational context also steers Whisper away from hallucinating stock phrases.
  formData.append(
    "prompt",
    "A customer is speaking with Priya, a real estate sales agent at PropConnect India. " +
    "The customer is discussing property preferences — budget, location, BHK type, and timeline. " +
    "Indian cities: Gurgaon, Gurugram, Noida, Greater Noida, " +
    "Mumbai, Navi Mumbai, Thane, Pune, Bangalore, Bengaluru, Hyderabad, Chennai, " +
    "Delhi, New Delhi, Dwarka, Faridabad, Ghaziabad, Kolkata, Ahmedabad, Jaipur, " +
    "Lucknow, Chandigarh, Kochi, Indore, Bhopal, Nagpur, Vizag, Coimbatore. " +
    "Terms: BHK, crore, lakh, rupees."
  );

  const res = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Whisper STT error: ${errText}`);
  }

  const data = await res.json();
  const transcript = (data.text ?? "").trim();

  // Whisper often hallucinates these phrases on short/silent clips — reject them
  if (isWhisperHallucination(transcript)) {
    return "";
  }
  return transcript;
}

// ── Whisper hallucination filter ───────────────────────────────────────────────
const HALLUCINATION_PATTERNS = [
  /^(thank(s| you)[\.!,\s]*)+$/i,
  /^thanks? for (watching|listening|viewing|your time)[\.!\s]*$/i,
  /^(please )?(like|subscribe|share).*$/i,
  /^(goodbye|bye[- ]?bye|see you)[\.!\s]*$/i,
  /^(you|you\.)+$/i,
  /^\.*$/,                           // just dots/periods
  /^(\s*music\s*)+$/i,               // "[Music]" or "music"
  /^\[.*\]$/,                        // any bracketed text like [Music], [Applause]
];

function isWhisperHallucination(text: string): boolean {
  if (!text || text.length < 2) return true;  // too short to be real speech
  const cleaned = text.replace(/[\s.!,]+$/g, "").trim();
  if (cleaned.length < 2) return true;
  return HALLUCINATION_PATTERNS.some((p) => p.test(cleaned));
}

// ── OpenAI Chat Completion ─────────────────────────────────────────────────────
async function chatCompletion(
  systemPrompt: string,
  history: { role: string; content: string }[],
  maxTokens = 300
): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!res.ok) throw new Error(`Chat completion error: ${await res.text()}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// ── Health check ──────────────────────────────────────────────────────────────
export async function GET() {
  const hasKey = !!OPENAI_API_KEY;
  return NextResponse.json({
    status: "ok",
    apiKeySet: hasKey,
    message: hasKey
      ? "✅ API route live. OPENAI_API_KEY is set."
      : "❌ OPENAI_API_KEY not set. Add it to .env.local and restart.",
  });
}

// ── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not set. Add it to .env.local and restart." },
      { status: 500 }
    );
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let userText = "";
    let sessionId = "default";
    let leadData: Record<string, string> | null = null;
    let usedSTT = false;

    // ── Accept either FormData (with audio blob) or JSON (pre-transcribed text)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;
      sessionId = (formData.get("sessionId") as string) || "default";
      const rawLead = formData.get("leadData") as string | null;
      if (rawLead) {
        try { leadData = JSON.parse(rawLead); } catch { /* ignore */ }
      }

      if (!audioFile) {
        return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
      }

      const audioBuffer = await audioFile.arrayBuffer();
      const mimeType = audioFile.type || "audio/webm";
      userText = await transcribeAudio(audioBuffer, mimeType);
      usedSTT = true;
    } else {
      // JSON path (pre-transcribed, e.g. from Web Speech API fallback)
      const body = await req.json();
      userText = body.userText ?? "";
      sessionId = body.sessionId ?? "default";
      leadData = body.leadData ?? null;
    }

    if (!userText) {
      return NextResponse.json(
        { error: "Could not transcribe audio. Please speak clearly and try again." },
        { status: 400 }
      );
    }

    // ── Build conversation history
    if (!sessions[sessionId]) sessions[sessionId] = [];
    sessions[sessionId].push({ role: "user", content: userText });
    const history = sessions[sessionId].slice(-10);

    // ── Lead context string
    let leadContext = "";
    if (leadData) {
      const parts: string[] = [];
      if (leadData.budget) parts.push(`Budget: ${leadData.budget}`);
      if (leadData.location) parts.push(`Location: ${leadData.location}`);
      if (leadData.bhk) parts.push(`BHK: ${leadData.bhk}`);
      if (leadData.timeline) parts.push(`Timeline: ${leadData.timeline}`);
      if (parts.length) leadContext = `\n\nLead info captured so far: ${parts.join(", ")}`;
    }

    // ── 1. Sales reply
    const systemPrompt = `You are Priya, a sharp and friendly real estate sales agent at PropConnect India.
Your goal is to qualify leads and get them excited about properties.

PERSONALITY:
- Warm, confident, and persuasive but never pushy
- Use natural conversational Hindi-English mix occasionally (like "bilkul", "haan", "acha")
- Sound excited about properties, create urgency naturally
- Keep responses SHORT — 2-3 sentences max (this is a voice conversation)

YOUR WORKFLOW:
1. First interaction: Greet warmly and ask about budget + location
2. Then: Ask about BHK preference and timeline
3. Then: Pitch a matching property enthusiastically
4. Always end with a question to keep the conversation going

IMPORTANT:
- Never mention you're an AI
- Use phrases like "Great choice!", "Excellent budget!", "You're going to love this"
- Create FOMO: "We only have 2 units left at this price"
- Output ONLY the spoken reply, no stage directions, no quotes around it${leadContext}`;

    const replyText = (await chatCompletion(systemPrompt, history, 200)) || "Sorry, could you repeat that?";
    sessions[sessionId].push({ role: "assistant", content: replyText });

    // ── 2. Lead extraction (uses full conversation for multi-turn capture)
    let extractedLead: Record<string, string | null> = {};
    try {
      const extractSystem = `You are a data extractor for an Indian real estate company.
Analyze the ENTIRE conversation below and extract any real estate lead information mentioned by the user across ALL messages.

Return ONLY a valid JSON object with exactly these keys (use null if not mentioned anywhere in the conversation):
{"budget": null, "location": null, "bhk": null, "timeline": null, "name": null, "phone": null}

Rules:
- budget: Extract amount in Indian format (e.g. "50 lakhs", "1.5 crore", "80L-1Cr")
- location: Indian city/area name (e.g. "Gurgaon", "Whitefield Bangalore", "Noida Sector 150")
- bhk: Apartment type (e.g. "2 BHK", "3 BHK", "4 BHK")
- timeline: When they want to buy (e.g. "3 months", "immediate", "next year")
- name: Person's name if mentioned
- phone: Phone number if mentioned

No markdown fences. No explanation. Just the raw JSON object.`;

      // Send the full conversation history so extraction can capture data from all turns
      const raw = await chatCompletion(extractSystem, history, 150);
      const match = raw.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Filter out null values so the frontend updateLead only overwrites with real data
        for (const key of Object.keys(parsed)) {
          if (parsed[key] !== null && parsed[key] !== undefined && parsed[key] !== "") {
            extractedLead[key] = parsed[key];
          }
        }
      }
    } catch { /* ignore extraction errors */ }

    // ── 3. TTS — Google Cloud or Web Speech fallback
    let audioBase64 = "";
    try {
      const ttsKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY;
      if (ttsKey) {
        const ttsRes = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { text: replyText },
              voice: { languageCode: "en-IN", name: "en-IN-Wavenet-A", ssmlGender: "FEMALE" },
              audioConfig: { audioEncoding: "MP3", speakingRate: 1.05, pitch: 1.0 },
            }),
          }
        );
        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          audioBase64 = ttsData.audioContent || "";
        }
      }
    } catch { /* TTS failed — frontend will use Web Speech API fallback */ }

    return NextResponse.json({
      userText,
      replyText,
      audio: audioBase64,
      useFallbackTTS: !audioBase64,
      usedSTT,
      extractedLead,
      sessionId,
    });

  } catch (error: unknown) {
    console.error("[Voice API Error]", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}