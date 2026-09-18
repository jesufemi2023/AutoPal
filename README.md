# AutoPal NG — Precision Automotive Telemetry & Asset Intelligence

> **Designed & Engineered by Jesufemi Temitope Solomon**  
> 🔗 [LinkedIn Profile](https://www.linkedin.com/in/temitope-solomon-jesufemi-2620ab275/) • ✉️ ogungbetemitope@gmail.com  
> 🌍 Full-Stack Automotive SaaS Platform tailored for African & Emerging Market Road Telemetry

---

## 📌 Executive Overview & Problem Statement
Vehicle owners in Nigeria and emerging markets face severe financial loss from three systemic issues:
1. **Asymmetric Mechanic Information**: 80%+ of car owners experience trial-and-error parts replacement or fraudulent diagnostic claims.
2. **Accelerated Depreciation & Resale Slaughter**: Without verified, timestamped maintenance records, secondary market buyers devalue vehicles by 15% to 30%.
3. **Severe Environmental Wear**: High ambient tropical temperatures, stop-and-go urban gridlock (e.g. Lagos Third Mainland Bridge), and variable fuel quality accelerate component wear on cooling, lubrication, and friction assemblies.

**AutoPal NG** solves this through an industrial-grade vehicle intelligence cockpit combining **Google Gemini Neural Diagnostics**, **real-time fuel metabolic tracking**, **predictive maintenance roadmaps**, and **immutable digital dossiers** that command trust and protect vehicle equity.

---

## 🏗️ System Architecture & Engineering Highlights

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (React 18 + Vite)                  │
│  - Industrial CAD-Themed UI with Tailwind CSS                          │
│  - JetBrains Mono Optical Telemetry Readouts                           │
│  - Mobile Responsive Precision Drawer (280px constraint)               │
│  - Real-Time Dynamic Equity Preservation Calculator                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  STATE & PERSISTENCE │ │   AI NEURAL ENGINE   │ │  PAYMENTS & STORAGE  │
│  - Zustand Store     │ │  - Google Gemini 3.8 │ │  - Paystack Gateway  │
│  - Supabase Auth     │ │  - Transparent Model │ │  - Supabase PostgREST│
│  - Local Transient   │ │    Fallback Layer    │ │  - Multi-tier RBAC   │
│    Buffer for Trials │ │  - Heuristic Triage  │ │    (TierGuard.tsx)   │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

### 🧠 1. Resilient Neural Diagnostics & Fallback Strategy (`geminiService.ts`)
- **Self-Healing Model Orchestration**: Calls `gemini-3.8-flash` with structured JSON schema outputs (`responseSchema`) and automatically falls back to backup preview candidates (`gemini-3-flash-preview`, `gemini-2.5-flash`) on transient API limits (503 / 404 / 429).
- **Zero-Downtime Automotive Heuristics**: If third-party API credentials encounter regional network loss or quota exhaustion, an onboard mechanical triage algorithm instantly parses symptoms (braking acoustic wear indicators, cooling thermal runaway, OBD-II misfire profiles) to deliver actionable advice with zero user downtime.

### 📊 2. Dynamic Equity Preservation & Metabolic Fuel Algorithm
- Mathematical modeling calculating 3-year protected vehicle equity based on commute mileage, regional depreciation decay (`0.92^(year/2)`), preventative maintenance cost-avoidance, and fuel optimization.
- Analyzes true KM/L from fuel logs and flags oxygen sensor or fuel injector degradation before check engine lights activate.

### 🛡️ 3. Multi-Tier Capability Guard Architecture (`TierGuard.tsx`)
- Role-based capability enforcement (`MAX_VEHICLES`, `EXPORT_DOSSIER`, `PREDICTIVE_SCHEDULE`) seamlessly integrated with Paystack's payment webhooks and local persistence.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Core** | React 18, TypeScript, Vite 6, Tailwind CSS |
| **Icons & Visuals** | Lucide React, Custom CAD Grid Shaders |
| **State Management** | Zustand |
| **AI & Neural Intelligence** | `@google/genai` SDK, Gemini 3.8 Flash, Gemini Flash Preview |
| **Authentication & Database** | Supabase (PostgreSQL, Row Level Security, Auth) |
| **Payments** | Paystack Gateway Integration (NGN / African Currencies) |

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js 18+ or Bun
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/your-username/autopal-ng.git
cd autopal-ng
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
```

### 4. Launch Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👨‍💻 Engineer & Architect Contact

**Jesufemi Temitope Solomon**  
- **LinkedIn**: [temitope-solomon-jesufemi-2620ab275](https://www.linkedin.com/in/temitope-solomon-jesufemi-2620ab275/)  
- **Email**: ogungbetemitope@gmail.com  
- **Portfolio App**: [Live AutoPal NG Instance](https://ais-pre-hl6oc2taqm43irnazwqyic-420624279869.europe-west2.run.app)
