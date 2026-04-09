import os
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from app.core.errors import setup_error_handlers
from app.core.rate_limit import setup_rate_limiting
from app.database import init_db_clients, close_db_clients

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    traces_sample_rate=0.0,
    profiles_sample_rate=0.0,
)

logger = logging.getLogger("breathometer")


def _audit_environment() -> dict:
    """
    Runs at startup. Logs every env var's status (SET / MISSING) so that
    any misconfigured Render deploy is immediately visible in the build logs.
    Returns a summary dict used by /debug/config.
    """
    from app.config import settings

    REQUIRED = {
        "SUPABASE_URL":         bool(settings.supabase_url),
        "SUPABASE_KEY":         bool(settings.supabase_key),
        "GEMINI_API_KEY":       bool(settings.gemini_api_key),
        "GROQ_API_KEY":         bool(settings.groq_api_key),
        "AQICN_API_KEY":        bool(settings.aqicn_api_key),
        "OPENWEATHER_API_KEY":  bool(settings.openweather_api_key),
    }
    OPTIONAL = {
        "SUPABASE_SERVICE_ROLE_KEY": bool(settings.supabase_service_role_key),
        "GOOGLE_MAPS_API_KEY":       bool(settings.google_maps_api_key),
        "BREVO_API_KEY":             bool(settings.brevo_api_key),
        "SENTRY_DSN":                bool(os.getenv("SENTRY_DSN")),
    }

    logger.info("=" * 60)
    logger.info("  BREATHOMETER — STARTUP ENV AUDIT")
    logger.info("=" * 60)

    all_required_ok = True
    for key, is_set in REQUIRED.items():
        status = "✓ SET" if is_set else "✗ MISSING  ← REQUIRED"
        logger.info(f"  [REQUIRED]  {key:<30} {status}")
        if not is_set:
            all_required_ok = False

    for key, is_set in OPTIONAL.items():
        status = "✓ SET" if is_set else "○ not set (optional – degraded mode)"
        logger.info(f"  [OPTIONAL]  {key:<30} {status}")

    logger.info("-" * 60)
    if all_required_ok:
        logger.info("  ✅ All REQUIRED variables are present. Startup OK.")
    else:
        logger.error("  ❌ One or more REQUIRED variables are MISSING. API will be degraded.")

    if not OPTIONAL["SUPABASE_SERVICE_ROLE_KEY"]:
        logger.warning(
            "  ⚠  SUPABASE_SERVICE_ROLE_KEY not set. Running in degraded mode:\n"
            "      • Signup uses public auth endpoint (works fine)\n"
            "      • Profile update skips auth metadata sync\n"
            "      • DB inserts use anon key (RLS still enforced)\n"
            "      Set this in Render → Environment to enable full admin features."
        )
    logger.info("=" * 60)

    return {
        "required": REQUIRED,
        "optional": OPTIONAL,
        "all_required_ok": all_required_ok,
        "degraded_mode": not OPTIONAL["SUPABASE_SERVICE_ROLE_KEY"],
        "environment": settings.environment,
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup/shutdown of shared resources (DB connection pools)."""
    _audit_environment()          # ← Logs env var status
    await init_db_clients()       # Open persistent HTTP pools on startup
    
    # Warm-up the database connection
    try:
        from app.database import supabase_request
        await supabase_request("health_data", "GET", query_params={"limit": "1"})
        logger.info("Database connection warmed up successfully.")
    except Exception as e:
        logger.warning(f"Database warm-up failed (ignorable on cold start): {e}")
        
    yield
    await close_db_clients()      # Gracefully drain pools on shutdown


app = FastAPI(
    title="Breathometer 4.0 Backend",
    description="Real-time backend API for Breathometer 4.0 health assessment platform.",
    version="1.0.0",
    lifespan=lifespan,
)

setup_error_handlers(app)
setup_rate_limiting(app)

import os

# Configure CORS — restrict in production, allow localhost for development
# Allowed production domains are Firebase Hosting URLs
ALLOWED_ORIGINS = [
    "https://breathometer6.web.app",
    "https://breathometer6.firebaseapp.com"
]

# Keep the environment as development until frontend domain is finalized and env=production
# Do not fallback to localhost in production mode.
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "development":
    ALLOWED_ORIGINS.extend([
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Health & System Status Endpoints ---

@app.get("/", tags=["System"])
def read_root():
    return {"message": "Welcome to the Breathometer 4.0 Backend API", "status": "healthy"}

@app.get("/health", tags=["System"])
def health_check():
    """Ultra-light liveness probe."""
    return PlainTextResponse("OK")

@app.get("/ping", tags=["System"])
def ping_check():
    """Ultra-light ping probe."""
    return PlainTextResponse("OK")

@app.get("/status", tags=["System"])
def status_check():
    """Ultra-light status probe."""
    return PlainTextResponse("OK")

@app.get("/system-status", tags=["System"])
async def system_status():
    """Readiness probe — checks connectivity to critical services."""
    status = {"api": "ok", "database": "unknown", "ml_models": "unknown"}
    
    # Check Supabase connectivity
    try:
        from app.database import supabase_request
        await supabase_request("health_data", "GET", query_params={"limit": "1"})
        status["database"] = "ok"
    except Exception as e:
        status["database"] = f"error: {str(e)[:100]}"
        logger.warning(f"System status: DB check failed: {e}")
    
    # Check ML models loaded
    try:
        from app.routes.inference_api import calibrated_model, preprocessor
        status["ml_models"] = "loaded" if calibrated_model and preprocessor else "not_loaded"
    except Exception:
        status["ml_models"] = "not_loaded"
    
    return status

@app.get("/debug/config", tags=["System"])
def debug_config():
    """
    Shows full environment configuration status.
    Use this to verify a Render deployment has all required env vars.
    """
    audit = _audit_environment()
    return {
        "status": "ok" if audit["all_required_ok"] else "degraded",
        "degraded_mode": audit["degraded_mode"],
        "environment": audit["environment"],
        "required_vars": audit["required"],
        "optional_vars": audit["optional"],
        # Legacy flat fields for backward compatibility
        "supabase_url_set":              audit["required"]["SUPABASE_URL"],
        "supabase_anon_key_set":         audit["required"]["SUPABASE_KEY"],
        "supabase_service_role_key_set": audit["optional"]["SUPABASE_SERVICE_ROLE_KEY"],
        "gemini_key_set":                audit["required"]["GEMINI_API_KEY"],
        "groq_key_set":                  audit["required"]["GROQ_API_KEY"],
    }

# --- Register All API Routers ---

from app.routes import auth, environment, health, breath, prediction, ai, chatbot, reports, inference_api, alerts, chat, appointments, doctors, feedback, email

app.include_router(auth.router)
app.include_router(environment.router)
app.include_router(health.router)
app.include_router(breath.router)
app.include_router(prediction.router)
app.include_router(ai.router)
app.include_router(chatbot.router)
app.include_router(reports.router)
app.include_router(inference_api.router)
app.include_router(alerts.router)
app.include_router(chat.router)
app.include_router(appointments.router)
app.include_router(doctors.router)
app.include_router(feedback.router)
app.include_router(email.router)
