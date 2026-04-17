"""
ai_fallback_router.py
=====================
Centralized, fail-proof AI call engine for Breathometer.

Architecture:
  Attempt 1-3 → Groq (llama-3.3-70b-versatile)
  Attempt 1-3 → Groq (llama-3.1-8b-instant)       ← smaller/faster
  Attempt 1-3 → Gemini (gemini-1.5-flash)
  Attempt 1-2 → Gemini (gemini-1.5-pro)
  Final       → Guaranteed static / cached response  ← NEVER fails

Features:
  - 3 retries per provider with exponential back-off (2 s → 4 s → 8 s)
  - Hard 10 s timeout per attempt
  - LRU cache (50 entries) — served on total outage
  - Friendly user-visible banner when degraded
  - Zero raw error strings exposed to frontend
"""

import asyncio
import hashlib
import json
import logging
import time
from collections import OrderedDict
from typing import Optional

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider catalogue
# ---------------------------------------------------------------------------

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_URL_TMPL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
# ---------------------------------------------------------------------------
# Model safety configuration
# ---------------------------------------------------------------------------
BLOCKED_MODELS = [
    "gemini-3.1-pro-high",
    "claude-sonnet-4-6",
]

PROVIDERS = [
    # 1️⃣ Primary fast stable model
    {"id": "gemini-flash", "type": "gemini", "model": "gemini-1.5-flash"},
    # 2️⃣ Secondary fast Groq model
    {"id": "groq-small",   "type": "groq",   "model": "llama-3.1-8b-instant"},
    # 3️⃣ Balanced Gemini model
    {"id": "gemini-pro",   "type": "gemini", "model": "gemini-1.5-pro"},
    # 4️⃣ Larger Groq model (fallback if others fail)
    {"id": "groq-large",   "type": "groq",   "model": "llama-3.3-70b-versatile"},
]

MAX_RETRIES   = 3       # per provider
REQUEST_TIMEOUT = 10.0  # seconds — hard cutoff per attempt
BACKOFF_BASE  = 2.0     # seconds — doubles each retry (2 → 4 → 8)

# ---------------------------------------------------------------------------
# Guaranteed fallback responses (medically-safe, user-friendly)
# ---------------------------------------------------------------------------

STATIC_FALLBACKS = {
    "chat": (
        "🌬️ **Hava is temporarily busy connecting to AI servers.**\n\n"
        "Based on general respiratory health guidelines while I reconnect:\n\n"
        "• **Stay hydrated** — drink at least 8 glasses of water daily.\n"
        "• **Avoid high-AQI areas** — check your local air quality before going outdoors.\n"
        "• **Practice diaphragmatic breathing** — slow deep breaths strengthen lung capacity.\n"
        "• **If symptoms worsen** — please consult your doctor immediately.\n\n"
        "_I'll be back shortly with personalized AI-powered insights!_ 💚"
    ),

    "ensemble": {
        "conditions": [
            {
                "name": "Respiratory Irritation",
                "risk": 40,
                "reason": (
                    "General respiratory concern based on submitted vitals. "
                    "Elevated cough or reduced breath-hold capacity may indicate mucosal irritation."
                ),
            },
            {
                "name": "Environmental Sensitivity",
                "risk": 30,
                "reason": (
                    "AQI exposure has been noted. Prolonged exposure to pollutants "
                    "(PM2.5, NO2) is associated with airway inflammation."
                ),
            },
            {
                "name": "Possible Airway Restriction",
                "risk": 20,
                "reason": (
                    "Breath capacity metrics suggest potential mild airway narrowing. "
                    "This is common in early-stage obstructive conditions."
                ),
            },
        ],
        "explanation": (
            "⚠️ AI reasoning engine temporarily unavailable. "
            "These results are based on clinical ML patterns and general guidelines only. "
            "Please consult a doctor for an accurate diagnosis."
        ),
    },

    "explanation": (
        "⚠️ **AI explanation service is temporarily busy.**\n\n"
        "**General respiratory health guidance:**\n\n"
        "• Air quality (AQI) directly affects lung health — AQI > 100 increases respiratory risk.\n"
        "• Regular breathing exercises (inhale 4 s, hold 4 s, exhale 6 s) help expand lung capacity.\n"
        "• Avoiding smoking and secondhand smoke is the single most impactful action for lung health.\n"
        "• SpO2 below 95 % warrants medical evaluation.\n\n"
        "_Please check back in a few minutes for a personalized AI explanation._"
    ),
}

# ---------------------------------------------------------------------------
# Simple in-memory LRU cache
# ---------------------------------------------------------------------------

class LRUCache:
    def __init__(self, capacity: int = 50):
        self._cache: OrderedDict = OrderedDict()
        self._capacity = capacity

    def _key(self, purpose: str, prompt: str) -> str:
        digest = hashlib.sha256(f"{purpose}:{prompt}".encode()).hexdigest()[:16]
        return digest

    def get(self, purpose: str, prompt: str):
        k = self._key(purpose, prompt)
        if k in self._cache:
            self._cache.move_to_end(k)
            logger.info(f"[AIRouter] Cache HIT for purpose={purpose}")
            return self._cache[k]
        return None

    def set(self, purpose: str, prompt: str, value):
        k = self._key(purpose, prompt)
        self._cache[k] = value
        self._cache.move_to_end(k)
        if len(self._cache) > self._capacity:
            self._cache.popitem(last=False)

