# 🏠 PropConnect AI — Voice Sales Agent

PropConnect AI is a cutting-edge, voice-first real estate sales agent designed specifically for the Indian market. It uses advanced AI to qualify leads, pitch properties, and capture data in real-time through natural voice conversation.

## 🚀 Features

- **Real-time Voice Interface**: Seamless, low-latency conversation using OpenAI Whisper (STT) and Google Cloud TTS.
- **Indian Market Aware**: Optimized to recognize Indian city names (Gurgaon, Noida, Pune, etc.) and conversational Hindi-English (Hinglish).
- **Lead Intelligence Dashboard**: A live panel that extracts and displays lead data (Budget, Location, BHK Type, Timeline) as the conversation happens.
- **Qualification Scoring**: Automatically scores leads based on the information provided to identify high-intent buyers.
- **Glassmorphic UI**: High-end, modern design with smooth animations and responsive layout.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI Models**:
  - **Speech-to-Text**: OpenAI Whisper-1 (with custom prompt tuning for Indian locations)
  - **LLM**: OpenAI GPT-4o-mini (for sales logic and data extraction)
  - **Text-to-Speech**: Google Cloud TTS (Wavenet) with Web Speech API fallback
- **Styling**: Vanilla CSS with modern CSS variables and backdrop-filters.

## 🏁 Getting Started

### 1. Prerequisites
- Node.js 18+
- An OpenAI API Key
- (Optional) Google Cloud TTS API Key

### 2. Installation
```bash
git clone https://github.com/hardik-kumar-10/PropConnectAi.git
cd PropConnectAi
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory:
```bash
OPENAI_API_KEY=your_openai_key_here
# Optional: for high-quality Wavenet voices
GOOGLE_TTS_API_KEY=your_google_cloud_key_here
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the agent in action.

## 📁 Project Structure

- `/app/api/voice/route.ts`: Core backend handling STT, Chat logic, and Lead Extraction.
- `/app/components/VoiceAgent.tsx`: Main voice interface and recorder logic.
- `/app/components/LeadPanel.tsx`: Live dashboard for displaying extracted lead data.
- `/app/page.tsx`: Main application layout and state management.

## 🧠 How it Works

1. **Capture**: The browser records audio and sends it to the Next.js API route.
2. **Transcribe**: OpenAI Whisper converts audio to text, guided by a prompt containing 25+ Indian city names for high accuracy.
3. **Analyze**: GPT-4o-mini processes the text within a "Sales Agent" persona to generate a persuasive reply.
4. **Extract**: A secondary LLM pass analyzes the full conversation history to extract structured JSON data for the lead panel.
5. **Respond**: The reply is converted to speech (Google TTS) and played back to the user while the UI updates in real-time.

---
Built with ❤️ by [Hardik Kumar](https://github.com/hardik-kumar-10)
