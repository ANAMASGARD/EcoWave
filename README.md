# EcoTrack - Smart Receipt Carbon Tracker

**Snap. Track. Reduce.** Your simple carbon footprint tracker for students.

EcoTrack is a camera-first Next.js application that helps students track their daily carbon footprint by simply photographing shopping receipts. AI analyzes purchases, calculates emissions, provides personalized tips, and enables campus competitions—making sustainability beginner-friendly and visually engaging.

## 🌟 Core Features

### 🎤 Voice AI Assistant (NEW!)
- **Zero-friction tracking** - Log activities in under 5 seconds by just talking
- **Conversational AI** - Feels like chatting with a friend, not a robot
- **Real-time processing** - AI logs to database while you speak
- **Emotion-aware** - Celebrates wins, encourages after high-carbon days
- **Hands-free** - Works while biking, walking, or eating
- **Example**: *"I drove 10km today"* → AI calculates 1.9kg CO₂, suggests bus alternative

### 📸 Smart Receipt Scanner
- **Take a photo** of any shopping receipt
- **AI-powered OCR** automatically extracts items using Google Gemini AI
- **Instant carbon calculation** for each product based on scientific emission factors
- **Categories**: Electronics, Clothing, Food, Beverages, Personal Care, and more
- **Confidence scoring** shows AI accuracy for transparency

### 🤖 AI-Powered Insights
- **Personalized tips** based on your scanned purchases
- **Alternative suggestions** (e.g., "Buy refurbished electronics to save 70% carbon")
- **Potential savings calculator** shows exactly how much CO₂ you could reduce
- **Category breakdown** identifies your highest-impact purchases

### 🏆 Campus Leaderboards
- **Individual rankings** compete with other students
- **Campus group mode** join your dorm or department team
- **Collective impact** see your group's total carbon tracked
- **Real-time updates** watch rankings change as you scan

### 📊 History & Insights
- **Complete scan history** with visual timelines
- **Category analytics** understand your shopping patterns
- **Weekly summaries** track progress over time
- **Shareable impact cards** celebrate achievements

### 🎯 Gamification
- **Earn points** for every receipt scanned (10 points + 1 per kg CO₂)
- **Streak tracking** log daily for consecutive day bonuses
- **Levels and badges** unlock rewards as you track more
- **Manual logging** option for activities beyond shopping

## 🚀 Why EcoTrack?

### For Students
- **Under 30 seconds** to scan a receipt—faster than typing
- **No complex calculations** AI does all the math
- **Visual and engaging** see your impact immediately
- **Beginner-friendly** no environmental science degree required

### Compared to Existing Apps
| Feature | EcoTrack | Traditional Apps |
|---------|----------|------------------|
| **Receipt Scanning** | ✅ AI-powered OCR | ❌ Manual entry |
| **Instant Carbon Calc** | ✅ Automatic | ❌ Self-estimate |
| **Campus Competition** | ✅ Group leaderboards | ❌ Individual only |
| **Student-Focused** | ✅ Dorms & dining halls | ❌ Generic |
| **Learning Integration** | ✅ AI explains choices | ❌ Just numbers |

## 🛠️ Getting Started

### Prerequisites

