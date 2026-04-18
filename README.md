<<<<<<< HEAD
# 🏠 PropConnect AI — Voice Sales Agent (Gemini)

Real-time voice AI sales agent using Google Gemini for STT + chat, with Web Speech API for TTS.

## Setup

### 1. Install
```bash
npm install
```

### 2. Add API key
```bash
cp .env.local.example .env.local
# Edit .env.local:
# GEMINI_API_KEY=your-key-here
```

Get your key at: https://aistudio.google.com/apikey

### 3. Run
```bash
npm run dev
```

## Deploy to Vercel
1. Push to GitHub
2. Import on vercel.com
3. Add env var: `GEMINI_API_KEY` = your key
4. Deploy ✅

## Architecture
```
Browser mic → Gemini 1.5 Flash (STT) → Gemini 1.5 Flash (chat) → Web Speech API (TTS)
```
=======
# PropConnectAi
>>>>>>> ae72dc52e198913b75f4be6534243e668dd728ce
