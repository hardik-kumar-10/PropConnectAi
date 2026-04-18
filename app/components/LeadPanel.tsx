"use client";

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
  if (score >= 75) return "#43e8b0";
  if (score >= 50) return "#ffd27f";
  if (score >= 25) return "#ff9f5a";
  return "var(--text3)";
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
    padding: "10px 0",
    borderBottom: "1px solid rgba(42,42,58,0.4)",
  },
  icon: {
    fontSize: "16px",
    width: "24px",
    textAlign: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  label: {
    fontSize: "10px",
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
  },
  value: {
    fontSize: "13px",
  },
  valueSet: {
    color: "var(--text)",
    fontWeight: 500,
  },
  valueEmpty: {
    color: "var(--text3)",
    fontStyle: "italic",
  },
  check: {
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "rgba(67,232,176,0.15)",
    color: "#43e8b0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    flexShrink: 0,
  },
};

export default function LeadPanel({ leadData, messageCount }: Props) {
  const scoreColor = getScoreColor(leadData.score);
  const scoreLabel = getScoreLabel(leadData.score);

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Lead Intelligence</span>
        <span style={styles.headerBadge}>LIVE</span>
      </div>

      {/* Score */}
      <div style={styles.scoreCard}>
        <div style={styles.scoreTop}>
          <span style={styles.scoreLabel}>Qualification Score</span>
          <span style={{ ...styles.scoreValue, color: scoreColor }}>
            {leadData.score}%
          </span>
        </div>
        <div style={styles.scoreBar}>
          <div
            style={{
              ...styles.scoreFill,
              width: `${leadData.score}%`,
              background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})`,
              boxShadow: `0 0 8px ${scoreColor}66`,
            }}
          />
        </div>
        <div style={{ ...styles.scoreBadge, color: scoreColor, borderColor: `${scoreColor}44`, background: `${scoreColor}11` }}>
          {scoreLabel}
        </div>
      </div>

      {/* Lead fields */}
      <div style={styles.fields}>
        <LeadField label="Name" value={leadData.name} icon="👤" />
        <LeadField label="Budget" value={leadData.budget} icon="💰" />
        <LeadField label="Location" value={leadData.location} icon="📍" />
        <LeadField label="BHK Type" value={leadData.bhk} icon="🏠" />
        <LeadField label="Timeline" value={leadData.timeline} icon="📅" />
        <LeadField label="Phone" value={leadData.phone} icon="📞" />
      </div>

      {/* Stats */}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statValue}>{messageCount}</span>
          <span style={styles.statLabel}>Messages</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <span style={styles.statValue}>
            {[leadData.budget, leadData.location, leadData.bhk, leadData.timeline, leadData.name, leadData.phone].filter(Boolean).length}
            /6
          </span>
          <span style={styles.statLabel}>Fields</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.stat}>
          <span style={{ ...styles.statValue, color: scoreColor }}>{scoreLabel.replace("🔥 ", "")}</span>
          <span style={styles.statLabel}>Intent</span>
        </div>
      </div>

      {/* Footer note */}
      <p style={styles.footer}>
        Lead data is extracted automatically from the voice conversation in real-time.
      </p>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: "280px",
    flexShrink: 0,
    borderLeft: "1px solid rgba(42,42,58,0.5)",
    background: "rgba(17,17,24,0.7)",
    backdropFilter: "blur(16px)",
    display: "flex",
    flexDirection: "column",
    padding: "0",
    overflow: "hidden",
  },
  header: {
    padding: "20px 20px 16px",
    borderBottom: "1px solid rgba(42,42,58,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--text2)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  headerBadge: {
    fontSize: "9px",
    fontWeight: 700,
    color: "#ff6584",
    background: "rgba(255,101,132,0.1)",
    border: "1px solid rgba(255,101,132,0.3)",
    padding: "2px 6px",
    borderRadius: "4px",
    letterSpacing: "0.08em",
    animation: "glow-pulse 2s ease-in-out infinite",
  },
  scoreCard: {
    margin: "16px 20px",
    padding: "16px",
    background: "rgba(10,10,15,0.5)",
    border: "1px solid rgba(42,42,58,0.6)",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  scoreTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: "11px",
    color: "var(--text3)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  scoreValue: {
    fontFamily: "var(--font-display)",
    fontSize: "22px",
    fontWeight: 800,
  },
  scoreBar: {
    height: "6px",
    borderRadius: "3px",
    background: "rgba(42,42,58,0.8)",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: "3px",
    transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
  },
  scoreBadge: {
    alignSelf: "flex-start",
    fontSize: "11px",
    fontWeight: 600,
    padding: "3px 8px",
    borderRadius: "6px",
    border: "1px solid",
    letterSpacing: "0.03em",
  },
  fields: {
    flex: 1,
    padding: "0 20px",
    overflowY: "auto",
  },
  stats: {
    display: "flex",
    padding: "16px 20px",
    borderTop: "1px solid rgba(42,42,58,0.4)",
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
    fontFamily: "var(--font-display)",
    fontSize: "18px",
    fontWeight: 700,
    color: "var(--text)",
  },
  statLabel: {
    fontSize: "10px",
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  statDivider: {
    width: "1px",
    background: "rgba(42,42,58,0.6)",
    margin: "4px 0",
  },
  footer: {
    padding: "12px 20px",
    fontSize: "10px",
    color: "var(--text3)",
    lineHeight: "1.5",
    borderTop: "1px solid rgba(42,42,58,0.3)",
    fontStyle: "italic",
  },
};
