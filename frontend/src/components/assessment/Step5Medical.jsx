export default function Step5Medical({ data, update }) {
    const conditionsList = [
        'Asthma',
        'COPD',
        'Chronic Bronchitis',
        'Pneumonia history',
        'Tuberculosis history',
        'Diabetes',
        'Hypertension',
        'Heart Disease',
        'Allergic Rhinitis',
        'Sleep Apnea',
        'Occupational Lung Disease',
        'Family History of Respiratory Disease'
    ]

    const conditions = data.conditions || []

    const toggleCondition = (c) => {
        if (conditions.includes(c)) {
            update({ conditions: conditions.filter(item => item !== c) })
        } else {
            update({ conditions: [...conditions, c] })
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 5: Medical History</h2>
                <div className="text-meta">Select all applicable pre-existing conditions.</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {conditionsList.map(c => {
                    const isChecked = conditions.includes(c)
                    return (
                        <label key={c} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '14px', borderRadius: 'var(--radius-md)',
                            border: `1px solid ${isChecked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: isChecked ? 'var(--color-primary-light)' : 'var(--color-surface)',
                            cursor: 'pointer', transition: 'all 0.15s ease'
                        }}>
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleCondition(c)}
                                style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: 500, color: isChecked ? 'var(--color-primary)' : 'var(--color-text)', fontSize: 14 }}>{c}</span>
                        </label>
                    )
                })}
            </div>

            <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label" htmlFor="diagnosisYear">Latest Year Diagnosed (Optional)</label>
                <input id="diagnosisYear" type="number" min="1900" max="2026" placeholder="e.g. 2018" className="form-input"
                    value={data.diagnosisYear || ''} onChange={e => update({ diagnosisYear: e.target.value })} />
            </div>
        </div>
    )
}
