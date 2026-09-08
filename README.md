# ✈️ TripPilot AI – AI-Powered Collaborative Trip Management Platform

TripPilot AI is a production-grade, full-stack MERN application designed to assist travelers throughout the complete trip lifecycle: **Before the Trip** (Discovery & Planning), **During the Trip** (Live Weather Re-optimization & Expense Tracking), and **After the Trip** (AI Travel Summaries & Shared Gallery).

---

## 🌟 Key Features

- **Preference-Based AI Destination Discovery**: Match travel budget, style, duration, and weather preferences with AI-generated recommendations and pros/cons analysis.
- **AI Day-Wise Itinerary Generator**: Automated schedule creation (Morning, Afternoon, Evening) with estimated costs and travel times.
- **Smart Packing Assistant**: Dynamic packing checklists based on destination weather forecasts and activity types.
- **Real-time Collaboration**: Multi-user trip management with custom roles (`OWNER`, `EDITOR`, `VIEWER`).
- **Expense & Budget Analytics**: Categorized expense tracking (Hotel, Food, Fuel, Shopping, Misc) with visual chart analytics via Recharts.
- **Adaptive Weather Optimizer**: Intelligent itinerary modification suggestions during unexpected weather changes via OpenWeather API.
- **Shared Gallery**: Cloudinary-powered media storage for collaborative trip memories.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router DOM, Axios, React Hook Form, Recharts, Leaflet / OpenStreetMap.
- **Backend**: Node.js, Express.js (MVC + Service Layer), MongoDB Atlas, Mongoose ODM, JWT Auth, bcrypt.
- **AI & Cloud Services**: Google Gemini API, Cloudinary SDK, OpenWeather API.

---

## 🏗️ Project Architecture

```text
Trip_Pilot/
├── client/          # React Frontend (Vite + Tailwind CSS)
├── server/          # Node.js + Express Backend (MVC Architecture)
└── docs/            # Architecture & API Documentation
```

---

## 🚦 Local Setup

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-username/Trip_Pilot.git
   cd Trip_Pilot
   ```

2. **Server Setup**
   ```bash
   cd server
   npm install
   cp .env.example .env
   npm run dev
   ```

3. **Client Setup**
   ```bash
   cd client
   npm install
   npm run dev
   ```
