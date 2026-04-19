<div align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
</div>

<h1 align="center">Breathometer 6.0 🫁</h1>

<p align="center">
  <strong>Real-time respiratory health assessment platform powered by Decentralized Machine Learning and Zero-Failure AI Architecture.</strong>
</p>

## 🌟 Key Features

- **9-Step Clinical Assessment Wizard**: Dynamic hardware-level simulation measuring inhale/exhale capacities and breath-holding capability.
- **Zero-Failure AI Diagnostics**: Dynamic model fallback utilizing Google Gemini 1.5 Flash (Primary) and Groq LLaMA 3 8B (Secondary) ensuring 100% backend uptime.
- **Advanced Core ML Pipeline**: A highly accurate 6-model Out-of-Fold (OOF) Weighted Stacking Ensemble (XGBoost, LightGBM, CatBoost) providing instantaneous health predictions.
- **Hava AI Chat**: 24/7 dedicated respiratory health companion to answer user queries safely and securely.
- **Doctor Matcher**: Spatially queries local specialists and pulmonologists based on calculated risk severity.
- **Environmental Engine**: Real-time integration with AQICN and OpenWeather ensuring localized air quality impacts are factored into every diagnostic.

## 🏗️ System Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                │
│            Login / Dashboard / Breath Test                │
│         Risk Prediction / Reports / Hava Chatbot          │
└─────────────────────┬─────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼─────────────────────────────────────┐
│               FastAPI Backend (Python 3.11+)              │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐  ┌───────────┐ │
│  │  Auth    │ │  Health   │ │   ML     │  │  AI Chat  │ │
│  │  Routes  │ │  Routes   │ │ Inference│  │  (Hava)   │ │
│  └────┬─────┘ └────┬──────┘ └────┬─────┘  └────┬──────┘ │
│       │             │             │            │        │
│  ┌────▼─────────────▼─────────────▼────────────▼──────┐ │
│  │              Service Layer                         │ │
│  │  ml_service · chatbot_service · report_service     │ │
│  │  ai_service · aqi_service · weather_service        │ │
│  └────┬───────────────────────────────────────────────┘ │
│       │                                                 │
│  ┌────▼───────────────────────────────────────────────┐ │
│  │         Database Layer (httpx → Supabase REST)     │ │
│  └─────────────────────┬──────────────────────────────┘ │
└─────────────────────────┬─────────────────────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)                 │
│  Row Level Security • JWT Auth • Private Storage          │
└───────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js with Vite
- **Styling**: Tailwind CSS, PostCSS
- **State/Routing**: React Router DOM

### Backend & AI
- **Framework**: FastAPI (Python 3.11+)
- **ML Engine**: Scikit-Learn, XGBoost, LightGBM, CatBoost
- **AI Integrations**: Google Gemini 1.5 Flash, Groq (LLaMA 3 8B)
- **External Context**: AQICN (waqi.info), OpenWeatherMap

### Database & Security
- **Database**: Supabase (PostgreSQL 17)
- **Security**: Supabase GoTrue (JWT), Row-Level Security (RLS)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.11+
- Supabase Project & external API Keys (Gemini, Groq, AQI, OpenWeather)

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
venv\Scripts\activate
# Linux/OSX:
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
# Google Gemini & Groq AI
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Environment APIs
AQICN_API_KEY=your_aqicn_api_key
OPENWEATHER_API_KEY=your_openweather_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

Run the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend

# Install Dependencies
npm install

# Start Local Development Server
npm run dev
```
The application will be accessible at `http://localhost:5173`.

## 🌐 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API Root Health |
| `GET` | `/system-status` | Readiness probe (Checks DB + ML models) |
| `POST` | `/inference/predict` | Triggers the ML Ensemble + AI Risk Prediction |

## 🧪 E2E Testing & Clinical Validation

Breathometer 6.0 features a production-grade validation suite using **Playwright** that automates the full patient workflow and measures backend reliability across extreme respiratory profiles.

```bash
# Run Full UI Automation (Signup, Auth, 9-Step Assessment)
python backend/frontend_e2e_ultra.py

# Run Clinical Logic Validator (Validates ML Ensemble accuracy)
python backend/clinical_validator.py
```
> Full documentation of test results is available at `backend/e2e_validation_report.md`.

## 🔐 Security & Compliance
- **HIPAA Focused:** Architectural design complies with patient data portability and isolation standards.
- **Military-Grade Encryption:** AES-256 for data at rest, TLS 1.3 for data in transit. 
- **Row Level Security (RLS):** Stringent DB policies restrict data interactions securely to the authenticated JWT context.
- **Medical Disclaimer:** Strict API-level disclaimers ensure AI reasoning does not substitute for certified clinical review or emergency services.

---
<p align="center">
  <i>Built with performance, resilience, and zero-failure engineering in mind.</i>
</p>
