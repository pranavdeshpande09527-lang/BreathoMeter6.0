/**
 * intelligence.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Perceived Intelligence Layer — converts raw data into human, contextual insight.
 * Used across PatientDashboard, RiskAnalysis, and DoctorRecommendations.
 *
 * Design principles:
 *  - Doctor-like tone: calm, confident, specific
 *  - Never alarmist, never vague
 *  - Short (1–2 lines max per insight)
 *  - Always guides toward the next step
 */

// ── AQI Intelligence ───────────────────────────────────────────────────────────

export function getAqiContext(aqi) {
    if (aqi == null) return null
    if (aqi <= 50)  return {
        headline: 'Air quality is excellent today.',
        meaning:  'The air around you poses no risk to your respiratory health.',
        action:   'Safe for all outdoor activities — enjoy the day.',
        tone:     'safe',
    }
    if (aqi <= 100) return {
        headline: 'Air quality is acceptable.',
        meaning:  'Sensitive individuals may notice mild discomfort during extended outdoor exposure.',
        action:   'If you have asthma or allergies, limit prolonged outdoor activity.',
        tone:     'moderate',
    }
    if (aqi <= 150) return {
        headline: 'Air quality is mildly elevated.',
        meaning:  'Particulate levels may irritate your airways, especially if you have a respiratory condition.',
        action:   'Consider wearing a mask outdoors. Reduce strenuous exercise outside.',
        tone:     'warning',
    }
    if (aqi <= 200) return {
        headline: 'Elevated pollution detected in your area.',
        meaning:  'Current AQI levels can worsen existing respiratory conditions and should not be ignored.',
        action:   'Stay indoors when possible. Use air purifiers. Consult your doctor if symptoms appear.',
        tone:     'danger',
    }
    if (aqi <= 300) return {
        headline: 'Air quality is very poor right now.',
        meaning:  'These levels are unhealthy for everyone — not just those with pre-existing conditions.',
        action:   'Avoid all outdoor exposure. Keep windows closed. Seek medical advice if breathing feels difficult.',
        tone:     'danger',
    }
    return {
        headline: 'Hazardous air quality detected.',
        meaning:  'Immediate health risk. Everyone in the area is affected.',
        action:   'Do not go outdoors. Wear N95 mask if you must leave. Contact your doctor immediately.',
        tone:     'danger',
    }
}

// ── Health Score Intelligence ──────────────────────────────────────────────────

export function getHealthScoreContext(score) {
    if (score == null) return null
    if (score >= 85) return {
        headline: `Your health score is excellent.`,
        meaning:  'Your current respiratory indicators are in a strong, healthy range.',
        action:   'Maintain your current habits — you\'re doing well.',
    }
    if (score >= 70) return {
        headline: 'Your health is in a good range.',
        meaning:  'Minor areas of caution detected — nothing urgent, but worth tracking.',
        action:   'Complete a new analysis to monitor any changes over time.',
    }
    if (score >= 50) return {
        headline: 'Moderate health indicators detected.',
        meaning:  'Your score suggests areas that could benefit from attention or a clinical check.',
        action:   'Run a breath analysis and review your risk report for specific guidance.',
    }
    return {
        headline: 'Your score requires attention.',
        meaning:  'Several health indicators are below optimal range and warrant a clinical review.',
        action:   'We recommend scheduling a consultation with a specialist soon.',
    }
}

// ── Breath Quality Intelligence ────────────────────────────────────────────────

export function getBreathQualityContext(score) {
    if (score == null) return { short: 'No test data yet', sub: 'Run a breath analysis to see your score' }
    if (score >= 85)  return { short: 'Excellent lung function', sub: 'Your breathing scores are in the top range' }
    if (score >= 75)  return { short: 'Good breath quality', sub: 'Within normal, healthy parameters' }
    if (score >= 60)  return { short: 'Mild variation detected', sub: 'Some sessions fell below the optimal range' }
    return              { short: 'Low breath quality score', sub: 'Consider a clinical evaluation for your airways' }
}

// ── Risk Level Intelligence ────────────────────────────────────────────────────

export function getRiskLevelContext(riskPct) {
    if (riskPct == null) return { short: 'No risk data yet', sub: 'Complete an assessment to see your risk level' }
    if (riskPct < 25)   return { short: 'Low risk detected', sub: 'No urgent clinical concerns identified' }
    if (riskPct < 50)   return { short: 'Moderate risk — monitor closely', sub: 'Early awareness can prevent escalation' }
    if (riskPct < 75)   return { short: 'Elevated risk — action advised', sub: 'A specialist consultation is recommended' }
    return                     { short: 'High risk — prompt review needed', sub: 'Please consult a doctor at the earliest' }
}

// ── Temperature / Weather Intelligence ────────────────────────────────────────

export function getTempContext(tempC) {
    if (tempC == null) return { short: 'Not available', sub: 'Enable location for live weather data' }
    if (tempC < 10)   return { short: `${Math.round(tempC)}°C — Cold conditions`, sub: 'Cold air can irritate sensitive airways' }
    if (tempC <= 25)  return { short: `${Math.round(tempC)}°C — Comfortable range`, sub: 'Ideal outdoor conditions for breathing' }
    if (tempC <= 35)  return { short: `${Math.round(tempC)}°C — Warm conditions`, sub: 'Stay hydrated; heat can worsen lung irritation' }
    return                   { short: `${Math.round(tempC)}°C — Very hot`, sub: 'Avoid strenuous outdoor activity in this heat' }
}

