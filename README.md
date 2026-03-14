# Breathometer 4.0 — Backend API

> Real-time respiratory health assessment platform powered by Machine Learning and AI.

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

| Layer | Technology |
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
| Deployment | Docker / uvicorn |

## Quick Start

### Prerequisites
- Python 3.11+
- pip

### 1. Clone and Install

```bash
cd BreathoMeter5.0/backend
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

# Optional: Supabase Admin (for dev mode signup bypass)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Environment
ENVIRONMENT=development
```

### 3. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Verify

- API Root: http://localhost:8000/
- Health Check: http://localhost:8000/health
- API Docs: http://localhost:8000/docs
- System Status: http://localhost:8000/system-status

## API Endpoints

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API root |
| GET | `/health` | Liveness probe |
| GET | `/system-status` | Readiness probe (checks DB + ML models) |

### Authentication (`/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup` | Register new user | ❌ |
| POST | `/auth/login` | Login (returns JWT) | ❌ |
| GET | `/auth/profile` | Get user profile | ✅ |
| PATCH | `/auth/profile` | Update profile | ✅ |

### Health Data (`/health`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/health/input` | Submit health assessment | ✅ |
| GET | `/health/latest` | Get latest health data | ✅ |

### Breath Tests (`/breath-test`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/breath-test` | Submit breath test results | ✅ |
| GET | `/breath-test/{user_id}` | Get breath test history | ✅ |

### ML Prediction Engine (`/inference`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/inference/predict` | Run ML + AI risk prediction | ✅ |

### Risk Predictions (`/prediction`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/prediction/store` | Save prediction result | ✅ |
| GET | `/prediction/{user_id}` | Get prediction history | ✅ |

### Environment (`/environment`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/environment` | Store environment data | ✅ |
| GET | `/environment/aqi` | Real-time AQI by coordinates | ❌ |
| GET | `/environment/aqi-by-city` | Real-time AQI by city name | ❌ |
| GET | `/environment/weather` | Real-time weather data | ❌ |

### AI & Chat
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/ai/explanation` | Get AI health explanation | ✅ |
| POST | `/chatbot/message` | Chat with Hava AI | ✅ |
| POST | `/chat` | Store chat history | ✅ |

### Reports & Alerts
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/reports/summary` | Generate health summary report | ✅ |
| GET | `/alerts/{user_id}` | Get patient alerts | ✅ |
| GET | `/alerts/doctor/{doctor_id}` | Get doctor dashboard alerts | ✅ (Doctor) |

## Database Schema

| Table | Description | RLS |
|-------|-------------|-----|
| `users` | User profiles (name, email, role) | ✅ |
| `health_data` | Health assessments (age, BMI, smoking) | ✅ |
| `breath_tests` | Breath test results (capacity, duration, strength) | ✅ |
| `risk_predictions` | ML prediction results (risk score, category) | ✅ |
| `environment_data` | Environmental readings (AQI, PM2.5) | ✅ |
| `chat_history` | Hava chatbot conversation logs | ✅ |
| `health_profiles` | Extended user health profiles | ✅ |

All tables have Row Level Security (RLS) enabled with `auth.uid()` policies ensuring users can only access their own data.

## ML Pipeline

The ML engine uses a 6-model **OOF Weighted Stacking Ensemble**:
1. Logistic Regression
2. Random Forest
3. XGBoost
4. LightGBM
5. CatBoost
6. MLP Neural Network

### Training
```bash
python train_model.py
```
Requires dataset in `backend/dataset/air_quality_health_impact_data.csv`.

### Features
- SMOTE oversampling for class imbalance
- Out-of-Fold (OOF) predictions to prevent leakage
- Logistic Regression meta-model for optimal blending weights
- Sensitivity-optimized threshold (≥0.80 sensitivity bias)
- SHAP explanations for interpretability

## Docker Deployment

```bash
cd BreathoMeter5.0/backend

# Build
docker build -t breathometer-backend .

# Run
docker run -p 8000:8000 --env-file .env breathometer-backend
```

## Security

- **JWT Authentication** via Supabase GoTrue
- **Row Level Security** on all database tables
- **Rate Limiting** via slowapi (IP-based)
- **Input Validation** via Pydantic schemas
- **CORS** restricted to localhost origins (configurable)
- **Password Strength** enforcement (8+ chars, uppercase, number)
- **Medical Disclaimer** on all ML predictions

## Maintenance

### Logs
Application logs use Python's `logging` module with the `breathometer` namespace. Configure log level via environment or code.

### Health Monitoring
- `/health` — quick liveness check
- `/system-status` — deep readiness check (DB + ML connectivity)

### Updating Models
1. Place new dataset in `backend/dataset/`
2. Run `python train_model.py`
3. Restart the server to reload models
