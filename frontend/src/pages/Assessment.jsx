import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import {
    calculateRespiratoryRisk,
    calculateLungFunctionScore,
    calculateEnvironmentalRisk,
    calculateOverallHealthScore,
    getBreathingMetrics
} from '../utils/scoring'

import Step1Personal from '../components/assessment/Step1Personal'
import Step2Respiratory from '../components/assessment/Step2Respiratory'
import Step3Activity from '../components/assessment/Step3Activity'
import Step4Symptoms from '../components/assessment/Step4Symptoms'
import Step5Medical from '../components/assessment/Step5Medical'
import Step6Lifestyle from '../components/assessment/Step6Lifestyle'
import Step7Environment from '../components/assessment/Step7Environment'
import Step8Medication from '../components/assessment/Step8Medication'
import Step9Daily from '../components/assessment/Step9Daily'

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
}

const getMaxSymptomDuration = (formData) => {
    const durationKeys = ['coughSevDays', 'breathlessnessSevDays', 'chestPainDays', 'feverDays']
    return durationKeys.reduce((max, key) => Math.max(max, toNumber(formData[key], 0)), 0)
}

export default function Assessment() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [data, setData] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Pre-populate data from user profile
    useEffect(() => {
        api.auth.getProfile().then(res => {
            if (res?.user?.profile) {
                const p = res.user.profile;
                const hMeters = p.height / 100;
                const bmi = (p.weight && hMeters > 0) ? (p.weight / (hMeters * hMeters)).toFixed(1) : null;
                
                setData(prev => ({
                    ...prev,
                    age: p.age || prev.age,
                    gender: p.gender || prev.gender,
                    height: p.height || prev.height,
                    weight: p.weight || prev.weight,
                    bmi: bmi || prev.bmi,
                    smoking: p.smoking_status || prev.smoking,
                    activity: p.activity_level || prev.activity
                }));
            }
        }).catch(err => console.error("Failed to pre-populate assessment form:", err));
    }, []);

    const totalSteps = 9

    const updateData = (newData) => {
        setData(prev => ({ ...prev, ...newData }))
    }

    const nextStep = () => {
        if (step < totalSteps) {
            window.scrollTo(0, 0)
            setStep(s => s + 1)
        }
    }

    const prevStep = () => {
        if (step > 1) {
            window.scrollTo(0, 0)
            setStep(s => s - 1)
        }
    }

    const submitForm = async () => {
        setIsSubmitting(true)
        // Calculate the scores based on the collected data
        const respiratoryRisk = calculateRespiratoryRisk(data)
        const lungFunction = calculateLungFunctionScore(data)
        const environmentalRisk = calculateEnvironmentalRisk(data)
        const overallScore = calculateOverallHealthScore(data)

        const payload = {
            formData: data,
            scores: {
                respiratoryRisk,
                lungFunction,
                environmentalRisk,
                overallScore
            },
            timestamp: new Date().toISOString()
        }
        const breathingMetrics = getBreathingMetrics(data)

        // ── Hoist shared variables so all try-blocks below can access them ──
        const symptomEntries = [
            { key: 'coughSev', label: 'Cough' },
            { key: 'breathlessnessSev', label: 'Breathlessness' },
            { key: 'chestPain', label: 'Chest Pain' },
            { key: 'fatigue', label: 'Fatigue' },
            { key: 'fever', label: 'Fever' },
            { key: 'sleepDisturbance', label: 'Sleep Disturbance' },
            { key: 'nightCoughSev', label: 'Night Cough' },
            { key: 'phlegmSev', label: 'Phlegm/Mucus' },
            { key: 'wheezingSev', label: 'Wheezing' },
            { key: 'dizzinessSev', label: 'Dizziness' },
            { key: 'nasalCongestionSev', label: 'Nasal Congestion' }
        ];
        const activeSymptoms = symptomEntries
            .filter(s => (Number(data[s.key]) || 0) > 0)
            .map(s => `${s.label} (severity ${data[s.key]}/5${data[`${s.key}Days`] ? `, ${data[`${s.key}Days`]} days` : ''})`)
            .join(', ') || 'None reported';
        const medicalHistory = (data.conditions && data.conditions.length > 0)
            ? data.conditions.join(', ')
            : 'No known conditions';

        // ── All API calls are wrapped individually so a single failure
        // ── (including a 401 from an expired token) NEVER blocks the
        // ── navigate() at the end. The user always reaches the results page.
        try {
            // Save Breath Test Data
            try {
                const averagePeakAirflow = breathingMetrics.averagePeakAirflow || 0
                const averageSignalStability = breathingMetrics.averageSignalStability || 0

                await api.breath.submitTest({
                    lung_capacity: breathingMetrics.inhaleCapacity || breathingMetrics.breathHoldTime || 30,
                    breath_duration: breathingMetrics.breathHoldTime || breathingMetrics.exhaleCapacity || 30,
                    breath_strength: breathingMetrics.exhaleCapacity || breathingMetrics.inhaleCapacity || 30,
                    test_accuracy: Math.max(80, Math.round((lungFunction + respiratoryRisk) / 2)),
                    peak_airflow: averagePeakAirflow,
                    signal_stability: averageSignalStability,
                    is_valid: true,
                    background_noise_detected: false,
                    cough_detected: false,
                    raw_attempts: [
                        { type: 'inhale', attempts: data.peakInhaleAttempts || [] },
                        { type: 'exhale', attempts: data.forcedExhaleAttempts || [] },
                        { type: 'hold', attempts: data.breathHoldAttempts || [] }
                    ]
                });
            } catch (breathErr) {
                console.error("[Assessment] Breath test save failed (non-blocking):", breathErr);
            }
            
            // Save Health Info (for Smart Alerts & Dynamic Risk)
            try {
                await api.health.submitData({
                    age: toNumber(data.age, 30),
                    height: toNumber(data.height, 170),
                    weight: toNumber(data.weight, 70),
                    smoking_history: data.smoking === 'Current',
                    activity_level: data.activity || 'Moderate',
                    respiratory_symptoms: activeSymptoms,
                    baseline_symptoms: medicalHistory,
                    outdoor_hours: toNumber(data.outdoorTimeHours || data.outdoorTime, 2.0)
                });
            } catch (healthErr) {
                console.error("[Assessment] Health data save failed (non-blocking):", healthErr);
            }

            // Save Risk Prediction
            try {
                let riskFactors = ["Symptom Reports", "Clinical Data"];
                if (data.smoking === 'Current') riskFactors.unshift("Smoking History");
                if (environmentalRisk > 50) riskFactors.push("High Environmental Risk");
                if (breathingMetrics.inhaleCapacity > 0 && breathingMetrics.inhaleCapacity < 4) riskFactors.push("Reduced Inhaling Capacity");
                if (breathingMetrics.exhaleCapacity > 0 && breathingMetrics.exhaleCapacity < 3) riskFactors.push("Reduced Exhaling Capacity");
                if (breathingMetrics.breathHoldTime > 0 && breathingMetrics.breathHoldTime < 20) riskFactors.push("Reduced Breath-Hold Timing");
                if (data.stairsDifficulty === 'Moderate breathlessness' || data.stairsDifficulty === 'Severe breathlessness') {
                    riskFactors.push("Exertional Breathlessness");
                }

                // activeSymptoms and medicalHistory are hoisted above (computed once before all try blocks)

                // Build lifestyle info from Step6Lifestyle
                const smokingStatus = data.smoking || 'Unknown';
                const outdoorHours = data.outdoorTimeHours || data.outdoorTime || 'Unknown';
                const symptomDuration = getMaxSymptomDuration(data)

                let finalPredictionPayload = {
                    final_risk_score: respiratoryRisk / 100,
                    risk_category: respiratoryRisk >= 65 ? "High Risk" : respiratoryRisk >= 30 ? "Moderate Risk" : "Low Risk",
                    ai_explanation: "Waiting for AI ensemble analysis...",
                    top_risk_factors: riskFactors,
                    ml_score: respiratoryRisk / 100,
                    ai_score: respiratoryRisk / 100,
                    agreement_score: 0.9,
                    confidence_score: 0.9,
                    disease_risks: []
                };

                try {
                    // Call actual inference API with rich patient data
                    const inferenceRes = await api.inference.predict({
                        environmental_data: {
                            AQI: Number(data.aqi) || 50.0,
                            PM10: Number(data.pm10) || 20.0,
                            PM2_5: Number(data.pm25) || 12.0,
                            NO2: Number(data.no2) || 15.0,
                            SO2: Number(data.so2) || 5.0,
                            O3: Number(data.o3) || 25.0,
                            Temperature: Number(data.temperature) || 25.0,
                            Humidity: Number(data.humidity) || 50.0,
                            WindSpeed: Number(data.windSpeed) || 5.0,
                            RespiratoryCases: 5.0,
                            CardiovascularCases: 2.0,
                            HospitalAdmissions: 1.0,
                            HealthImpactScore: environmentalRisk || 20.0
                        },
                        optional_patient_data: {
                            age: Number(data.age) || 30,
                            gender: data.gender || "Unknown",
                            symptoms: activeSymptoms,
                            medical_history: medicalHistory,
                            smoking_history: smokingStatus,
                            symptom_duration: symptomDuration,
                            bmi: Number(data.bmi) || 24.5,
                            lifestyle: {
                                smoking_habits: smokingStatus,
                                outdoor_time_hours: outdoorHours
                            },
                            vitals: {
                                spo2: toNumber(data.spO2, 98),
                                spo2_level: toNumber(data.spO2, 98),
                                breath_hold_time: breathingMetrics.breathHoldTime || null,
                                inhale_capacity: breathingMetrics.inhaleCapacity || null,
                                exhale_capacity: breathingMetrics.exhaleCapacity || null,
                                average_signal_stability: breathingMetrics.averageSignalStability,
                                average_peak_airflow: breathingMetrics.averagePeakAirflow,
                                cough_severity: Number(data.coughSev) || 0,
                                shortness_of_breath: Number(data.breathlessnessSev) || 0,
                                stairs_difficulty: data.stairsDifficulty || null,
                            },
                            respiratory_metrics: {
                                inhale_capacity_seconds: breathingMetrics.inhaleCapacity || null,
                                exhale_capacity_seconds: breathingMetrics.exhaleCapacity || null,
                                breath_hold_seconds: breathingMetrics.breathHoldTime || null,
                                stairs_difficulty: data.stairsDifficulty || null,
                            }
                        }
                    });

                    if (inferenceRes) {
                        // Merge inference results into payload — inference is source of truth
                        finalPredictionPayload = { ...finalPredictionPayload, ...inferenceRes };

                        // Normalize possible_conditions → disease_risks with field mapping
                        // Backend returns: condition_name, probability, reason, severity, specialty, confidence_label
                        // Frontend expects: disease, risk_percentage, reason, severity, specialty, confidence_label
                        const conditions = inferenceRes.possible_conditions || [];
                        finalPredictionPayload.disease_risks = conditions.map(c => ({
                            disease: c.condition_name || c.disease || 'Unknown Condition',
                            risk_percentage: c.probability ?? c.risk_percentage ?? 0,
                            reason: c.reason || '',
                            severity: c.severity || 'moderate',
                            specialty: c.specialty || 'General Physician',
                            confidence_label: c.confidence_label || null,
                            key_factors: c.key_factors || []
                        }));

                        // Also set primary_prediction from inference
                        if (inferenceRes.primary_prediction && !finalPredictionPayload.primary_prediction) {
                            finalPredictionPayload.primary_prediction = inferenceRes.primary_prediction;
                        }

                        // Serialize ai_explanation to string if inference returned an object
                        if (inferenceRes.ai_explanation && typeof inferenceRes.ai_explanation === 'object') {
                            const expl = inferenceRes.ai_explanation;
                            const symptomsStr = Array.isArray(expl.symptoms_flagged)
                                ? expl.symptoms_flagged.join(', ')
                                : (expl.symptoms_flagged || '');
                            finalPredictionPayload.ai_explanation = [
                                expl.summary,
                                symptomsStr ? `Symptoms: ${symptomsStr}` : '',
                                expl.clinical_mapping ? `Clinical Mapping: ${expl.clinical_mapping}` : ''
                            ].filter(Boolean).join(' | ');
                        }

                        // Ensure urgency fields pass through to storage
                        if (inferenceRes.urgency_tier) finalPredictionPayload.urgency_tier = inferenceRes.urgency_tier;
                        if (inferenceRes.urgency_action) finalPredictionPayload.urgency_action = inferenceRes.urgency_action;
                        if (inferenceRes.safety_flags) finalPredictionPayload.safety_flags = inferenceRes.safety_flags;
                        if (inferenceRes.time_to_action) finalPredictionPayload.time_to_action = inferenceRes.time_to_action;

                        // Strip inference-only fields not in PredictionRequest schema — they cause 422 on /prediction/store
                        ['timestamp', 'possible_conditions', 'medical_disclaimer'].forEach(f => delete finalPredictionPayload[f]);
                    }
                } catch (inferenceErr) {
                    console.error("[Assessment] Inference API failed, using fallback:", inferenceErr);
                    finalPredictionPayload.ai_explanation = `Based on your assessment, you are at ${respiratoryRisk > 50 ? 'an elevated' : 'a low'} risk for respiratory distress. Key factors: ${riskFactors.join(', ')}. AI ensemble was unavailable.`;
                }

                const predictionRes = await api.prediction.storePrediction(finalPredictionPayload);
                // Merge inference-enriched payload with stored response so results page has full data
                payload.predictionDetails = { ...finalPredictionPayload, ...(predictionRes?.data || {}) };
            } catch (predictionErr) {
                console.error("[Assessment] Prediction save failed (non-blocking):", predictionErr);
            }
        } catch (outerErr) {
            // Safety net — should never reach here, but log if it does
            console.error("[Assessment] Unexpected error during submission:", outerErr);
        } finally {
            // ── ALWAYS navigate to results regardless of API success/failure ──
            // ── Token expiry / server errors must NEVER kick the user out here ──
            setIsSubmitting(false)
            navigate('/assessment-results', { state: { payload } })
        }
    }

    const renderStep = () => {
        switch (step) {
            case 1: return <Step1Personal data={data} update={updateData} />
            case 2: return <Step2Respiratory data={data} update={updateData} />
            case 3: return <Step3Activity data={data} update={updateData} />
            case 4: return <Step4Symptoms data={data} update={updateData} />
            case 5: return <Step5Medical data={data} update={updateData} />
            case 6: return <Step6Lifestyle data={data} update={updateData} />
            case 7: return <Step7Environment data={data} update={updateData} />
            case 8: return <Step8Medication data={data} update={updateData} />
            case 9: return <Step9Daily data={data} update={updateData} />
            default: return null
        }
    }

    const progressPercentage = (step / totalSteps) * 100

    return (
        <div className="page-enter" style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>

            <div className="page-header" style={{ marginBottom: 24 }}>
                <div className="text-label" style={{ marginBottom: 4 }}>Health Condition Assessment</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                    <h1 className="text-page-title" style={{ margin: 0 }}>Step {step} of {totalSteps}</h1>
                    <div className="text-meta">{Math.round(progressPercentage)}% completed</div>
                </div>

                {/* Progress bar */}
                <div style={{ width: '100%', height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                        height: '100%',
                        background: 'var(--color-primary)',
                        width: `${progressPercentage}%`,
                        transition: 'width 0.3s ease-out'
                    }} />
                </div>
            </div>

            <div className="card" style={{ padding: '32px', marginBottom: 24, minHeight: 400 }}>
                {renderStep()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                    className="btn btn-outline"
                    onClick={prevStep}
                    disabled={step === 1 || isSubmitting}
                    style={{ opacity: step === 1 ? 0.5 : 1 }}
                >
                    Back
                </button>

                {step < totalSteps ? (
                    <button className="btn btn-primary" onClick={nextStep} disabled={isSubmitting}>
                        Next Step
                    </button>
                ) : (
                    <button className="btn btn-primary" onClick={submitForm} disabled={isSubmitting} style={{ background: 'var(--color-safe)' }}>
                        {isSubmitting ? 'Analyzing Data...' : 'Submit Assessment'}
                    </button>
                )}
            </div>

        </div>
    )
}
