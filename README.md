# CleanShare - Community Waste Reporting Platform

CleanShare is a Next.js application that enables communities to report and track waste cleanup efforts. Users can report waste locations with AI-powered waste verification using Google Gemini AI and location search powered by MapTiler/OpenStreetMap.

## Features

- 🔐 **Authentication**: Secure user authentication with Clerk
- 📍 **Location Search**: MapTiler-powered location search and geocoding
- 🤖 **AI Waste Verification**: Google Gemini AI analyzes uploaded images to identify waste types and quantities
- 📊 **Database**: PostgreSQL with Neon and Drizzle ORM
- 🗺️ **Maps**: OpenStreetMap integration via MapTiler API
- 📱 **Responsive Design**: Mobile-friendly UI with Tailwind CSS

## Getting Started

### Prerequisites

1. **MapTiler API Key**: Get your free API key from [MapTiler](https://www.maptiler.com/)
2. **Clerk Account**: Set up authentication at [Clerk](https://clerk.dev/)
3. **Google Gemini API Key**: Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. **Neon Database**: Set up a PostgreSQL database at [Neon](https://neon.tech/)

### Environment Setup

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL`: Your Neon PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key
- `CLERK_SECRET_KEY`: Clerk secret key
- `NEXT_PUBLIC_GEMINI_API_KEY`: Google Gemini API key
- `NEXT_PUBLIC_MAPTILER_KEY`: MapTiler API key

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Database Setup

```bash
npm run db:push
```

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Clerk
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Maps**: MapTiler + OpenStreetMap
- **AI**: Google Gemini AI
- **Deployment**: Vercel-ready

## API Integrations

### MapTiler Integration
The application uses MapTiler for:
- Location search and geocoding
- OpenStreetMap tile serving
- Address suggestions and place lookup

### Google Gemini AI
Used for:
- Waste type identification from uploaded images
- Quantity estimation
- Confidence scoring for AI analysis

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [MapTiler Documentation](https://docs.maptiler.com/)
- [Clerk Documentation](https://clerk.dev/docs)
- [Google Gemini AI](https://ai.google.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Make sure to add all environment variables to your Vercel deployment settings.