export function getHumidityContext(pct) {
    if (pct == null) return { short: 'Not available', sub: 'Enable location for live data' }
    if (pct < 25)   return { short: `${Math.round(pct)}% — Very dry air`, sub: 'Low humidity can dry out airways and worsen symptoms' }
    if (pct <= 50)  return { short: `${Math.round(pct)}% — Optimal humidity`, sub: 'Ideal range for comfortable breathing' }
    if (pct <= 70)  return { short: `${Math.round(pct)}% — Humid conditions`, sub: 'High humidity may trigger breathing discomfort in some people' }
    return                 { short: `${Math.round(pct)}% — Very humid`, sub: 'Mold and allergens can accumulate at these levels' }
}

// ── Risk Analysis Intelligence ─────────────────────────────────────────────────

export function getRiskScoreNarrative(score, category) {
    if (score == null) return null
    const cat = (category || '').toLowerCase()
    if (score < 35 || cat.includes('low')) return {
        headline: 'You\'re in a reassuring range.',
        meaning:  'Current indicators show no signs of significant respiratory risk.',
        next:     'Maintain your healthy habits and check back after your next breath test.',
    }
    if (score < 65 || cat.includes('moderate')) return {
        headline: 'Moderate risk detected — early awareness is key.',
        meaning:  'Some clinical patterns suggest elevated vulnerability. This is manageable with the right steps.',
        next:     'Review the conditions below and consider a specialist check-up in the next few weeks.',
    }
    return {
        headline: 'Elevated risk — a clinical review is advised.',
        meaning:  'Your indicators suggest respiratory patterns that warrant prompt professional attention.',
        next:     'We strongly recommend booking a consultation with a specialist as soon as possible.',
    }
}

export function getDiseaseInterpretation(disease, riskPct, severity) {
    const riskLabel = riskPct > 60 ? 'a high probability' : riskPct > 30 ? 'a moderate probability' : 'a lower probability'
    const sevText   = severity === 'high' ? 'This condition carries a high severity classification and should not be overlooked.' 
                    : severity === 'moderate' ? 'This is a moderate-severity condition that benefits from early attention.'
                    : 'This is a lower-severity finding — monitoring is sufficient for now.'
    return {
        what:  `Our model identified ${riskLabel} of ${disease} based on your symptom and biometric profile.`,
        why:   sevText,
        next:  severity === 'high' 
            ? 'Schedule a specialist consultation promptly. Do not rely solely on this AI assessment for treatment decisions.' 
            : 'Monitor symptoms and consider a clinical check-up to confirm or rule out this condition.',
    }
}

export function getDoctorRecommendationNarrative(tier, specialty, disease) {
    if (tier?.tier === 'low') return {
        headline: 'A general overview is the best first step.',
        reasoning: 'Because the model identified multiple possible conditions, a General Physician is best positioned to conduct a comprehensive evaluation and refer you to the right specialist if needed.',
        cta: 'Find a General Physician',
    }
    if (tier?.tier === 'moderate') return {
        headline: `A ${specialty} can help narrow things down.`,
        reasoning: `Your assessment points to a cluster of related conditions. A ${specialty} has the clinical expertise to evaluate these patterns and provide a diagnosis.`,
        cta: `Find a ${specialty}`,
    }
    return {
        headline: `A ${specialty} is the right next step.`,
        reasoning: `Based on the primary predicted condition (${disease}), a ${specialty} specialising in respiratory health is best equipped to assess and manage your care.`,
        cta: `Find a ${specialty}`,
    }
}

// ── Trend Intelligence ─────────────────────────────────────────────────────────

export function getBreathTrendContext(trendData) {
    if (!trendData || trendData.length < 2) return null
    const scores = trendData.map(d => d.score)
    const avg    = scores.reduce((a, b) => a + b, 0) / scores.length
    const last   = scores[scores.length - 1]
    const first  = scores[0]
    const delta  = last - first

    if (delta > 8)  return `Trending upward — your breath quality has improved ${Math.round(delta)} points this week.`
    if (delta < -8) return `Declining trend detected — breath quality dropped ${Math.round(Math.abs(delta))} points this week. Consider a new assessment.`
    if (avg >= 75)  return 'Stable and healthy — your breath quality has been consistent this week.'
    return 'Mild fluctuation observed — tracking over the next few days will clarify the pattern.'
}

// ── Doctor Card Intelligence ───────────────────────────────────────────────────

export function getDoctorMatchReason(doctor, disease) {
    const exp = doctor.experience
    const score = Math.round((doctor.score ?? 0) * 100)
    if (score >= 85) return `Highly matched for ${disease} based on specialty and clinical profile.`
    if (score >= 65) return `Good clinical fit for ${disease || 'your condition'} — ${exp}+ years of relevant experience.`
    return `${exp}+ years of experience in ${doctor.specialty || 'respiratory medicine'}.`
}
