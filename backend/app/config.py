from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    gemini_api_key: str
    groq_api_key: str
    aqicn_api_key: str
    openweather_api_key: str
    supabase_url: str
    supabase_key: str
    
    # New Auth & Env settings
    environment: str = "development"
    supabase_service_role_key: Optional[str] = None
    google_maps_api_key: Optional[str] = None
    brevo_api_key: Optional[str] = None
    
    # SMTP settings for production
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
