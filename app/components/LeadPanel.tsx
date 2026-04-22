import { useState, useEffect } from "react";
import type { LeadData } from "../page";

interface Props {
  leadData: LeadData;
  messageCount: number;
}

const SCORE_LABELS: Record<string, string> = {
  0: "Unknown",
  25: "Cold",
  50: "Warm",
  75: "Hot",
  100: "🔥 High Intent",
};

function getScoreLabel(score: number): string {
  if (score >= 90) return "🔥 High Intent";
  if (score >= 60) return "Hot";
  if (score >= 35) return "Warm";
  if (score >= 10) return "Cold";
  return "Unknown";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#3674B5";
  if (score >= 50) return "#578FCA";
  if (score >= 25) return "#A1E3F9";
  return "#94a3b8";
}

interface FieldProps {
  label: string;
  value?: string;
  icon: string;
}

function LeadField({ label, value, icon }: FieldProps) {
  return (
    <div style={fieldStyles.wrapper}>
      <div style={fieldStyles.icon}>{icon}</div>
      <div style={fieldStyles.content}>
        <span style={fieldStyles.label}>{label}</span>
        <span
          style={{
            ...fieldStyles.value,
            ...(value ? fieldStyles.valueSet : fieldStyles.valueEmpty),
          }}
        >
          {value || "Not captured yet"}
        </span>
      </div>
      {value && <div style={fieldStyles.check}>✓</div>}
    </div>
  );
}

const fieldStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 0",
    borderBottom: "1px solid rgba(54, 116, 181, 0.05)",
  },
  icon: {
    fontSize: "16px",
    width: "24px",
    textAlign: "center",
    flexShrink: 0,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  label: {
    fontSize: "10px",
    color: "#578FCA",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 800,
  },
  value: {
    fontSize: "13.5px",
  },
  valueSet: {
    color: "#3674B5",
    fontWeight: 700,
  },
  valueEmpty: {
    color: "#94a3b8",
    fontStyle: "italic",
    opacity: 0.6,
  },
  check: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#D1F8EF",
    color: "#3674B5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 800,
    flexShrink: 0,
  },
};

