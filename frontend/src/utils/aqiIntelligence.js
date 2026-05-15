/**
 * aqiIntelligence.js — Phase 7: AI-Powered Contextual Health Insights
 *
 * Rule-based health guidance engine driven by:
 *   - Real-time AQI value
 *   - User respiratory conditions (asthma, COPD, etc.)
 *   - Pollutant sub-readings (PM2.5, Ozone, UV)
 *   - Time of day (morning exercise advisory)
 *
 * Returns a structured insight object for the Health Intelligence Panel.
 */

/* ── AQI Category thresholds (EPA standard) ──────────────────────── */
export const AQI_BANDS = [
  { max: 50,  label: 'Good',                     severity: 0, color: '#22c55e', bg: 'rgba(34,197,94,0.10)' },
  { max: 100, label: 'Moderate',                 severity: 1, color: '#eab308', bg: 'rgba(234,179,8,0.10)' },
  { max: 150, label: 'Unhealthy for Sensitive',  severity: 2, color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  { max: 200, label: 'Unhealthy',                severity: 3, color: '#ef4444', bg: 'rgba(239,68,68,0.10)' },
  { max: 300, label: 'Very Unhealthy',           severity: 4, color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
  { max: Infinity, label: 'Hazardous',           severity: 5, color: '#dc2626', bg: 'rgba(127,29,29,0.18)' },
]

export function getAQIBand(aqi) {
  return AQI_BANDS.find(b => aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1]
}

/* ── Condition-aware insight rules ───────────────────────────────── */
const RULES = [
  // Severity 5 — Hazardous (everyone)
  {
    match: ({ severity }) => severity >= 5,
    conditions: null,
    icon: '🚨',
    headline: 'Hazardous Air Quality — Stay Indoors',
    body: 'AQI is in the hazardous range. Outdoor exposure causes serious health effects for everyone. Keep windows closed, run air purifiers on maximum, and postpone all outdoor activities.',
    action: 'Avoid all outdoor activity · Run HEPA air purifier · Take prescribed rescue medication',
    urgency: 'critical',
  },

  // Severity 4 — Very Unhealthy (everyone)
  {
    match: ({ severity }) => severity >= 4,
    conditions: null,
    icon: '⚠️',
    headline: 'Very Unhealthy Air — Limit All Outdoor Exposure',
    body: 'Air quality is very unhealthy. Health warnings are in effect for the entire population. Avoid prolonged exertion outdoors and wear an N95 mask if going outside is unavoidable.',
    action: 'Limit outdoor time · Wear N95 mask · Check medication supply',
    urgency: 'high',
  },

  // Severity 3 — Unhealthy + sensitive conditions
  {
    match: ({ severity, conditions }) => severity >= 3 && conditions?.some(c => ['asthma','copd','bronchitis'].includes(c.toLowerCase())),
    icon: '🫁',
    headline: 'Unhealthy Air — Respiratory Risk Elevated',
    body: 'With your respiratory condition, today\'s air quality significantly increases your risk of a flare-up. Keep your rescue inhaler within reach and monitor your peak flow readings closely.',
    action: 'Keep rescue inhaler accessible · Monitor SpO₂ · Inform your care team if symptoms worsen',
    urgency: 'high',
  },

  // Severity 3 — Unhealthy (general)
  {
    match: ({ severity }) => severity >= 3,
    conditions: null,
    icon: '😷',
    headline: 'Unhealthy Air — Sensitive Groups at Risk',
    body: 'Unhealthy air quality detected. Sensitive groups including children, elderly, and those with respiratory or heart conditions should avoid outdoor exertion.',
    action: 'Limit outdoor activity · Keep windows closed · Stay hydrated',
    urgency: 'medium',
  },

  // Severity 2 — USG + sensitive conditions (morning exercise warning)
  {
    match: ({ severity, conditions, hour }) => severity >= 2 && (conditions?.length > 0) && (hour >= 5 && hour <= 9),
    icon: '🌅',
    headline: 'Skip Morning Outdoor Exercise Today',
    body: 'Air quality is unhealthy for sensitive groups, and early morning ozone concentrations are typically higher. Consider indoor exercise alternatives until conditions improve after midday.',
    action: 'Exercise indoors · Check AQI again after 12PM · Use peak flow meter before any outdoor activity',
    urgency: 'medium',
  },

  // Severity 2 — USG + asthma/COPD
  {
    match: ({ severity, conditions }) => severity >= 2 && conditions?.some(c => ['asthma','copd'].includes(c.toLowerCase())),
    icon: '💨',
    headline: 'Elevated Ozone Risk for Asthma/COPD',
    body: 'Current PM2.5 and ozone levels may trigger respiratory symptoms. Consider using a bronchodilator before any outdoor activity and carry your inhaler at all times today.',
    action: 'Pre-medicate before outdoor activity · Avoid high-traffic areas · Check forecast for afternoon improvement',
    urgency: 'medium',
  },

  // High UV
  {
    match: ({ uvIndex }) => uvIndex >= 8,
    conditions: null,
    icon: '☀️',
    headline: 'Very High UV Index',
    body: `UV index is ${'>'}8 — very high. Prolonged sun exposure increases oxidative stress, which can worsen respiratory inflammation. Wear sunscreen and seek shade between 10AM–4PM.`,
    action: 'Use SPF 50+ sunscreen · Wear sunglasses · Limit midday outdoor time',
    urgency: 'low',
  },

  // High PM2.5 alone
  {
    match: ({ pm25 }) => pm25 >= 35,
    conditions: null,
    icon: '🔬',
    headline: 'PM2.5 Above Safe Threshold',
    body: 'Fine particulate matter (PM2.5) exceeds 35 μg/m³, the WHO 24-hour guideline. These particles penetrate deep into lung tissue. Reduce outdoor time and run indoor air filtration.',
    action: 'Run HEPA air purifier · Avoid vigorous outdoor exercise · Monitor for coughing or shortness of breath',
    urgency: 'medium',
  },

  // Severity 1 — Moderate + sensitive conditions
  {
    match: ({ severity, conditions }) => severity >= 1 && conditions?.some(c => ['asthma','copd','bronchitis','allergies'].includes(c.toLowerCase())),
    icon: '📋',
    headline: 'Moderate Air — Monitor Your Symptoms',
    body: 'Air quality is moderate. While generally acceptable, your respiratory condition may make you sensitive to pollutant spikes. Carry your rescue medication and watch for early symptom signs.',
    action: 'Carry inhaler · Avoid high-traffic routes · Check AQI before outdoor plans',
    urgency: 'low',
  },

  // Severity 0 — Good
  {
    match: ({ severity }) => severity === 0,
    conditions: null,
    icon: '✅',
    headline: 'Excellent Air Quality Today',
    body: 'Air quality is rated Good. No health restrictions. This is an ideal day for outdoor exercise, breathing exercises, and respiratory therapy sessions.',
    action: 'Great day for outdoor breathing exercises · Recommended for pulmonary rehab walks',
    urgency: 'none',
  },

  // Default fallback
  {
    match: () => true,
    conditions: null,
    icon: '🌤️',
    headline: 'Moderate Air Quality',
    body: 'Air quality is acceptable for most people. Unusually sensitive individuals may experience minor effects from some pollutants.',
    action: 'No specific restrictions — monitor if symptoms develop',
    urgency: 'none',
  },
]

/**
 * getAQIInsight — main insight generator
 *
 * @param {object} params
 * @param {number}   params.aqi          - US AQI (0–500)
 * @param {string[]} params.conditions   - ['asthma', 'copd', 'allergies', etc.]
 * @param {number}   params.pm25         - PM2.5 μg/m³
 * @param {number}   params.ozone        - Ozone μg/m³
 * @param {number}   params.uvIndex      - UV index (0–11+)
 * @returns {object} insight             - { icon, headline, body, action, urgency, band }
 */
export function getAQIInsight({ aqi = 0, conditions = [], pm25 = 0, ozone = 0, uvIndex = 0 } = {}) {
  const band = getAQIBand(aqi)
  const hour = new Date().getHours()

  const ctx = {
    aqi,
    severity: band.severity,
    conditions,
    pm25,
    ozone,
    uvIndex,
    hour,
  }

  const rule = RULES.find(r => r.match(ctx)) || RULES[RULES.length - 1]

  return {
    icon: rule.icon,
    headline: rule.headline,
    body: rule.body,
    action: rule.action,
    urgency: rule.urgency,   // 'critical' | 'high' | 'medium' | 'low' | 'none'
    band,
    aqi,
  }
}

/* ── Urgency → visual treatment mapping ─────────────────────────── */
export const URGENCY_STYLES = {
  critical: { border: 'var(--color-danger)',    bg: 'rgba(220,38,38,0.08)',  badge: '#ef4444', label: 'CRITICAL' },
  high:     { border: '#f97316',                bg: 'rgba(249,115,22,0.08)', badge: '#f97316', label: 'HIGH' },
  medium:   { border: '#eab308',                bg: 'rgba(234,179,8,0.07)',  badge: '#eab308', label: 'ADVISORY' },
  low:      { border: 'var(--color-primary)',    bg: 'rgba(37,99,235,0.06)', badge: '#60a5fa', label: 'INFO' },
  none:     { border: 'var(--color-safe)',       bg: 'rgba(22,163,74,0.06)', badge: '#22c55e', label: 'CLEAR' },
}
