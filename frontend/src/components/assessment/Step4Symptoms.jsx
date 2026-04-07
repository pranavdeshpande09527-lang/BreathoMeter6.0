export default function Step4Symptoms({ data, update }) {
    const symptoms = [
        { id: 'coughSev', label: 'Cough Severity' },
        { id: 'breathlessnessSev', label: 'Breathlessness Severity' },
        { id: 'chestPain', label: 'Chest Pain' },
        { id: 'fatigue', label: 'Fatigue' },
        { id: 'fever', label: 'Fever' },
        { id: 'sleepDisturbance', label: 'Sleep Disturbance' },
        { id: 'nightCoughSev', label: 'Night Cough' },
        { id: 'phlegmSev', label: 'Phlegm / Mucus Production' },
        { id: 'wheezingSev', label: 'Wheezing' },
        { id: 'dizzinessSev', label: 'Dizziness / Lightheadedness' },
        { id: 'nasalCongestionSev', label: 'Nasal Congestion' }
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 4: Symptom Severity</h2>
                <div className="text-meta">Rate each symptom from 0 (None) to 5 (Very Severe).</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {symptoms.map(s => (
                    <div key={s.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <label className="form-label" htmlFor={s.id} style={{ margin: 0 }}>{s.label}</label>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                                {data[s.id] || 0}
                            </span>
                        </div>
                        <input
                            id={s.id}
                            type="range"
                            min="0" max="5" step="1"
                            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                            value={data[s.id] || 0}
                            onChange={e => update({ [s.id]: Number(e.target.value) })}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--color-subtle)' }}>
                            <span>None (0)</span>
                            <span>Very Severe (5)</span>
                        </div>

                        {(data[s.id] || 0) > 0 && (
                            <div className="form-group" style={{ marginTop: 12, marginBottom: 0, animation: 'fadeIn 0.3s ease-out' }}>
                                <label className="form-label" htmlFor={`${s.id}Days`} style={{ fontSize: 13, color: 'var(--color-text)' }}>Duration (days)</label>
                                <input
                                    id={`${s.id}Days`}
                                    type="number"
                                    min="0" max="365"
                                    className="form-input"
                                    style={{ padding: '8px 12px', fontSize: 14 }}
                                    placeholder="e.g. 5"
                                    value={data[`${s.id}Days`] || ''}
                                    onChange={e => update({ [`${s.id}Days`]: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