export default function LeadPanel({ leadData, messageCount }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scoreLabel = getScoreLabel(leadData.score);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const panelStyle: React.CSSProperties = {
    ...styles.panel,
    ...(isMobile ? {
      right: "12px",
      top: "12px",
      bottom: "12px",
      width: "calc(100% - 24px)",
      maxWidth: "340px",
      transform: isOpen ? "translateX(0)" : "translateX(calc(100% + 24px))",
      transition: "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    } : {})
  };

  return (
    <>
      {isMobile && (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{
            ...styles.mobileToggle,
            background: isOpen ? "#3674B5" : "rgba(255, 255, 255, 0.9)",
            color: isOpen ? "#ffffff" : "#3674B5",
          }}
        >
          {isOpen ? "✕" : "📊 Insights"}
        </button>
      )}

      <aside style={panelStyle}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>Lead Intelligence</span>
          {!isMobile && <span style={styles.headerBadge}>LIVE</span>}
        </div>

        <div style={styles.scoreCard}>
          <div style={styles.scoreTop}>
            <span style={styles.scoreLabel}>Qualification Score</span>
            <span style={{ ...styles.scoreValue, color: "#3674B5" }}>
              {leadData.score}%
            </span>
          </div>
          <div style={styles.scoreBar}>
            <div
              style={{
                ...styles.scoreFill,
                width: `${leadData.score}%`,
                background: `linear-gradient(90deg, #A1E3F9, #3674B5)`,
                boxShadow: `0 2px 8px rgba(54, 116, 181, 0.2)`,
              }}
            />
          </div>
          <div style={{ ...styles.scoreBadge, color: "#3674B5", borderColor: "rgba(54, 116, 181, 0.2)", background: "#D1F8EF" }}>
            {scoreLabel}
          </div>
        </div>

        <div style={styles.fields}>
          <LeadField label="Name" value={leadData.lead_name} icon="👤" />
          <LeadField label="Budget" value={leadData.budget} icon="💰" />
          <LeadField label="Location" value={leadData.location} icon="📍" />
          <LeadField label="BHK Type" value={leadData.bhk_type} icon="🏠" />
          <LeadField label="Timeline" value={leadData.timeline} icon="📅" />
          <LeadField label="Phone" value={leadData.phone} icon="📞" />
        </div>

        <div style={styles.stats}>
          <div style={styles.stat}>
            <span style={styles.statValue}>{messageCount}</span>
            <span style={styles.statLabel}>Messages</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={styles.statValue}>
              {[leadData.budget, leadData.location, leadData.bhk_type, leadData.timeline, leadData.lead_name, leadData.phone].filter(Boolean).length}
              /6
            </span>
            <span style={styles.statLabel}>Fields</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.stat}>
            <span style={{ ...styles.statValue, color: "#3674B5" }}>{scoreLabel.replace("🔥 ", "")}</span>
            <span style={styles.statLabel}>Intent</span>
          </div>
        </div>

        <p style={styles.footer}>
          Extracted in real-time by PropAi.
        </p>
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "absolute",
    top: "24px",
    right: "24px",
    bottom: "24px",
    width: "320px",
    zIndex: 100,
    background: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    borderRadius: "32px",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(54, 116, 181, 0.08)",
  },
  header: {
    padding: "24px 24px 20px",
    borderBottom: "1px solid rgba(54, 116, 181, 0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "16px",
    fontWeight: 700,
    color: "#3674B5",
    letterSpacing: "0",
    textTransform: "none",
  },
  headerBadge: {
    fontSize: "10px",
    fontWeight: 900,
    color: "#3674B5",
    background: "#D1F8EF",
    padding: "4px 10px",
    borderRadius: "20px",
    letterSpacing: "0.05em",
  },
  scoreCard: {
    margin: "24px",
    padding: "24px",
    background: "#fff",
    border: "1px solid rgba(54, 116, 181, 0.1)",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 8px 24px rgba(54, 116, 181, 0.04)",
  },
  scoreTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: "11px",
    color: "#578FCA",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  scoreValue: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "32px",
    fontWeight: 700,
  },
  scoreBar: {
    height: "10px",
    borderRadius: "5px",
    background: "#f1f5f9",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: "5px",
    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
  },
  scoreBadge: {
    alignSelf: "flex-start",
    fontSize: "11px",
    fontWeight: 900,
    padding: "5px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(54, 116, 181, 0.1)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  fields: {
    flex: 1,
    padding: "0 24px",
    overflowY: "auto",
  },
  stats: {
    display: "flex",
    padding: "24px",
    borderTop: "1px solid rgba(54, 116, 181, 0.05)",
    background: "rgba(255,255,255,0.4)",
    gap: "0",
  },
  stat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  statValue: {
    fontSize: "22px",
    fontWeight: 900,
    color: "#3674B5",
  },
  statLabel: {
    fontSize: "10px",
    color: "#578FCA",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontWeight: 800,
  },
  statDivider: {
    width: "1px",
    background: "rgba(54, 116, 181, 0.1)",
    margin: "6px 0",
  },
  footer: {
    padding: "16px 24px",
    fontSize: "10px",
    color: "#578FCA",
    fontWeight: 600,
    borderTop: "1px solid rgba(54, 116, 181, 0.05)",
    textAlign: "center",
    opacity: 0.7,
  },
  mobileToggle: {
    position: "fixed",
    top: "14px",
    right: "16px",
    zIndex: 1001,
    padding: "10px 18px",
    borderRadius: "15px",
    border: "1px solid rgba(54, 116, 181, 0.2)",
    fontSize: "12px",
    fontWeight: 900,
    boxShadow: "0 10px 30px rgba(54, 116, 181, 0.15)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
};
