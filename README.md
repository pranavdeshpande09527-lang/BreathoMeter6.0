# Breathometer 6.0 — Backend AI Infrastructure

> Real-time respiratory health assessment platform powered by Decentralized Machine Learning and Zero-Failure AI Reasoning.

## Zero-Failure AI Infrastructure
The platform implements a **Centralized AI Fallback Router** ensuring 100% uptime for clinical insights:
1. **Primary**: Google Gemini 1.5 Flash (Latency Optimized)
2. **Secondary**: Groq-hosted Llama 3 8B (Speed Optimized)
3. **Static Fallback**: Rule-based medical logic (Guaranteed Response)

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│            Login / Dashboard / Breath Test                │
│         Risk Prediction / Reports / Chatbot               │
└─────────────────────┬────────────────────────────────────┘
                      │ REST API
┌─────────────────────▼────────────────────────────────────┐
│               FastAPI Backend (Python 3.11+)              │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Auth    │ │  Health   │ │   ML     │ │  AI Chat  │  │
│  │  Routes  │ │  Routes   │ │ Inference│ │  (Hava)   │  │
│  └────┬─────┘ └────┬──────┘ └────┬─────┘ └────┬──────┘  │
│       │             │             │             │         │
│  ┌────▼─────────────▼─────────────▼─────────────▼──────┐ │
│  │              Service Layer                          │ │
│  │  ml_service · chatbot_service · report_service      │ │
│  │  ai_service · aqi_service · weather_service         │ │
│  └────┬────────────────────────────────────────────────┘ │
│       │                                                  │
│  ┌────▼────────────────────────────────────────────────┐ │
│  │         Database Layer (httpx → Supabase REST)      │ │
│  └─────────────────────┬───────────────────────────────┘ │
└─────────────────────────┬────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────┐
│              Supabase (PostgreSQL + Auth)                 │
│  Tables: users, health_data, breath_tests,               │
│          risk_predictions, environment_data,              │
│          chat_history, health_profiles                    │
│  Row Level Security: Enabled on all tables               │
└──────────────────────────────────────────────────────────┘
          ┌──────────┬──────────┐
          │          │          │
     ┌────▼───┐ ┌───▼────┐ ┌──▼──────┐
     │ Gemini │ │  Groq  │ │  AQICN  │
     │   AI   │ │(LLaMA) │ │  + OWM  │
     └────────┘ └────────┘ └─────────┘
```

## Tech Stack

| Component | Technology |
|-------|------------|
| Backend Framework | FastAPI (Python 3.11+) |
| Database | Supabase (PostgreSQL 17) |
| Authentication | Supabase GoTrue (JWT) |
| ML Pipeline | scikit-learn, XGBoost, LightGBM, CatBoost |
| AI Chat (Hava) | Groq (LLaMA 3 8B) |
| AI Explanations | Google Gemini 1.5 Flash |
| Air Quality API | AQICN (waqi.info) |
| Weather API | OpenWeatherMap |
| Rate Limiting | slowapi |
| Deployment | Render / Docker / Vercel |

## E2E Testing & Clinical Validation

Breathometer 6.0 includes a production-grade validation suite using **Playwright** to automate the full user lifecycle:

### 1. Robust Health Assessment (9-Step Wizard)
- **Signup Bypass**: Automated pseudo-email generation for rapid testing.
- **Wizard Navigation**: Dynamic handling of React select components and scroll-into-view events.
- **Lung Test Simulation**: Hardware-level mouse event simulation for the "Press & Hold" capacity test.

### 2. Clinical Validator (`clinical_validator.py`)
Direct API integration testing for zero-latency sanity checks:
- **Extreme Profile**: Validates 1.0 (High) risk scoring for Smoker/Low SpO2/High AQI cases.
- **Moderate Profile**: Validates precautionary risk scores for asymptomatic users in high-AQI zones.
- **Doctor Matcher**: Verifies the scoring distance between patient geo-coordinates and specialist hospitals.

### 3. Run Validation
```bash
# Run Full UI E2E
python backend/frontend_e2e_ultra.py

# Run Clinical Logic Validator
python backend/clinical_validator.py
```
Full documentation of test results is available in [e2e_validation_report.md](./backend/e2e_validation_report.md).

## Quick Start

### Prerequisites
- Python 3.11+
- pip

### 1. Clone and Install

```bash
cd BreathoMeter6.0/backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` in the `backend/` directory:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Groq AI API
GROQ_API_KEY=your_groq_api_key

# AQICN Air Quality API
AQICN_API_KEY=your_aqicn_api_key

# OpenWeather API
OPENWEATHER_API_KEY=your_openweather_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
```

### 3. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API root |
| GET | `/health` | Liveness probe |
| GET | `/system-status` | Readiness probe (checks DB + ML models) |

### ML Prediction Engine (`/inference`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/inference/predict` | Run ML + AI risk prediction |

## ML Pipeline

The ML engine uses a 6-model **OOF Weighted Stacking Ensemble**:
1. Logistic Regression
2. Random Forest
3. XGBoost
4. LightGBM
5. CatBoost
6. MLP Neural Network

### Features
- SMOTE oversampling for class imbalance
- Out-of-Fold (OOF) predictions to prevent leakage
- Logistic Regression meta-model for optimal blending weights
- Sensitivity-optimized threshold (≥0.80 sensitivity bias)
- SHAP explanations for interpretability

## Security
- **JWT Authentication** via Supabase GoTrue
- **Row Level Security** on all database tables
- **Rate Limiting** via slowapi (IP-based)
- **Input Validation** via Pydantic schemas
- **Medical Disclaimer** on all ML predictions
