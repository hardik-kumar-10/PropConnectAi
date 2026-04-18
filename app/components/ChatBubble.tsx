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
      }}
    >
      {!isUser && (
        <div style={styles.avatar}>P</div>
      )}
      <div
        style={{
          ...styles.bubble,
          ...(isUser ? styles.bubbleUser : styles.bubbleAI),
        }}
      >
        {!isUser && (
          <span style={styles.agentLabel}>Priya · PropConnect AI</span>
        )}
        <p style={styles.text}>{message.text}</p>
        <span style={styles.time}>{time}</span>
      </div>
      {isUser && (
        <div style={{ ...styles.avatar, ...styles.avatarUser }}>Y</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    animation: "fade-up 0.3s ease forwards",
  },
  wrapperAI: {
    flexDirection: "row",
    animation: "slide-in-left 0.3s ease forwards",
  },
  wrapperUser: {
    flexDirection: "row-reverse",
    animation: "slide-in-right 0.3s ease forwards",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #6c63ff, #43e8b0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
    boxShadow: "0 2px 12px rgba(108,99,255,0.3)",
  },
  avatarUser: {
    background: "linear-gradient(135deg, #ff6584, #ff8f70)",
    boxShadow: "0 2px 12px rgba(255,101,132,0.3)",
  },
  bubble: {
    maxWidth: "72%",
    padding: "12px 16px",
    borderRadius: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  bubbleAI: {
    background: "var(--ai-bubble)",
    border: "1px solid rgba(108,99,255,0.15)",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  bubbleUser: {
    background: "var(--user-bubble)",
    border: "1px solid rgba(255,101,132,0.1)",
    borderBottomRightRadius: "4px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
  },
  agentLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#6c63ff",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  text: {
    fontSize: "14px",
    color: "var(--text)",
    lineHeight: "1.55",
  },
  time: {
    fontSize: "10px",
    color: "var(--text3)",
    alignSelf: "flex-end",
  },
};
