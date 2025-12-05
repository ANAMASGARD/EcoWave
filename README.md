<div align="center">

# 🌊 EcoWave

### Snap. Track. Reduce.

**AI-powered carbon footprint tracker for students**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Live Demo](https://ecowave.vercel.app) · [Report Bug](https://github.com/ANAMASGARD/EcoWave/issues) · [Request Feature](https://github.com/ANAMASGARD/EcoWave/issues)

---

<img src="public/demo.gif" alt="EcoWave Demo" width="600" />

</div>

## 🎯 What is EcoWave?

EcoWave helps students track their carbon footprint effortlessly. Simply **photograph receipts** or **talk to our AI assistant** — we handle all the calculations and give you actionable insights.

> No complex forms. No manual data entry. Just snap, speak, and reduce.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📸 **Receipt Scanner** | AI-powered OCR extracts items and calculates carbon instantly |
| 🎤 **Voice Assistant** | Say "I drove 10km" and Eco logs it in seconds |
| 🏆 **Leaderboards** | Compete with classmates and campus groups |
| 📊 **Analytics** | Track trends, get insights, celebrate progress |
| 🎮 **Gamification** | Earn points, maintain streaks, unlock rewards |
| 🌐 **3D Landing** | Stunning Three.js particle effects |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- [Google Gemini API Key](https://makersuite.google.com/app/apikey)
- [Clerk Account](https://clerk.dev/)
- [Neon Database](https://neon.tech/)

### Installation

```bash
# Clone the repo
git clone https://github.com/ANAMASGARD/EcoWave.git
cd EcoWave

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

```env
DATABASE_URL=your_neon_connection_string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key

# Optional: Voice AI
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

### Run

```bash
npm run db:push   # Setup database
npm run dev       # Start dev server
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📱 How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   📸 Scan   │ ──▶ │  🤖 AI      │ ──▶ │  📊 Track   │ ──▶ │  🌱 Reduce  │
│   Receipt   │     │  Analysis   │     │  Progress   │     │  Impact     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Scan** — Take a photo of any receipt
2. **Analyze** — Gemini AI extracts items & calculates CO₂
3. **Track** — View history, trends, and leaderboard position
4. **Reduce** — Get personalized tips to lower your footprint

---

## 🎤 Voice Commands

| You Say | Eco Does |
|---------|----------|
| *"I drove 10km today"* | Logs 1.9kg CO₂, suggests alternatives |
| *"Had a burger for lunch"* | Logs 1.7kg CO₂, compares options |
| *"How's my day looking?"* | Summarizes daily carbon |
| *"Bought two t-shirts"* | Logs 10kg CO₂, suggests second-hand |

---

## 🏗️ Tech Stack

<table>
<tr>
<td align="center"><b>Frontend</b></td>
<td align="center"><b>Backend</b></td>
<td align="center"><b>AI/ML</b></td>
<td align="center"><b>Infrastructure</b></td>
</tr>
<tr>
<td>
  Next.js 15<br/>
  React 19<br/>
  TypeScript<br/>
  Tailwind CSS<br/>
  Three.js
</td>
<td>
  Drizzle ORM<br/>
  PostgreSQL<br/>
  Server Actions<br/>
  Clerk Auth
</td>
<td>
  Google Gemini<br/>
  VAPI Voice AI<br/>
  ElevenLabs<br/>
  Deepgram
</td>
<td>
  Vercel<br/>
  Neon DB<br/>
  Edge Runtime
</td>
</tr>
</table>

---

## 📂 Project Structure

```
ecowave/
├── app/
│   ├── landing/      # 3D WebGL landing page
│   ├── scan/         # Receipt scanner
│   ├── voice/        # Voice assistant
│   ├── history/      # Scan history
│   ├── leaderboard/  # Rankings
│   └── carbon/       # Manual logging
├── components/       # Reusable UI components
├── lib/              # Utilities & AI config
└── utils/db/         # Database schema & actions
```

---

## 🔬 Carbon Factors

| Category | CO₂ per Unit |
|----------|--------------|
| Electronics | 50 kg/device |
| Clothing | 5 kg/garment |
| Meat | 5 kg/kg |
| Packaged Food | 1 kg/item |
| Fresh Produce | 0.5 kg/kg |
| Beverages | 0.5 kg/item |

---

## 🚀 Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ANAMASGARD/EcoWave)

Or manually:

```bash
vercel --prod
```

Add environment variables in Vercel Dashboard.

---

## 🤝 Contributing

Contributions welcome! Some ideas:

- 🍔 Food photo scanner
- 🚗 Auto transport detection
- 📱 Social sharing
- 🌍 Multi-language support

---

## 📄 License

MIT © 2024 EcoWave

---

<div align="center">

**Made with 💚 for the planet**

*By students, for students*

</div>
