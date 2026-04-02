"""
Email Generator — AI-Powered HTML Email Content via Gemini
Generates professional, Apple-style HTML emails for:
  - AQI Danger Alerts  (auto-triggered when AQI > 150)
  - Health Report      (user-triggered on demand)
"""
import httpx
import logging
import os

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


def _aqi_color(aqi: int) -> str:
    if aqi <= 50:   return "#16a34a"
    if aqi <= 100:  return "#ca8a04"
    if aqi <= 150:  return "#ea580c"
    if aqi <= 200:  return "#dc2626"
    return "#7c3aed"


def _aqi_status(aqi: int) -> str:
    if aqi <= 50:   return "Good"
    if aqi <= 100:  return "Moderate"
    if aqi <= 150:  return "Unhealthy for Sensitive Groups"
    if aqi <= 200:  return "Unhealthy"
    if aqi <= 300:  return "Very Unhealthy"
    return "Hazardous"


async def _call_gemini(prompt: str) -> str:
    """Call Gemini REST API and return the generated text."""
    if not GEMINI_API_KEY:
        return ""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        logger.error(f"Gemini email generation failed: {e}")
        return ""


def _build_email_shell(title: str, accent: str, badge_text: str, body_html: str) -> str:
    """Wraps body HTML in a polished Apple-style email template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 20px;margin-bottom:16px;">
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Breathometer · Health Intelligence</span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">{title}</h1>
          <div style="display:inline-block;margin-top:14px;background:{accent};color:#fff;padding:6px 18px;border-radius:20px;font-size:13px;font-weight:700;">{badge_text}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px;">
          {body_html}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">Breathometer · AI Respiratory Health Platform</p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;">This is an automated health intelligence notification. Please consult a medical professional for clinical advice.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


async def generate_danger_email(user_name: str, aqi: int, city: str, category: str) -> str:
    """
    Generate an AI-powered AQI danger alert email.
    Returns a complete HTML string ready to send.
    """
    color = _aqi_color(aqi)

    # Ask Gemini for 3 personalised action steps
    gemini_prompt = (
        f"Write exactly 3 short, clear, actionable health precautions for someone in a city "
        f"with AQI {aqi} classified as '{category}'. "
        f"Format as plain bullet points (no markdown, no numbering). Each bullet must be under 15 words. "
        f"Be calm but urgent. Focus on immediate protective actions (e.g. wear N95 mask, stay indoors, avoid exercise)."
    )
    ai_tips = await _call_gemini(gemini_prompt)
    
    # Convert plain text bullets to HTML list items
    tips_html = ""
    if ai_tips:
        for line in ai_tips.split("\n"):
            line = line.strip().lstrip("•·-–*").strip()
            if line:
                tips_html += f'<li style="margin-bottom:10px;color:#334155;">{line}</li>'
    else:
        tips_html = """
        <li style="margin-bottom:10px;color:#334155;">Wear an N95/FFP2 mask if going outdoors.</li>
        <li style="margin-bottom:10px;color:#334155;">Keep windows and doors closed. Use an air purifier if available.</li>
        <li style="margin-bottom:10px;color:#334155;">Avoid all strenuous physical activity outdoors today.</li>
        """

    body_html = f"""
      <!-- Greeting -->
      <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Dear <strong>{user_name}</strong>,</p>
      <p style="font-size:15px;color:#475569;line-height:1.65;margin:0 0 28px;">
        Our real-time air quality monitoring has detected a <strong style="color:{color};">dangerous AQI level</strong> in your area.
        Immediate precautions are strongly recommended.
      </p>

      <!-- AQI Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:linear-gradient(135deg,{color}22 0%,{color}11 100%);border:2px solid {color};border-radius:14px;padding:24px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:12px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Current Air Quality Index</div>
                  <div style="font-size:54px;font-weight:800;color:{color};line-height:1;margin-bottom:4px;">{aqi}</div>
                  <div style="font-size:15px;font-weight:600;color:#1e293b;">{category}</div>
                  <div style="font-size:13px;color:#64748b;margin-top:4px;">📍 {city}</div>
                </td>
                <td align="right" style="vertical-align:top;">
                  <div style="font-size:48px;">🚨</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Actions -->
      <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:14px;">⚡ Immediate Actions Required</div>
        <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.7;">
          {tips_html}
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="https://breathometer6.web.app/air-quality" 
           style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
          View Live AQI Dashboard →
        </a>
      </div>
    """

    return _build_email_shell(
        title="🚨 Air Quality Danger Alert",
        accent="#dc2626",
        badge_text=f"AQI {aqi} · {category}",
        body_html=body_html,
    )


async def generate_report_email(
    user_name: str,
    aqi: int,
    city: str,
    category: str,
    health_metrics: dict | None = None,
) -> str:
    """
    Generate an AI-powered health report email.
    Returns complete HTML, ready to send.
    """
    color = _aqi_color(aqi)
    metrics = health_metrics or {}

    # Build a Gemini summary + recommendations
    context_parts = [
        f"User name: {user_name}",
        f"Current AQI: {aqi} ({category}) in {city}",
    ]
    if metrics.get("risk_score") is not None:
        context_parts.append(f"Risk score: {metrics['risk_score']}/100")
    if metrics.get("fev1") is not None:
        context_parts.append(f"FEV1: {metrics['fev1']} L")
    if metrics.get("spo2") is not None:
        context_parts.append(f"SpO2: {metrics['spo2']}%")

    gemini_prompt = (
        f"Write a concise, professional respiratory health summary for a user.\n"
        f"Context: {'; '.join(context_parts)}\n"
        f"Include: 1 sentence health status overview, then 3 personalised recommendations.\n"
        f"Format: plain text only, no markdown. Max 140 words. Warm, supportive, clinical tone."
    )
    ai_summary = await _call_gemini(gemini_prompt)
    if not ai_summary:
        ai_summary = (
            f"Your current AQI exposure of {aqi} ({category}) poses a risk to respiratory health. "
            "We recommend minimising outdoor exposure, staying well hydrated, and monitoring your breathing symptoms. "
            "Consider scheduling a breath analysis test if you experience any discomfort."
        )

    # Health metrics rows
    metric_rows = ""
    metric_data = [
        ("📍 Location", city),
        ("🌬️ AQI", f"{aqi}"),
        ("🏷️ Category", category),
    ]
    if metrics.get("risk_score") is not None:
        metric_data.append(("⚠️ Risk Score", f"{metrics['risk_score']}/100"))
    if metrics.get("fev1") is not None:
        metric_data.append(("💨 FEV1", f"{metrics['fev1']} L"))
    if metrics.get("spo2") is not None:
        metric_data.append(("❤️ SpO2", f"{metrics['spo2']}%"))

    for label, value in metric_data:
        metric_rows += f"""
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;">{label}</td>
          <td style="padding:11px 0;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">{value}</td>
        </tr>"""

    body_html = f"""
      <p style="font-size:16px;color:#1e293b;margin:0 0 20px;">Dear <strong>{user_name}</strong>,</p>
      <p style="font-size:15px;color:#475569;line-height:1.65;margin:0 0 28px;">
        Here is your personalised Breathometer health report, generated by our AI engine based on your latest environmental and clinical data.
      </p>

      <!-- Metrics Card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:0;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-size:12px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;">📊 Health Snapshot</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            {metric_rows}
          </table>
        </td></tr>
      </table>

      <!-- AQI Bar -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr><td style="background:linear-gradient(135deg,{color}15,{color}05);border:1.5px solid {color};border-radius:12px;padding:20px 24px;">
          <div style="font-size:12px;font-weight:700;color:{color};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Air Quality Index</div>
          <div style="font-size:40px;font-weight:800;color:{color};line-height:1;">{aqi}</div>
          <div style="font-size:14px;color:#475569;margin-top:4px;">{category} · {city}</div>
        </td></tr>
      </table>

      <!-- AI Insights -->
      <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
        <div style="font-size:14px;font-weight:700;color:#2563eb;margin-bottom:12px;">🤖 AI Health Insights</div>
        <p style="font-size:14px;color:#334155;line-height:1.7;margin:0;">{ai_summary}</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="https://breathometer6.web.app/dashboard"
           style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">
          Open My Dashboard →
        </a>
      </div>
    """

    return _build_email_shell(
        title="📊 Your Breathometer Health Report",
        accent="#2563eb",
        badge_text=f"AQI {aqi} · {category}",
        body_html=body_html,
    )
