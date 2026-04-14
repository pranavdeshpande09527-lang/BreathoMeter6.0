/**
 * Utility functions for scoring the Health Assessment.
 * All calculations normalize to a 0-100 scale.
 */

// Normalizes a score to 0-100 inverted (higher meaning higher risk)
const normalizeRisk = (score, max) => Math.min(100, Math.max(0, (score / max) * 100))

// Normalizes a score to 0-100 standard (higher meaning healthier)
const normalizeHealth = (score, max) => Math.min(100, Math.max(0, (score / max) * 100))

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

export const getBreathingMetrics = (data) => {
    const inhaleCapacity = toNumber(data.peakInhaleAverage)
    const exhaleCapacity = toNumber(data.forcedExhaleAverage)
    const breathHoldTime = toNumber(data.breathHoldAverage)
    const signalStabilityValues = [
        toNumber(data.peakInhaleSignalStability),
        toNumber(data.forcedExhaleSignalStability),
        toNumber(data.breathHoldSignalStability),
    ].filter(value => value > 0)
    const peakAirflowValues = [
        toNumber(data.peakInhalePeakAirflow),
        toNumber(data.forcedExhalePeakAirflow),
        toNumber(data.breathHoldPeakAirflow),
    ].filter(value => value > 0)

    return {
        inhaleCapacity,
        exhaleCapacity,
        breathHoldTime,
        averageSignalStability: signalStabilityValues.length
            ? signalStabilityValues.reduce((sum, value) => sum + value, 0) / signalStabilityValues.length
            : null,
        averagePeakAirflow: peakAirflowValues.length
            ? peakAirflowValues.reduce((sum, value) => sum + value, 0) / peakAirflowValues.length
            : null,
    }
}

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

    const { inhaleCapacity, exhaleCapacity, breathHoldTime } = getBreathingMetrics(data)
    if (inhaleCapacity > 0 && inhaleCapacity < 4) risk += 12
    else if (inhaleCapacity >= 4 && inhaleCapacity < 5) risk += 6

    if (exhaleCapacity > 0 && exhaleCapacity < 3) risk += 12
    else if (exhaleCapacity >= 3 && exhaleCapacity < 4) risk += 6

    if (breathHoldTime > 0 && breathHoldTime < 15) risk += 18
    else if (breathHoldTime >= 15 && breathHoldTime < 25) risk += 8

    if (data.stairsDifficulty === 'Severe breathlessness') risk += 18
    else if (data.stairsDifficulty === 'Moderate breathlessness') risk += 10
    else if (data.stairsDifficulty === 'Slight breathlessness') risk += 4

    return Math.round(normalizeRisk(risk, 100))
}

export const calculateLungFunctionScore = (data) => {
    let score = 50 // Base score

    // SpO2
    const spo2 = toNumber(data.spO2, 98)
    if (spo2 >= 95) score += 20
    else if (spo2 >= 90) score += 10
    else score -= 20

    const {
        inhaleCapacity,
        exhaleCapacity,
        breathHoldTime,
        averageSignalStability,
    } = getBreathingMetrics(data)

    if (inhaleCapacity >= 6) score += 15
    else if (inhaleCapacity >= 4) score += 8
    else if (inhaleCapacity > 0) score -= 12

    if (exhaleCapacity >= 5) score += 15
    else if (exhaleCapacity >= 3) score += 8
    else if (exhaleCapacity > 0) score -= 12

    if (breathHoldTime >= 40) score += 20
    else if (breathHoldTime >= 25) score += 12
    else if (breathHoldTime > 0 && breathHoldTime < 15) score -= 18

    if (averageSignalStability != null) {
        if (averageSignalStability >= 92) score += 5
        else if (averageSignalStability < 80) score -= 5
    }

    if (data.stairsDifficulty === 'No breathlessness') score += 5
    else if (data.stairsDifficulty === 'Moderate breathlessness') score -= 6
    else if (data.stairsDifficulty === 'Severe breathlessness') score -= 12

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
