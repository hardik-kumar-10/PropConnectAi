import { useState, useEffect } from "react";

export default function Header() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <header style={{ ...styles.header, padding: isMobile ? "16px 20px" : "16px 40px" }}>
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#3674B5" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5" stroke="#3674B5" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 12l10 5 10-5" stroke="#A1E3F9" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </div>
        <span style={styles.logoText}>PropConnect</span>
        <span style={styles.logoBadge}>AI</span>
      </div>
      
      {!isMobile && (
        <>
          <div style={styles.tagline}>Intelligent Voice Sales Agent</div>
          <div style={styles.status}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>LIVE</span>
          </div>
        </>
      )}
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "16px 40px",
    background: "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(54, 116, 181, 0.08)",
    position: "relative",
    zIndex: 50,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  logoIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    background: "#fff",
    border: "1px solid rgba(54, 116, 181, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(54, 116, 181, 0.08)",
  },
  logoText: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "24px",
    fontWeight: 700,
    color: "#3674B5",
    letterSpacing: "-0.01em",
  },
  logoBadge: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#3674B5",
    background: "#D1F8EF",
    padding: "3px 8px",
    borderRadius: "6px",
    letterSpacing: "0.05em",
  },
  tagline: {
    flex: 1,
    fontSize: "14px",
    color: "#578FCA",
    fontWeight: 500,
    opacity: 0.8,
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 14px",
    background: "#fff",
    border: "1px solid rgba(54, 116, 181, 0.1)",
    borderRadius: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#10b981",
    boxShadow: "0 0 10px rgba(16, 185, 129, 0.4)",
  },
  statusText: {
    fontSize: "11px",
    color: "#3674B5",
    fontWeight: 800,
    letterSpacing: "0.08em",
  },
};
