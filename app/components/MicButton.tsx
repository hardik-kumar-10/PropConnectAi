"use client";

type State = "idle" | "recording" | "processing" | "speaking";

interface Props {
  state: State;
  onClick: () => void;
}

export default function MicButton({ state, onClick }: Props) {
  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isSpeaking = state === "speaking";
  const isActive = isRecording || isSpeaking;

  return (
    <div style={styles.wrapper}>
      {/* Pulse rings when recording */}
      {isRecording && (
        <>
          <div style={styles.ring1} />
          <div style={styles.ring2} />
        </>
      )}

      {/* Speaking indicator ring */}
      {isSpeaking && <div style={styles.speakingRing} />}

      <button
        onClick={onClick}
        disabled={isProcessing}
        style={{
          ...styles.button,
          ...(isRecording ? styles.buttonRecording : {}),
          ...(isProcessing ? styles.buttonProcessing : {}),
          ...(isSpeaking ? styles.buttonSpeaking : {}),
        }}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isProcessing ? (
          <svg style={styles.spinner} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#f1f5f9" strokeWidth="2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#3674B5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : isSpeaking ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="4" height="12" rx="1" fill="#3674B5" />
            <rect x="14" y="6" width="4" height="12" rx="1" fill="#3674B5" />
          </svg>
        ) : isRecording ? (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="#ef4444" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="#3674B5" />
            <path d="M5 11a7 7 0 0 0 14 0" stroke="#3674B5" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="#3674B5" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="22" x2="16" y2="22" stroke="#3674B5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}

        {isRecording && (
          <div style={styles.waveform}>
            {[0, 0.1, 0.2, 0.05, 0.15, 0.25, 0.08, 0.18].map((delay, i) => (
              <div
                key={i}
                style={{
                  ...styles.waveBar,
                  animationDelay: `${delay}s`,
                  height: `${14 + (i % 3) * 6}px`,
                }}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    width: "96px",
    height: "96px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ring1: {
    position: "absolute",
    inset: "-8px",
    borderRadius: "50%",
    border: "2px solid rgba(239, 68, 68, 0.2)",
    animation: "pulse-ring 1.5s ease-out infinite",
  },
  ring2: {
    position: "absolute",
    inset: "-8px",
    borderRadius: "50%",
    border: "2px solid rgba(239, 68, 68, 0.1)",
    animation: "pulse-ring2 1.5s ease-out infinite 0.3s",
  },
  speakingRing: {
    position: "absolute",
    inset: "-15px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(54, 116, 181, 0.15) 0%, transparent 70%)",
    border: "1px solid rgba(161, 227, 249, 0.3)",
    animation: "pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
    boxShadow: "0 0 40px rgba(54, 116, 181, 0.1)",
  },
  button: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    border: "2px solid rgba(54, 116, 181, 0.2)",
    background: "#ffffff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    boxShadow: "0 10px 30px rgba(54, 116, 181, 0.15)",
    position: "relative",
    overflow: "hidden",
  },
  buttonRecording: {
    background: "#fef2f2",
    border: "2px solid #ef4444",
    boxShadow: "0 10px 30px rgba(239, 68, 68, 0.2)",
  },
  buttonProcessing: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  buttonSpeaking: {
    background: "#D1F8EF",
    border: "2px solid #3674B5",
    boxShadow: "0 10px 30px rgba(54, 116, 181, 0.1)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    animation: "spin-slow 1s linear infinite",
  },
  waveform: {
    position: "absolute",
    bottom: "12px",
    display: "flex",
    alignItems: "flex-end",
    gap: "3px",
    height: "24px",
  },
  waveBar: {
    width: "3px",
    borderRadius: "3px",
    background: "#ef4444",
    transformOrigin: "bottom",
    animation: "wave-bar 0.6s ease-in-out infinite alternate",
  },
};
