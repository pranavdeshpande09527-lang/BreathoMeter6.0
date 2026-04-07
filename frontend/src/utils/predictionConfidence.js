/**
 * predictionConfidence.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised confidence-aware prediction utilities.
 * All threshold logic lives here so frontend components stay clean.
 */

// ── Thresholds ────────────────────────────────────────────────────────────────
export const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.80,    // >= 80 % → high confidence
    MODERATE: 0.60 // >= 60 % → moderate; < 60 % → low
}

/**
 * Returns a tier object describing the confidence level.
 * @param {number} confidence  0–1 float from the backend
 * @returns {{ tier: 'high'|'moderate'|'low', label: string, color: string, emoji: string }}
 */
export function getConfidenceTier(confidence) {
    if (confidence == null) {
        return { 
            tier: 'low', 
            label: 'Unknown Confidence', 
            color: '#6b7280', 
            cssVar: 'var(--color-muted)',
            emoji: '⚪',
            showSingleDisease: false,
            showSpecialists: false,
            maxDiseases: 3
        }
    }

    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
        return {
            tier: 'high',
            label: 'High Confidence',
            color: '#16a34a',   // green
            cssVar: 'var(--color-safe)',
            emoji: '🟢',
            showSingleDisease: false, // Changed to false to show list
            showSpecialists: true,
            maxDiseases: 5 // Increased from 1 to 5
        }
    }
    if (confidence >= CONFIDENCE_THRESHOLDS.MODERATE) {
        return {
            tier: 'moderate',
            label: 'Moderate Confidence',
            color: '#d97706',   // amber
            cssVar: 'var(--color-warning)',
            emoji: '🟡',
            showSingleDisease: false,
            showSpecialists: true,
            maxDiseases: 5 // Increased from 3 to 5
        }
    }
    return {
        tier: 'low',
        label: 'Low Confidence',
        color: '#dc2626',   // red
        cssVar: 'var(--color-danger)',
        emoji: '🔴',
        showSingleDisease: false,
        showSpecialists: false,
        maxDiseases: 5 // Increased from 3 to 5
    }
}

// ── Disease → Specialisation Map ─────────────────────────────────────────────
const DISEASE_SPECIALTY_MAP = {
    // Respiratory
    'asthma':                      'Pulmonologist',
    'chronic obstructive pulmonary disease': 'Pulmonologist',
    'copd':                        'Pulmonologist',
    'pneumonia':                   'Pulmonologist',
    'bronchitis':                  'Pulmonologist',
    'emphysema':                   'Pulmonologist',
    'pulmonary fibrosis':          'Pulmonologist',
    'lung cancer':                 'Oncologist',
    'tuberculosis':                'Pulmonologist',
    'pleural effusion':            'Pulmonologist',
    'respiratory tract infection': 'Pulmonologist',
    // Cardiovascular
    'ischemic heart disease':      'Cardiologist',
    'hypertension':                'Cardiologist',
    'heart failure':               'Cardiologist',
    'coronary artery disease':     'Cardiologist',
    'arrhythmia':                  'Cardiologist',
    'atherosclerosis':             'Cardiologist',
    'myocardial infarction':       'Cardiologist',
    'stroke':                      'Neurologist',
    // ENT / Allergy
    'allergic rhinitis':           'ENT Specialist',
    'sinusitis':                   'ENT Specialist',
    'rhinitis':                    'ENT Specialist',
    // Neurological
    'headache':                    'Neurologist',
    'migraine':                    'Neurologist',
    // Infections
    'influenza':                   'General Physician',
    'covid':                       'Pulmonologist',
    'upper respiratory infection': 'General Physician',
}

const FALLBACK_SPECIALTY = 'General Physician'

/**
 * Map a disease name to its recommended specialisation.
 * Case-insensitive, partial-match friendly.
 */
export function getSpecialty(diseaseName) {
    if (!diseaseName) return FALLBACK_SPECIALTY
    const lc = diseaseName.toLowerCase().trim()
    // Exact lookup first
    if (DISEASE_SPECIALTY_MAP[lc]) return DISEASE_SPECIALTY_MAP[lc]
    // Partial match
    for (const [key, spec] of Object.entries(DISEASE_SPECIALTY_MAP)) {
        if (lc.includes(key) || key.includes(lc)) return spec
    }
    return FALLBACK_SPECIALTY
}

/**
 * Given an array of disease_risks, derive the recommended specialty taking
 * confidence into account.
 * @param {Array}  diseaseRisks  [{disease, risk_percentage, reason}]
 * @param {number} confidence    0–1 float
 */
export function getRecommendedSpecialty(diseaseRisks, confidence) {
    const tier = getConfidenceTier(confidence)
    if (tier.tier === 'low') return FALLBACK_SPECIALTY  // always GP for low confidence

    if (!diseaseRisks || diseaseRisks.length === 0) return FALLBACK_SPECIALTY

    // Top disease
    const sorted = [...diseaseRisks].sort((a, b) => b.risk_percentage - a.risk_percentage)
    const topDisease = sorted[0]?.disease
    const specialty = getSpecialty(topDisease)

    // If moderate, check if top 2-3 share a common specialty
    if (tier.tier === 'moderate') {
        const topThree = sorted.slice(0, 3).map(d => getSpecialty(d.disease))
        const freq = {}
        topThree.forEach(s => { freq[s] = (freq[s] || 0) + 1 })
        const common = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
        if (common && common[1] >= 2) return common[0]  // majority specialty
    }

    return specialty
}

/**
 * Returns diseases to display based on confidence tier.
 * @param {Array}  diseaseRisks  sorted by risk_percentage desc
 * @param {number} confidence    0–1 float
 */
export function getDisplayDiseases(diseaseRisks, confidence) {
    if (!diseaseRisks || diseaseRisks.length === 0) return []
    const tier = getConfidenceTier(confidence)
    const sorted = [...diseaseRisks].sort((a, b) => b.risk_percentage - a.risk_percentage)
    return sorted.slice(0, tier.maxDiseases)
}

/**
 * Returns the improvement suggestion message if confidence is low.
 * @param {number} confidence  0–1 float
 */
export function getImprovementSuggestion(confidence) {
    if (confidence == null || confidence >= CONFIDENCE_THRESHOLDS.MODERATE) return null
    return "Prediction confidence is low. Please provide more symptoms for better accuracy."
}

/**
 * Format a 0–1 confidence float as a percentage string.
 */
export function formatConfidence(confidence) {
    if (confidence == null) return 'N/A'
    return `${Math.round(confidence * 100)}%`
}
