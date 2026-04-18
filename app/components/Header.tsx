"use client";

export default function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#6c63ff" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="#43e8b0" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="#6c63ff" strokeWidth="2" strokeLinejoin="round" opacity="0.5"/>
          </svg>
        </div>
        <span style={styles.logoText}>PropConnect</span>
        <span style={styles.logoBadge}>AI</span>
      </div>
      <div style={styles.tagline}>Voice-First Real Estate Sales Agent</div>
      <div style={styles.status}>
        <span style={styles.statusDot} />
        <span style={styles.statusText}>Live</span>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "20px 32px",
    borderBottom: "1px solid rgba(42,42,58,0.5)",
    backdropFilter: "blur(12px)",
    background: "rgba(10,10,15,0.6)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    background: "rgba(108,99,255,0.15)",
    border: "1px solid rgba(108,99,255,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    fontWeight: 700,
    color: "#f0f0f8",
    letterSpacing: "-0.02em",
  },
  logoBadge: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#43e8b0",
    background: "rgba(67,232,176,0.12)",
    border: "1px solid rgba(67,232,176,0.3)",
    padding: "2px 6px",
    borderRadius: "4px",
    letterSpacing: "0.05em",
  },
  tagline: {
    flex: 1,
    fontSize: "13px",
    color: "var(--text3)",
    fontStyle: "italic",
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  statusDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#43e8b0",
    boxShadow: "0 0 8px rgba(67,232,176,0.6)",
  },
  statusText: {
    fontSize: "12px",
    color: "#43e8b0",
    fontWeight: 500,
    letterSpacing: "0.04em",
  },
};
