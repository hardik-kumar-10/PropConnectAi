"use client";

import { useState, useCallback } from "react";
import VoiceAgent from "./components/VoiceAgent";
import LeadPanel from "./components/LeadPanel";
import Header from "./components/Header";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export interface LeadData {
  name?: string;
  budget?: string;
  location?: string;
  bhk?: string;
  timeline?: string;
  phone?: string;
  score: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [leadData, setLeadData] = useState<LeadData>({ score: 0 });
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const addMessage = useCallback((role: "user" | "assistant", text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random()}`, role, text, timestamp: new Date() },
    ]);
  }, []);

  const updateLead = useCallback((extracted: Partial<LeadData>) => {
    // Helper: only accept non-null, non-empty, non-"null" string values
    const valid = (v: unknown): v is string =>
      typeof v === "string" && v.trim() !== "" && v.toLowerCase() !== "null";

    setLeadData((prev) => {
      const updated = { ...prev };
      if (valid(extracted.name))     updated.name = extracted.name.trim();
      if (valid(extracted.budget))   updated.budget = extracted.budget.trim();
      if (valid(extracted.location)) updated.location = extracted.location.trim();
      if (valid(extracted.bhk))      updated.bhk = extracted.bhk.trim();
      if (valid(extracted.timeline)) updated.timeline = extracted.timeline.trim();
      if (valid(extracted.phone))    updated.phone = extracted.phone.trim();

      // Score calculation
      let score = 0;
      if (updated.budget) score += 25;
      if (updated.location) score += 25;
      if (updated.bhk) score += 20;
      if (updated.timeline) score += 20;
      if (updated.name) score += 5;
      if (updated.phone) score += 5;
      updated.score = score;

      return updated;
    });
  }, []);

  return (
    <div style={styles.app}>
      {/* Background mesh */}
      <div style={styles.bgMesh} />
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      <div style={styles.layout}>
        <div style={styles.main}>
          <Header />
          <VoiceAgent
            messages={messages}
            sessionId={sessionId}
            leadData={leadData}
            onAddMessage={addMessage}
            onUpdateLead={updateLead}
          />
        </div>
        <LeadPanel leadData={leadData} messageCount={messages.length} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
  },
  bgMesh: {
    position: "fixed",
    inset: 0,
    background: `radial-gradient(ellipse 80% 60% at 20% 20%, rgba(108,99,255,0.08) 0%, transparent 60%),
                 radial-gradient(ellipse 60% 40% at 80% 80%, rgba(67,232,176,0.06) 0%, transparent 50%)`,
    pointerEvents: "none",
    zIndex: 0,
  },
  bgOrb1: {
    position: "fixed",
    top: "-10%",
    left: "-5%",
    width: "40vw",
    height: "40vw",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(108,99,255,0.05) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgOrb2: {
    position: "fixed",
    bottom: "-10%",
    right: "-5%",
    width: "50vw",
    height: "50vw",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(67,232,176,0.04) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  layout: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    height: "100vh",
    gap: 0,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
};