1. **Google Gemini API Key**: Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Clerk Account**: Set up authentication at [Clerk](https://clerk.dev/)
3. **Neon Database**: Set up PostgreSQL database at [Neon](https://neon.tech/)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ecotrack.git
cd ecotrack

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Environment Variables

Create `.env.local` with the following:

```env
DATABASE_URL=your_neon_postgresql_connection_string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_GEMINI_API_KEY=your_google_gemini_api_key

# Voice AI Assistant (VAPI) - Optional but recommended
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id  # Optional if using inline config
```

### Setting Up Voice AI (VAPI)

1. Create free account at [vapi.ai](https://vapi.ai)
2. Get your Public Key from Dashboard → API Keys
3. Add `NEXT_PUBLIC_VAPI_PUBLIC_KEY` to your `.env.local`
4. (Optional) Create a custom assistant in VAPI Dashboard for more control

### Database Setup

```bash
# Push schema to database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start scanning!

## 📱 How It Works

### 1. Scan Receipt
- Open the app and click **"Scan Receipt"**
- Take a clear photo or upload an existing image
- Wait 3-5 seconds for AI processing

### 2. AI Analysis
- **Gemini AI extracts**: Store name, items, quantities, prices
- **Categorizes products**: Electronics, clothing, food, etc.
- **Calculates carbon**: Based on scientific emission factors
- **Generates insights**: Identifies high-impact purchases

### 3. View Results
- See **total carbon footprint** for the receipt
- Review **item-by-item breakdown** with confidence scores
- Read **personalized tips** for reducing emissions
- Explore **potential savings** from alternative choices

### 4. Track Progress
- All scans saved to **History** with full details
- Watch **weekly/monthly trends** in analytics
- Climb **individual leaderboards** or join campus groups
- Earn **points and rewards** for consistent tracking

## 🔬 Carbon Emission Factors

EcoTrack uses scientifically-backed emission factors:

### Shopping Categories
- **Electronics**: 50kg CO₂ per device
- **Clothing (new)**: 5kg CO₂ per garment  
- **Food (packaged)**: 1kg CO₂ per item
- **Meat products**: 5kg CO₂ per kg
- **Fresh produce**: 0.5kg CO₂ per kg
- **Beverages**: 0.5kg CO₂ per item
- **Personal care**: 2kg CO₂ per item

### Waste Offset
- **1kg waste diverted** = 0.5kg CO₂ saved (from landfill methane)

## 🎓 Perfect for Hackathons

EcoTrack demonstrates:
- ✅ **Voice AI Integration** - VAPI for conversational carbon tracking
- ✅ **AI/ML Integration** - Google Gemini for OCR and categorization
- ✅ **Computer Vision** - Receipt image processing
- ✅ **Data Visualization** - Charts, leaderboards, analytics
- ✅ **Social Impact** - Environmental awareness and behavior change
- ✅ **Gamification** - Points, streaks, campus competitions
- ✅ **Full-Stack Development** - Next.js, PostgreSQL, Clerk auth
- ✅ **Natural Language Processing** - Voice commands parsed to structured data

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS  
- **Authentication**: Clerk
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **AI**: Google Gemini 2.5 Flash for OCR and analysis
- **Voice AI**: VAPI for conversational carbon tracking
- **Voice Provider**: ElevenLabs for natural speech synthesis
- **Transcription**: Deepgram Nova-2 for accurate voice recognition
- **Deployment**: Vercel-ready

## 📂 Project Structure

```
ecotrack/
├── app/
│   ├── scan/            # 📸 Smart Receipt Scanner
│   ├── history/         # 📊 Scan history and insights
│   ├── carbon/          # 🔧 Manual activity logging
│   ├── leaderboard/     # 🏆 Individual & campus rankings
│   ├── rewards/         # 🎁 Points and redemption
│   └── settings/        # ⚙️ Campus group selection
├── lib/
│   ├── receiptAnalysis.ts   # AI OCR and carbon calculations
│   └── carbonCalculations.ts # Emission factors utilities
├── utils/db/
│   ├── schema.ts        # Database schema (receipts, groups, profiles)
│   └── actions.tsx      # Server actions for data operations
└── components/          # Reusable UI components
```

## 🎯 Key Differentiators

### 1. Voice-First Interaction
The first carbon tracker with conversational AI. Just say "I drove 15km today" and Eco (our AI assistant) handles everything—no typing, no forms, no friction. Under 600ms response time makes it feel like talking to a friend.

### 2. Camera-First Design
Unlike apps requiring manual input, EcoTrack uses your camera as the primary interface. Scanning a receipt takes less time than checking Instagram.

### 2. Student-Centric
- **Campus groups** for dorm/department competitions
- **Relevant categories** like campus dining and textbooks
- **Affordable alternatives** (e.g., second-hand options)
- **Streak system** fits academic schedules

### 3. Educational AI
EcoTrack doesn't just show numbers—it explains WHY choices matter and HOW to improve, making sustainability learning passive and effortless.

### 4. Visual Impact
See your carbon footprint as tangible numbers, charts, and comparisons. Watch savings grow over time. Celebrate milestones with sharable impact cards.

## 🌍 Real-World Impact

### Example Use Cases

**Student buys groceries**:
1. Scans receipt with 15 items
2. Learns beef burger = 2.5kg CO₂ vs. veggie burger = 0.3kg CO₂
3. Gets tip: "Swap 2 beef meals per week → save 20kg CO₂ monthly"
4. Joins dorm team, sees collective 500kg tracked
5. Climbs leaderboard, earns 25 points

**Campus sustainability program**:
1. All dorms compete in "Green Week"
2. Students track purchases via EcoTrack
3. Winners get sustainable prizes
4. University showcases aggregate 10-ton reduction
5. Data informs campus dining decisions

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Google Gemini AI](https://ai.google.dev/)
- [Clerk Authentication](https://clerk.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Carbon Footprint Research](https://ourworldindata.org/carbon-footprint)

## 🚀 Deploy on Vercel

```bash
# Connect your GitHub repo to Vercel
vercel --prod

# Add environment variables in Vercel dashboard:
# - DATABASE_URL
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY
# - NEXT_PUBLIC_GEMINI_API_KEY
```

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new).

## 🎤 Voice Commands Examples

| Say this | Eco does this |
|----------|---------------|
| "I drove 10 kilometers today" | Logs 1.9kg CO₂, suggests bus |
| "Had a chicken burger for lunch" | Logs 1.7kg CO₂, compares to veggie |
| "How's my day looking?" | Summarizes daily carbon with tips |
| "Where am I on the leaderboard?" | Reports position and points needed |
| "Bought two new t-shirts" | Logs 10kg CO₂, suggests second-hand |

## 🤝 Contributing

We welcome contributions! Areas for expansion:
- **Food scanner**: Point camera at meals to get instant CO₂ ratings
- **Transport detection**: Auto-log commute via background photo analysis
- **Social sharing**: Post achievements to Instagram/Twitter
- **Eco-challenges**: Weekly photo verification challenges
- **Multi-language voice**: Support for more languages via VAPI

## 📄 License

MIT License - feel free to use for your hackathon or personal projects!

## 🙏 Acknowledgments

Built for students who want to make a difference but don't know where to start. Carbon tracking shouldn't be complicated—just snap, track, and reduce.

---

**Made with 💚 for the planet by students, for students.**