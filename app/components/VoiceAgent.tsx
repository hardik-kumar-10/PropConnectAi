"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Message, LeadData } from "../page";
import ChatBubble from "./ChatBubble";
import MicButton from "./MicButton";

interface Props {
  messages: Message[];
  sessionId: string;
  leadData: LeadData;
  onAddMessage: (role: "user" | "assistant", text: string, sessionId?: string) => void;
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

  // Greet once on load
  useEffect(() => {
    // If we already have messages, don't greet
    if (messages.length > 0) return;

    console.log("[DEBUG] Chat is empty. Starting greeting timer...");
    const t = setTimeout(() => {
      // Check again inside the timeout to be safe
      onAddMessage(
        "assistant",
        "Hey! I'm PropConnect AI, your personal home finder. I'd love to help you find the perfect property. To get started, could you tell me your name?"
      );
      speakText(
        "Hey! I'm PropConnect AI, your personal home finder. I'd love to help you find the perfect property. To get started, could you tell me your name?"
      );
    }, 1500);

    return () => clearTimeout(t);
  }, [onAddMessage, speakText]); // Removed messages.length dependency to prevent multiple triggers

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
        formData.append("session_id", sessionId);
        formData.append("history", JSON.stringify(messages.map(m => ({ role: m.role, content: m.text }))));

        const res = await fetch("/api/voice", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          let errMsg = `Server error ${res.status}`;
          try { const j = await res.json(); errMsg = j.error || errMsg; } catch { /* ignore */ }
          throw new Error(errMsg);
        }

        const data = await res.json();
        if (data.transcript) onAddMessage("user", data.transcript, data.session_id);
        if (data.reply) onAddMessage("assistant", data.reply, data.session_id);
        if (data.lead_data) onUpdateLead(data.lead_data);

        if (data.reply) {
          playReply(data.reply, data.audio_base64 ?? "", !data.audio_base64);
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

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.chatArea}>
        {messages.length === 0 ? (
          <div style={{ ...styles.emptyState, paddingLeft: isMobile ? "0" : "40px", alignItems: isMobile ? "center" : "flex-start", textAlign: isMobile ? "center" : "left" }}>
            <div style={styles.emptyIcon}>🏠</div>
            <p style={{ ...styles.emptyText, fontFamily: "'Playfair Display', serif", fontSize: "32px", fontWeight: 700 }}>Welcome to PropConnect AI</p>
            <p style={styles.emptySubtext}>Press the microphone to begin your property search</p>
          </div>
        ) : (
          <div style={{ ...styles.messageList, paddingRight: isMobile ? "0" : "360px", paddingLeft: isMobile ? "0" : "40px" }}>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ ...styles.error, margin: isMobile ? "0 16px 12px" : "0 380px 12px 32px" }}>
          <span>⚠️ {error}</span>
          <button style={styles.errorClose} onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div style={{ ...styles.controls, paddingRight: isMobile ? "32px" : "360px" }}>
        {agentState === "recording" && (
          <div style={styles.recordingBadge}>
            <span style={styles.recDot} />
            <span style={styles.recText}>Recording — {recordingSeconds}s (tap to send)</span>
          </div>
        )}

        {agentState === "processing" && (
          <div style={styles.processingHint}>
            <span style={styles.dot} /><span style={styles.dot2} /><span style={styles.dot3} />
            <span style={styles.processingText}>PropAi is thinking...</span>
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
  container: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "transparent" },
  chatArea: { flex: 1, overflowY: "auto", padding: "24px 32px" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", height: "100%", gap: "12px", opacity: 0.8, paddingLeft: "40px" },
  emptyIcon: { fontSize: "56px", marginBottom: "8px" },
  emptyText: { fontSize: "22px", color: "#3674B5", fontWeight: 800 },
  emptySubtext: { fontSize: "14px", color: "#578FCA", fontWeight: 500 },
  messageList: { display: "flex", flexDirection: "column", gap: "24px", width: "100%", paddingRight: "360px", paddingLeft: "40px" },
  error: { margin: "0 380px 12px 32px", padding: "12px 16px", background: "rgba(254, 242, 242, 0.8)", backdropFilter: "blur(8px)", border: "1px solid #fee2e2", borderRadius: "10px", color: "#991b1b", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  errorClose: { background: "none", border: "none", color: "#991b1b", fontSize: "18px", cursor: "pointer", lineHeight: 1 },
  controls: { padding: "24px 32px 32px", paddingRight: "360px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", borderTop: "1px solid rgba(54, 116, 181, 0.08)", background: "rgba(255, 255, 255, 0.4)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 -8px 30px rgba(54, 116, 181, 0.05)" },
  recordingBadge: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 18px", background: "#fff1f2", border: "1px solid #fecaca", borderRadius: "20px" },
  recDot: { width: "10px", height: "10px", borderRadius: "50%", background: "#e11d48", animation: "pulse 1s infinite" },
  recText: { fontSize: "14px", color: "#9f1239", fontWeight: 500 },
  processingHint: { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#1e3a8a" },
  processingText: { marginLeft: "4px", fontStyle: "italic", fontWeight: 500 },
  dot: { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#1e3a8a", animation: "dot-bounce 1.2s infinite" },
  dot2: { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#1e3a8a", animation: "dot-bounce 1.2s infinite 0.2s" },
  dot3: { display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#1e3a8a", animation: "dot-bounce 1.2s infinite 0.4s" },
  speakingHint: { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#065f46", maxWidth: "500px", textAlign: "center", background: "#f0fdf4", padding: "8px 16px", borderRadius: "20px", border: "1px solid #dcfce7" },
  speakingText: { color: "#065f46", fontStyle: "italic", fontWeight: 500 },
  hint: { fontSize: "12px", color: "#94a3b8", fontWeight: 500, marginTop: "4px" },
};