_cache = LRUCache(capacity=50)

# ---------------------------------------------------------------------------
# Low-level provider callers
# ---------------------------------------------------------------------------

async def _call_groq(
    model: str,
    system_prompt: Optional[str],
    user_prompt: str,
    json_mode: bool = False,
) -> str:
    """Single Groq attempt. Raises on any failure."""
    api_key = settings.groq_api_key
    if not api_key:
        raise ValueError("GROQ_API_KEY not configured")

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})

    payload: dict = {"model": model, "messages": messages}
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
        payload["temperature"] = 0.1

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        if not content or not content.strip():
            raise ValueError("Empty content from Groq")
        return content


async def _call_gemini(
    model: str,
    prompt: str,
    json_mode: bool = False,
) -> str:
    """Single Gemini attempt. Raises on any failure."""
    api_key = settings.gemini_api_key
    if not api_key:
        raise ValueError("GEMINI_API_KEY not configured")

    url = GEMINI_URL_TMPL.format(model=model, key=api_key)
    gen_config: dict = {"temperature": 0.1}
    if json_mode:
        gen_config["responseMimeType"] = "application/json"

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        resp = await client.post(
            url,
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": gen_config,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        if not content or not content.strip():
            raise ValueError("Empty content from Gemini")
        return content


# ---------------------------------------------------------------------------
# Retry wrapper
# ---------------------------------------------------------------------------

async def _call_with_retry(
    provider: dict,
    system_prompt: Optional[str],
    user_prompt: str,
    json_mode: bool,
) -> str:
    """Try a single provider up to MAX_RETRIES times with exponential back-off."""
    last_exc: Exception = Exception("Unknown")
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            if provider["type"] == "groq":
                result = await _call_groq(
                    model=provider["model"],
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    json_mode=json_mode,
                )
            else:
                # For Gemini merge system + user into one prompt
                combined = f"{system_prompt}\n\n{user_prompt}" if system_prompt else user_prompt
                result = await _call_gemini(
                    model=provider["model"],
                    prompt=combined,
                    json_mode=json_mode,
                )
            logger.info(f"[AIRouter] ✅ {provider['id']} succeeded on attempt {attempt}")
            return result
        except Exception as exc:
            last_exc = exc
            wait = BACKOFF_BASE ** attempt
            logger.warning(
                f"[AIRouter] ⚠️  {provider['id']} attempt {attempt}/{MAX_RETRIES} failed: {exc}. "
                f"Retrying in {wait:.0f}s..."
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(wait)

    raise last_exc


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def call_with_fallback(
    purpose: str,
    user_prompt: str,
    system_prompt: Optional[str] = None,
    json_mode: bool = False,
) -> str:
    """
    Attempt all providers in the fallback chain.
    Falls back to LRU cache, then to STATIC_FALLBACKS.

    Args:
        purpose:       "chat" | "ensemble" | "explanation"
        user_prompt:   The main message / prompt body.
        system_prompt: Optional system instruction (ignored by Gemini — merged into prompt).
        json_mode:     If True, request JSON output from provider.

    Returns:
        str — always. Never raises.
    """
    # 1. Try each provider in the chain
    for provider in PROVIDERS:
        # Skip any blocked/unstable models – they are never sent to the provider.
        if provider["model"] in BLOCKED_MODELS:
            logger.warning(f"[AIRouter] ⛔ Skipping blocked model {provider['model']} (id={provider['id']})")
            continue
        try:
            text = await _call_with_retry(
                provider=provider,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                json_mode=json_mode,
            )
            # Cache the successful result
            _cache.set(purpose, user_prompt, text)
            return text
        except Exception as exc:
            logger.error(f"[AIRouter] ❌ {provider['id']} exhausted all retries: {exc}")
            continue

    # 2. Try the LRU cache (stale but better than nothing)
    cached = _cache.get(purpose, user_prompt)
    if cached:
        logger.warning("[AIRouter] 🗄️  All providers failed. Serving cached response.")
        if purpose == "chat":
            return (
                "⚡ _AI providers are currently busy. Showing a recent response:_\n\n"
                + cached
            )
        return cached

    # 3. Guaranteed static fallback — NEVER fails
    logger.error(
        f"[AIRouter] 🚨 ALL providers failed and no cache hit for purpose={purpose}. "
        "Serving static guaranteed response."
    )
    fallback = STATIC_FALLBACKS.get(purpose, STATIC_FALLBACKS["chat"])
    if isinstance(fallback, dict):
        # ensemble returns a dict — serialise for consistency
        return json.dumps(fallback)
    return fallback


def parse_json_safe(text: str) -> Optional[dict]:
    """
    Safely parse JSON from AI response, stripping markdown fences.
    Returns None on parse failure.
    """
    if not text:
        return None
    text = text.strip()
    # Strip markdown code fences (also handles leading newline inside fence)
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):].strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error(f"[AIRouter] JSON parse failed: {exc} | text[:200]={text[:200]}")
        return None
