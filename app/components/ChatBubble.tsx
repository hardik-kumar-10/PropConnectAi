"use client";

import type { Message } from "../page";

interface Props {
  message: Message;
}

export default function ChatBubble({ message }: Props) {
  const isUser = message.role === "user";
  const time = message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      style={{
        ...styles.wrapper,
        ...(isUser ? styles.wrapperUser : styles.wrapperAI),
        alignSelf: isUser ? "flex-end" : "flex-start",
      }}
    >
      {!isUser && (
        <div style={styles.avatar}>PA</div>
      )}
      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.bubbleUser : styles.bubbleAI),
        }}
      >
        {!isUser && (
          <span style={styles.agentLabel}>PropAi · PropConnect AI</span>
        )}
        <p style={styles.text}>{message.text}</p>
        <span style={styles.time}>{time}</span>
      </div>
      {isUser && (
        <div style={{ ...styles.avatar, ...styles.avatarUser }}>ME</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    animation: "fade-up 0.4s ease-out forwards",
  },
  wrapperAI: {
    flexDirection: "row",
  },
  wrapperUser: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "#3674B5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(54, 116, 181, 0.2)",
  },
  avatarUser: {
    background: "#578FCA",
    boxShadow: "0 4px 12px rgba(87, 143, 202, 0.2)",
  },
  bubble: {
    maxWidth: "80%",
    padding: "16px 20px",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    boxShadow: "0 8px 24px rgba(54, 116, 181, 0.05)",
  },
  bubbleAI: {
    background: "rgba(255, 255, 255, 0.7)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(54, 116, 181, 0.15)",
    borderBottomLeftRadius: "4px",
  },
  bubbleUser: {
    background: "#3674B5",
    color: "#ffffff",
    borderBottomRightRadius: "4px",
  },
  agentLabel: {
    fontSize: "11px",
    fontWeight: 800,
    color: "#3674B5",
    textTransform: "uppercase",
    marginBottom: "4px",
    letterSpacing: "0.02em",
  },
  text: {
    fontSize: "15px",
    lineHeight: "1.6",
    fontWeight: 500,
    whiteSpace: "pre-wrap",
  },
  time: {
    fontSize: "10px",
    opacity: 0.5,
    alignSelf: "flex-end",
    marginTop: "4px",
  },
};
