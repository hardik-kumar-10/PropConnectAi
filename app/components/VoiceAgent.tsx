"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message, LeadData } from "../page";
import ChatBubble from "./ChatBubble";
import MicButton from "./MicButton";

interface Props {
  messages: Message[];
  sessionId: string;
  leadData: LeadData;
  onAddMessage: (role: "user" | "assistant", text: string) => void;
  onUpdateLead: (data: Partial<LeadData>) => void;
}

type AgentState = "idle" | "recording" | "processing" | "speaking";

// Preferred MIME type — Whisper handles webm/ogg/mp4/wav
function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/webm";
}

export default function VoiceAgent({
  messages,
  sessionId,
  leadData,
  onAddMessage,
  onUpdateLead,
}: Props) {
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [currentAudioText, setCurrentAudioText] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingSecondsRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const greetedRef = useRef(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Greet once on load
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const t = setTimeout(() => {
      onAddMessage(
        "assistant",
        "Namaste! 🏠 I'm Priya from PropConnect. I help find your perfect home in India. Tell me — what's your budget and preferred location?"
      );
      speakText(
        "Namaste! I'm Priya from PropConnect. I help find your perfect home in India. Tell me — what's your budget and preferred location?"
      );
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Web Speech API TTS fallback
  const speakText = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 1.0;
    utter.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang.startsWith("en"));
    if (voice) utter.voice = voice;
    utter.onstart = () => setAgentState("speaking");
    utter.onend = () => { setAgentState("idle"); setCurrentAudioText(""); };
    utter.onerror = () => setAgentState("idle");
    window.speechSynthesis.speak(utter);
  }, []);

  // Play MP3 from base64 (Google TTS), fall back to Web Speech
  const playReply = useCallback(
    (replyText: string, audioBase64: string, useFallback: boolean) => {
      setCurrentAudioText(replyText);
      if (!useFallback && audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        audio.onplay = () => setAgentState("speaking");
        audio.onended = () => { setAgentState("idle"); setCurrentAudioText(""); };
        audio.onerror = () => speakText(replyText); // fallback on error
        audio.play().catch(() => speakText(replyText));
      } else {
        speakText(replyText);
      }
    },
    [speakText]
  );

  // Send audio blob → backend (Whisper STT + Llama chat)
  const sendAudioBlob = useCallback(
    async (blob: Blob) => {
      setAgentState("processing");

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("sessionId", sessionId);
        formData.append("leadData", JSON.stringify(leadData));

        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData, // no Content-Type header — browser sets multipart boundary
        });

        if (!res.ok) {
          let errMsg = `Server error ${res.status}`;
          try { const j = await res.json(); errMsg = j.error || errMsg; } catch { /* ignore */ }
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.userText) onAddMessage("user", data.userText);
        if (data.replyText) onAddMessage("assistant", data.replyText);
        if (data.extractedLead) onUpdateLead(data.extractedLead);

        if (data.replyText) {
          playReply(data.replyText, data.audio ?? "", data.useFallbackTTS ?? true);
        } else {
          setAgentState("idle");
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
        setAgentState("idle");
      }
    },
    [sessionId, leadData, onAddMessage, onUpdateLead, playReply]
  );

  // Start MediaRecorder
  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const elapsed = recordingSecondsRef.current;
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingSeconds(0);

        // Reject very short recordings — they trigger Whisper hallucinations
        if (elapsed < 1) {
          setError("Recording too short. Hold the mic for at least 1 second.");
          setAgentState("idle");
          return;
        }

        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        sendAudioBlob(blob);
      };

      recorder.start(250); // collect chunks every 250ms
      mediaRecorderRef.current = recorder;
      setAgentState("recording");
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;

      // Recording timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          const next = s + 1;
          recordingSecondsRef.current = next;
          if (next >= 59) { stopRecording(); return 0; } // auto-stop at 60s
          return next;
        });
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow mic access and try again.");
      } else {
        setError("Could not access microphone. Please check your settings.");
      }
    }
  }, [sendAudioBlob]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleMicClick = () => {
    if (agentState === "idle") startRecording();
    else if (agentState === "recording") stopRecording();
    else if (agentState === "speaking") {
      window.speechSynthesis?.cancel();
      setAgentState("idle");
      setCurrentAudioText("");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatArea}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🎙️</div>
            <p style={styles.emptyText}>Press the mic and start talking</p>
            <p style={styles.emptySubtext}>Speak in English, Hindi, or Hinglish</p>
          </div>
        ) : (
          <div style={styles.messageList}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          <span>⚠️ {error}</span>
          <button style={styles.errorClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div style={styles.controls}>
        {agentState === "recording" && (
          <div style={styles.recordingBadge}>
            <span style={styles.recDot} />
            <span style={styles.recText}>Recording — {recordingSeconds}s (tap to send)</span>
          </div>
        )}

        {agentState === "processing" && (
          <div style={styles.processingHint}>
            <span style={styles.dot} /><span style={styles.dot2} /><span style={styles.dot3} />
            <span style={styles.processingText}>Priya is thinking...</span>
          </div>
        )}

        {agentState === "speaking" && currentAudioText && (
          <div style={styles.speakingHint}>
            <span>🔊</span>
            <span style={styles.speakingText}>{currentAudioText.slice(0, 70)}…</span>
          </div>
        )}

        <MicButton state={agentState} onClick={handleMicClick} />

        <p style={styles.hint}>
          {agentState === "idle" && "Click to speak"}
          {agentState === "recording" && "Recording — click to stop & send"}
          {agentState === "processing" && "Processing your message…"}
          {agentState === "speaking" && "Tap to interrupt"}
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  chatArea: { flex: 1, overflowY: "auto", padding: "24px 32px" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px", opacity: 0.5 },
  emptyIcon: { fontSize: "48px", marginBottom: "8px" },
  emptyText: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--text2)", fontWeight: 600 },
  emptySubtext: { fontSize: "13px", color: "var(--text3)" },
  messageList: { display: "flex", flexDirection: "column", gap: "12px", maxWidth: "720px", margin: "0 auto", width: "100%" },
  error: { margin: "0 32px 12px", padding: "10px 16px", background: "rgba(255,101,132,0.1)", border: "1px solid rgba(255,101,132,0.3)", borderRadius: "10px", color: "#ff6584", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  errorClose: { background: "none", border: "none", color: "#ff6584", fontSize: "18px", cursor: "pointer", lineHeight: 1 },
  controls: { padding: "20px 32px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", borderTop: "1px solid rgba(42,42,58,0.4)", background: "rgba(10,10,15,0.4)", backdropFilter: "blur(12px)" },
  recordingBadge: { display: "flex", alignItems: "center", gap: "8px", padding: "6px 16px", background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.35)", borderRadius: "20px" },
  recDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#ff5050", animation: "pulse 1s infinite" },
  recText: { fontSize: "13px", color: "#ff8080" },
  processingHint: { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--text2)" },
  processingText: { marginLeft: "4px", fontStyle: "italic" },
  dot: { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "dot-bounce 1.2s infinite" },
  dot2: { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "dot-bounce 1.2s infinite 0.2s" },
  dot3: { display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "dot-bounce 1.2s infinite 0.4s" },
  speakingHint: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text2)", maxWidth: "400px", textAlign: "center" },
  speakingText: { color: "var(--text3)", fontStyle: "italic" },
  hint: { fontSize: "12px", color: "var(--text3)", letterSpacing: "0.04em", marginTop: "4px" },
};