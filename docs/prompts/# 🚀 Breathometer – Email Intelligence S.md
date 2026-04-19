# 🚀 Breathometer – Email Intelligence System Integration Prompt

## 🎯 Objective

Implement a **smart email notification system** that:

1. Sends **automatic alerts** when user enters a **dangerous AQI zone**
2. Allows **manual email sending** of a **health report**
3. Uses **AI (Gemini API)** to generate **clean, human-like, personalized email content**
4. Integrates with **AQI Map API** for real-time environmental risk detection

---

# 🧩 PHASE 1: Backend Email Infrastructure (Resend)

## Tasks

* Integrate Resend using provided API key
* Create reusable email service module

## Requirements

* Use environment variable:
  `RESEND_API_KEY`
* Create module:

`/services/emailService.js`

## Function

* `sendEmail(to, subject, htmlContent)`

## Constraints

* Use `onboarding@resend.dev` (free tier sender)
* Ensure async/await + proper error handling

---

# 🌍 PHASE 2: AQI Detection System (Location-Based Risk Engine)

## Tasks

* Fetch user's **real-time location (lat, lon)**
* Integrate AQI API (OpenWeather / WAQI / Google AQI)

## Logic

* Get AQI value
* Classify:

| AQI Range | Status                  |
| --------- | ----------------------- |
| 0–50      | Safe                    |
| 51–100    | Moderate                |
| 101–150   | Unhealthy for sensitive |
| 151–200   | Unhealthy ⚠️            |
| 200+      | Dangerous 🚨            |

## Trigger Condition

* If AQI > 150 → mark as **Danger Zone**

## Output

```json
{
  "aqi": 178,
  "status": "Danger",
  "city": "Current Location"
}
```

---

# 🚨 PHASE 3: Automatic Danger Alert Email

## Trigger

* When user enters **Danger Zone**

## Flow

1. Detect AQI breach
2. Generate email content via Gemini API
3. Send email via Resend

## Gemini Prompt

Generate a **professional health warning email** including:

* User safety alert
* AQI value + risk explanation
* Health precautions
* Calm but urgent tone

## Email Structure

* Subject: 🚨 Air Quality Alert – Immediate Attention Required
* Content:

  * Personalized greeting
  * AQI warning
  * Action steps (mask, stay indoors, avoid exercise)

---

# 📊 PHASE 4: Manual Health Report Email

## Feature

* Button: **"Send Health Report"**

## Flow

1. User clicks button
2. Backend collects:

   * AQI data
   * User health metrics (if available)
3. Gemini generates:

   * Clean report summary
   * Insights + suggestions

## Email Content

* Subject: 📊 Your Breathometer Health Report
* Include:

  * AQI exposure summary
  * Risk level
  * Recommendations

---

# 🤖 PHASE 5: AI Email Generation (Gemini Integration)

## Tasks

* Use provided Gemini API key

## Functions

* `generateDangerEmail(data)`
* `generateReportEmail(data)`

## Output Format

* HTML email (modern UI style)
* Structured sections:

  * Header
  * Data card
  * Recommendations
  * Footer

## Style Guidelines

* Clean, minimal, Apple-level UI
* Use:

  * Soft gradients
  * Card layout
  * Proper spacing
  * Highlight AQI severity

---

# 🔌 PHASE 6: Frontend Integration

## Features

* Auto-trigger system (background AQI check)
* Button for manual report sending

## UI Requirements

* Modern dashboard style (DO NOT change existing theme)
* Add:

  * AQI indicator (color-based)
  * “Send Report” CTA button

## States

* Loading
* Success (Email Sent ✅)
* Error

---

# 🔄 PHASE 7: Automation & Optimization

## Add

* Debounce AQI checks (avoid spam)
* Email cooldown:

  * Send alert only once per danger session

## Optional (Advanced)

* Queue system (BullMQ)
* Background jobs (cron)

---

# 🔐 PHASE 8: Security & Best Practices

* Never expose API keys in frontend
* Validate user email
* Add rate limiting
* Log email delivery status

---

# ⚡ FINAL OUTPUT EXPECTATION

System should:
✔ Automatically detect dangerous AQI
✔ Send AI-generated alert email instantly
✔ Allow user-triggered health report email
✔ Maintain clean UI + smooth UX
✔ Follow modern scalable architecture

---

# 🚫 STRICT RULES

* DO NOT change existing UI theme
* DO NOT overcomplicate logic
* Focus on ONE feature per implementation step
* Maintain modular, scalable code structure

---

# 🧠 DESIGN INSPIRATION

Take reference from:

* Apple Health
* Tesla Dashboard
* Modern AI SaaS dashboards

Focus on:
**Clarity + Depth + Intelligence + Minimalism**
