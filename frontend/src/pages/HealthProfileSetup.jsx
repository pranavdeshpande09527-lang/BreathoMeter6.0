import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { User, Activity, Loader2, ArrowRight } from 'lucide-react';

export default function HealthProfileSetup() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData(e.target);
        const data = {
            age: parseInt(formData.get('age'), 10),
            height: parseFloat(formData.get('height')),
            weight: parseFloat(formData.get('weight')),
            smoking_history: formData.get('smoking_history') === 'true',
            activity_level: formData.get('activity_level'),
            respiratory_symptoms: formData.get('respiratory_symptoms'),
            baseline_symptoms: formData.get('baseline_symptoms')
        };

        try {
            await api.health.submitData(data);
            // On success, go to dashboard
            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Failed to save health profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card card" style={{ maxWidth: '500px' }}>
                <div className="auth-logo">
                    <div className="auth-logo-mark">
                        <User size={18} color="#2563EB" />
                    </div>
                    <span className="auth-logo-name">Health Profile</span>
                </div>

                <h2 className="auth-title">Complete your profile</h2>
                <p className="auth-sub text-meta">To give you personalized AI insights, we need a few details about your health baseline.</p>

                <form onSubmit={handleSubmit}>
                    {error && <div className="auth-error" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #FECDD3' }}>{error}</div>}

                    <div className="auth-name-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="age">Age</label>
                            <input id="age" name="age" type="number" min="1" max="120" className="form-input" placeholder="e.g. 34" required disabled={loading} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="activity_level">Activity Level</label>
                            <select id="activity_level" name="activity_level" className="form-input" required disabled={loading}>
                                <option value="Low">Low</option>
                                <option value="Moderate">Moderate</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="auth-name-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="height">Height (cm)</label>
                            <input id="height" name="height" type="number" step="0.1" className="form-input" placeholder="175" required disabled={loading} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" htmlFor="weight">Weight (kg)</label>
                            <input id="weight" name="weight" type="number" step="0.1" className="form-input" placeholder="70" required disabled={loading} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="smoking_history">Do you smoke or have a history of smoking?</label>
                        <select id="smoking_history" name="smoking_history" className="form-input" required disabled={loading}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="respiratory_symptoms">Existing Respiratory Conditions</label>
                        <input id="respiratory_symptoms" name="respiratory_symptoms" type="text" className="form-input" placeholder="e.g. Asthma, COPD (Leave blank if none)" disabled={loading} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="baseline_symptoms">Current Baseline Symptoms</label>
                        <input id="baseline_symptoms" name="baseline_symptoms" type="text" className="form-input" placeholder="e.g. Occasional morning cough, slight wheezing" disabled={loading} />
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '24px' }}>
                        {loading ? <Loader2 size={16} className="spin" /> : null}
                        {loading ? 'Saving...' : 'Finish Setup'}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>
            </div>

            <style>{`
        .auth-page { min-height:100vh; background:var(--color-bg); display:flex; align-items:center; justify-content:center; padding:32px 16px; }
        .auth-card { width:100%; padding:36px 32px; }
        .auth-logo { display:flex; align-items:center; gap:9px; margin-bottom:28px; }
        .auth-logo-mark { width:32px; height:32px; background:var(--color-primary-light); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:center; }
        .auth-logo-name { font-size:15px; font-weight:700; color:var(--color-text); }
        .auth-title { font-size:22px; font-weight:700; color:var(--color-text); margin-bottom:5px; }
        .auth-sub { margin-bottom:22px; }
        .auth-name-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .auth-submit { width:100%; justify-content:center; padding:11px; font-size:14px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
        </div>
    );
}
