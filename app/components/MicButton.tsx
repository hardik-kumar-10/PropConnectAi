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
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : isSpeaking ? (
          // Speaker / stop icon
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="4" height="12" rx="1" fill="#43e8b0" />
            <rect x="14" y="6" width="4" height="12" rx="1" fill="#43e8b0" />
          </svg>
        ) : isRecording ? (
          // Stop icon
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="#ff6584" />
          </svg>
        ) : (
          // Mic icon
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="2" width="6" height="12" rx="3" fill="#f0f0f8" />
            <path d="M5 11a7 7 0 0 0 14 0" stroke="#f0f0f8" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="18" x2="12" y2="22" stroke="#f0f0f8" strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="22" x2="16" y2="22" stroke="#f0f0f8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}

        {/* Waveform bars when recording */}
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
    width: "88px",
    height: "88px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ring1: {
    position: "absolute",
    inset: "-8px",
    borderRadius: "50%",
    border: "2px solid rgba(255,101,132,0.5)",
    animation: "pulse-ring 1.5s ease-out infinite",
  },
  ring2: {
    position: "absolute",
    inset: "-8px",
    borderRadius: "50%",
    border: "2px solid rgba(255,101,132,0.3)",
    animation: "pulse-ring2 1.5s ease-out infinite 0.3s",
  },
  speakingRing: {
    position: "absolute",
    inset: "-6px",
    borderRadius: "50%",
    border: "2px solid rgba(67,232,176,0.4)",
    animation: "pulse-ring 2s ease-out infinite",
  },
  button: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    border: "2px solid rgba(108,99,255,0.4)",
    background: "linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(108,99,255,0.1) 100%)",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transition: "all 0.2s ease",
    boxShadow: "0 0 24px rgba(108,99,255,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
    position: "relative",
    overflow: "hidden",
    animation: "glow-pulse 3s ease-in-out infinite",
  },
  buttonRecording: {
    background: "linear-gradient(135deg, rgba(255,101,132,0.25) 0%, rgba(255,101,132,0.15) 100%)",
    border: "2px solid rgba(255,101,132,0.5)",
    boxShadow: "0 0 32px rgba(255,101,132,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
    animation: "none",
  },
  buttonProcessing: {
    opacity: 0.7,
    cursor: "not-allowed",
    animation: "none",
  },
  buttonSpeaking: {
    background: "linear-gradient(135deg, rgba(67,232,176,0.2) 0%, rgba(67,232,176,0.1) 100%)",
    border: "2px solid rgba(67,232,176,0.4)",
    boxShadow: "0 0 32px rgba(67,232,176,0.2), inset 0 1px 0 rgba(255,255,255,0.05)",
    animation: "none",
  },
  spinner: {
    width: "28px",
    height: "28px",
    animation: "spin-slow 1s linear infinite",
  },
  waveform: {
    position: "absolute",
    bottom: "10px",
    display: "flex",
    alignItems: "flex-end",
    gap: "2px",
    height: "20px",
  },
  waveBar: {
    width: "3px",
    borderRadius: "2px",
    background: "#ff6584",
    transformOrigin: "bottom",
    animation: "wave-bar 0.6s ease-in-out infinite alternate",
  },
};
