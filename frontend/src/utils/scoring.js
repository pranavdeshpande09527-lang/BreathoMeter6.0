/**
 * Utility functions for scoring the Health Assessment.
 * All calculations normalize to a 0-100 scale.
 */

// Normalizes a score to 0-100 inverted (higher meaning higher risk)
const normalizeRisk = (score, max) => Math.min(100, Math.max(0, (score / max) * 100))

// Normalizes a score to 0-100 standard (higher meaning healthier)
const normalizeHealth = (score, max) => Math.min(100, Math.max(0, (score / max) * 100))

export const calculateRespiratoryRisk = (data) => {
    let risk = 0
    // Step 2 factors
    if (data.sob === 'Even while resting') risk += 30
    else if (data.sob === 'During light activity') risk += 20
    else if (data.sob === 'During moderate activity') risk += 10

    if (data.coughDuration === '> 3 weeks') risk += 15
    if (data.wheezing === 'Constantly') risk += 15
    if (data.chestTightness === 'Severe frequent episodes') risk += 15

    // Step 4 factors
    // Base symptom severity penalties
    risk += (data.breathlessnessSev || 0) * 3
    risk += (data.coughSev || 0) * 2
    risk += (data.chestPain || 0) * 3
    risk += (data.fatigue || 0) * 1
    risk += (data.fever || 0) * 2

    // Evaluate duration multiplier / extra risk based on how long symptoms persist
    const addDurationRisk = (sevKey, daysKey, maxRisk) => {
        const sev = Number(data[sevKey]) || 0
        const days = Number(data[daysKey]) || 0
        if (sev > 0 && days > 7) {
            // Cap the added risk so long durations don't completely blow out the score
            risk += Math.min(maxRisk, days)
        }
    }

    addDurationRisk('coughSev', 'coughSevDays', 10)
    addDurationRisk('breathlessnessSev', 'breathlessnessSevDays', 15)
    addDurationRisk('chestPain', 'chestPainDays', 15)
    addDurationRisk('fever', 'feverDays', 10)

    return Math.round(normalizeRisk(risk, 100))
}

export const calculateLungFunctionScore = (data) => {
    let score = 50 // Base score

    // SpO2
    const spo2 = Number(data.spO2) || 98
    if (spo2 >= 95) score += 20
    else if (spo2 >= 90) score += 10
    else score -= 20

    // Breath hold (Lung Capacity)
    const hold = Number(data.breathHoldAverage) || 30
    if (hold > 45) score += 30
    else if (hold > 30) score += 15
    else if (hold < 15) score -= 25

    return Math.round(normalizeHealth(score, 100))
}

export const calculateEnvironmentalRisk = (data) => {
    let risk = 0

    // Step 7
    if (data.workEnv === 'Industrial' || data.workEnv === 'Dusty environment') risk += 20
    if (data.chemicalExp === 'Frequent') risk += 30
    else if (data.chemicalExp === 'Occasional') risk += 10

    const outdoorHours = Number(data.outdoorHours) || 0
    if (outdoorHours > 4) risk += 10

    // Step 6 (Smoking heavily affects environmental/internal risk)
    if (data.smoking === 'Current') risk += 30
    else if (data.smoking === 'Former') risk += 10

    return Math.round(normalizeRisk(risk, 100))
}

export const calculateOverallHealthScore = (data) => {
    // A composite score blending risk and function. High is healthier.
    const rr = calculateRespiratoryRisk(data)
    const lf = calculateLungFunctionScore(data)
    const er = calculateEnvironmentalRisk(data)

    let score = 100

    score -= (rr * 0.3)
    score -= ((100 - lf) * 0.3)
    score -= (er * 0.2)

    // Penalize for BMI extremes
    const bmi = Number(data.bmi) || 22
    if (bmi > 30 || bmi < 18.5) score -= 10

    // Penalize for medical history
    const history = data.conditions || []
    score -= (history.length * 5)

    return Math.round(normalizeHealth(score, 100))
}
