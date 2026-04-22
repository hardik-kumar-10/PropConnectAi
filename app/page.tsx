"use client";

import { useState, useCallback } from "react";
import VoiceAgent from "./components/VoiceAgent";
import LeadPanel from "./components/LeadPanel";
import MapPanel from "./components/MapPanel";
import Header from "./components/Header";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
}

export interface LeadData {
  lead_name?: string;
  budget?: string;
  location?: string;
  bhk_type?: string;
  timeline?: string;
  phone?: string;
  score: number;
  // Geocoding info
  lat?: number;
  lng?: number;
  formatted_address?: string;
  nearby_landmarks?: string[];
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [leadData, setLeadData] = useState<LeadData>({ score: 0 });
  const [sessionId, setSessionId] = useState("");

  const addMessage = useCallback((role: "user" | "assistant", text: string, newSessionId?: string) => {
    console.log("[DEBUG] addMessage called:", role, text);
    if (newSessionId) setSessionId(newSessionId);
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}_${Math.random()}`, role, text, timestamp: new Date() },
    ]);
  }, []);

  const updateLead = useCallback((extracted: Partial<LeadData>) => {
    const valid = (v: unknown): v is string =>
      typeof v === "string" && v.trim() !== "" && v.toLowerCase() !== "null";

    setLeadData((prev) => {
      const updated = { ...prev, ...extracted };
      if (!valid(extracted.lead_name)) delete updated.lead_name;
      if (!valid(extracted.budget)) delete updated.budget;
      if (!valid(extracted.location)) delete updated.location;
      if (!valid(extracted.bhk_type)) delete updated.bhk_type;
      if (!valid(extracted.timeline)) delete updated.timeline;
      if (!valid(extracted.phone)) delete updated.phone;

      let score = 0;
      if (updated.budget) score += 25;
      if (updated.location) score += 25;
      if (updated.bhk_type) score += 20;
      if (updated.timeline) score += 20;
      if (updated.lead_name) score += 5;
      if (updated.phone) score += 5;
      updated.score = score;

      return updated;
    });
  }, []);

  return (
    <div style={styles.app}>
      {/* Background Layers */}
      <div className="bg-grid" style={styles.bgGrid} />
      <div style={styles.bgFluid} />
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />
      <div style={styles.bgOrb3} />

      <div style={styles.layout}>
        <main style={styles.main}>
          <Header />
          <VoiceAgent
            messages={messages}
            sessionId={sessionId}
            leadData={leadData}
            onAddMessage={addMessage}
            onUpdateLead={updateLead}
          />
        </main>

        <LeadPanel leadData={leadData} messageCount={messages.length} />

        <MapPanel
          lat={leadData.lat}
          lng={leadData.lng}
          formattedAddress={leadData.location}
          locationName={leadData.location}
          nearbyLandmarks={leadData.nearby_landmarks}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    height: "100vh",
    width: "100vw",
    position: "relative",
    overflow: "hidden",
    background: "#f8fafc",
  },
  bgGrid: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    pointerEvents: "none",
  },
  bgFluid: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    background: `radial-gradient(circle at 10% 20%, rgba(54, 116, 181, 0.1) 0%, transparent 40%),
                 radial-gradient(circle at 90% 80%, rgba(161, 227, 249, 0.3) 0%, transparent 50%),
                 radial-gradient(circle at 50% 50%, rgba(209, 248, 239, 0.2) 0%, transparent 60%)`,
    filter: "blur(100px)",
    animation: "fluid-mesh 25s ease-in-out infinite alternate",
    pointerEvents: "none",
  },
  bgOrb1: {
    position: "fixed",
    top: "10%",
    left: "15%",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background: "rgba(161, 227, 249, 0.25)",
    filter: "blur(70px)",
    zIndex: 0,
    animation: "float-slow 18s ease-in-out infinite",
    pointerEvents: "none",
  },
  bgOrb2: {
    position: "fixed",
    bottom: "10%",
    right: "15%",
    width: "550px",
    height: "550px",
    borderRadius: "50%",
    background: "rgba(54, 116, 181, 0.12)",
    filter: "blur(90px)",
    zIndex: 0,
    animation: "float-medium 22s ease-in-out infinite",
    pointerEvents: "none",
  },
  bgOrb3: {
    position: "fixed",
    top: "35%",
    right: "5%",
    width: "300px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(209, 248, 239, 0.35)",
    filter: "blur(50px)",
    zIndex: 0,
    animation: "float-slow 14s ease-in-out infinite alternate-reverse",
    pointerEvents: "none",
  },
  layout: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    height: "100%",
    width: "100%",
    overflow: "hidden",
  },
  main: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    position: "relative",
  },
};
