/**
 * Clinical Intelligence Narrator
 * Translates raw metrics into empathetic, actionable insights.
 */

export const getAQIInsight = (aqi) => {
  if (aqi <= 50) return {
    status: 'Optimal',
    interpretation: 'Air quality is at peak levels for lung recovery.',
    advice: 'Perfect time for deep-breathing exercises or outdoor activities.'
  };
  if (aqi <= 100) return {
    status: 'Fair',
    interpretation: 'Environmental irritants are present but within safety limits.',
    advice: 'Try to keep windows closed if you have existing asthma symptoms.'
  };
  if (aqi <= 150) return {
    status: 'Compromised',
    interpretation: 'Elevated particle density detected. May cause mild airway inflammation.',
    advice: 'Avoid heavy exertion outdoors today. Keep rescue inhalers accessible.'
  };
  return {
    status: 'High Risk',
    interpretation: 'Critical levels of environmental toxins identified.',
    advice: 'STAY INDOORS. Use air purification systems at maximum setting.'
  };
};

export const getLungRiskInsight = (riskScore) => {
  if (riskScore < 20) return {
    level: 'Healthy Baseline',
    insight: 'Your respiratory markers show strong adaptive capacity.',
    summary: 'The AI model detects no significant deviation from your healthy baseline.'
  };
  if (riskScore < 50) return {
    level: 'Early Warning',
    insight: 'Minor irregularities detected in airflow patterns.',
    summary: 'While current risk is low, we recommend monitoring for short-term breathlessness.'
  };
  return {
    level: 'Clinical Variance',
    insight: 'Significant deviation from normal respiratory patterns identified.',
    summary: 'The intelligence engine suggests scheduling a specialist review within 48 hours.'
  };
};

/**
 * Vital Interpretation: FVC, FEV1, PEF
 */
export const getPulmonaryInsight = (metric, value, percentPredicted = 100) => {
  const m = metric.toUpperCase();
  if (percentPredicted >= 80) return {
    status: 'Optimal',
    interpretation: `${m} reflects high-capacity lung elastic recoil.`,
    advice: "Continue maintaining current physical activity levels."
  };
  if (percentPredicted >= 70) return {
    status: 'Mild Restriction',
    interpretation: `${m} shows initial signs of reduced compliance.`,
    advice: "Practice diaphragmatic breathing to stabilize airway pressure."
  };
  if (percentPredicted >= 50) return {
    status: 'Moderate Impairment',
    interpretation: `Clinical evidence of significant ${m} obstruction.`,
    advice: "Consult your specialist for a preventative therapy update."
  };
  return {
    status: 'Severe Risk',
    interpretation: `Acute ${m} reduction detected. Respiratory failure risk is elevated.`,
    advice: "IMMEDIATE medical consultation is recommended."
  };
};

export const getVitalInsight = (metric, value) => {
  if (metric === 'spo2') {
    if (!value) return "Oxygen saturation status: Pending clinical reading.";
    if (value >= 96) return "Oxygen saturation is optimal (96-100%). Heart-lung synchronization is excellent.";
    if (value >= 92) return "Oxygen levels are within acceptable but lower range. Monitor for nocturnal symptoms.";
    return "Caution: Blood oxygenation is below 92%. Critical threshold reached.";
  }
  if (metric === 'heartRate') {
    if (!value) return "Heart rate status: Baseline monitoring active.";
    if (value < 60) return "Athletic/Resting bradycardia detected. Ensure no dizziness is present.";
    if (value <= 100) return "Normal resting heart rate (60-100 bpm). Cardiovascular tone is stable.";
    return "Tachycardia (100+ bpm) detected. Check for fever or anxiety triggers.";
  }
  return "";
};

/**
 * Composite Patient Summary Hook
 */
export const generateHeroHook = (data) => {
  const { aqi, healthScore, riskScore, riskLevel } = data;
  const risk = riskScore ?? riskLevel; // Handle both naming styles
  
  if (aqi > 150) return "Critical alert: Industrial irritants are elevated. Avoid all outdoor exertion; secure clinical-grade air filtration.";
  if (risk > 50) return "High clinical variance identified in respiratory patterns. Your model suggests proactive medical review.";
  if (healthScore > 92 && (aqi < 50 || aqi === undefined)) return "Your lung intelligence baseline is at its peak. Optimal conditions for endurance training or deep recovery.";
  if (risk < 20 && healthScore > 80) return "Both baseline capacity and reactive risk scores are stable. Continue current pulmonary health regimen.";
  if (aqi > 100) return "Fine particle density is rising. Airway inflammation risk is slightly elevated today — stay hydrated.";
  
  return "Pulse analytics are stable. Clinical markers indicate steady-state respiratory function across your profile.";
};
