export default function Step6Lifestyle({ data, update }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 6: Lifestyle Risk Factors</h2>
                <div className="text-meta">Habits that affect respiratory and overall health.</div>
            </div>

            <div className="form-group">
                <label className="form-label">Smoking Status</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['Never', 'Former', 'Current'].map(status => (
                        <label key={status} style={{
                            flex: 1, minWidth: 100, textAlign: 'center', padding: '12px',
                            borderRadius: 'var(--radius-md)', border: `1px solid ${data.smoking === status ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: data.smoking === status ? 'var(--color-primary-light)' : 'transparent',
                            color: data.smoking === status ? 'var(--color-primary)' : 'var(--color-text)',
                            fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s ease'
                        }}>
                            <input
                                type="radio"
                                name="smoking"
                                value={status}
                                checked={data.smoking === status}
                                onChange={e => update({ smoking: e.target.value })}
                                style={{ display: 'none' }}
                            />
                            {status}
                        </label>
                    ))}
                </div>
            </div>

            {(data.smoking === 'Current' || data.smoking === 'Former') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="cigarettes">Cigarettes per day</label>
                        <input id="cigarettes" type="number" min="0" className="form-input"
                            value={data.cigarettes || ''} onChange={e => update({ cigarettes: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="smokingYears">Years of smoking</label>
                        <input id="smokingYears" type="number" min="0" className="form-input"
                            value={data.smokingYears || ''} onChange={e => update({ smokingYears: e.target.value })} />
                    </div>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Alcohol consumption per week</label>
                <select className="form-input" value={data.alcohol || ''} onChange={e => update({ alcohol: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="1–2 drinks">1–2 drinks</option>
                    <option value="3–5 drinks">3–5 drinks</option>
                    <option value="> 5 drinks">More than 5 drinks</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Physical activity per week</label>
                <select className="form-input" value={data.activity || ''} onChange={e => update({ activity: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="< 1 hour">Less than 1 hour</option>
                    <option value="1–3 hours">1–3 hours</option>
                    <option value="3–5 hours">3–5 hours</option>
                    <option value="> 5 hours">More than 5 hours</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="sleep">Average sleep duration (hours/night)</label>
                <input id="sleep" type="number" min="0" max="24" className="form-input"
                    value={data.sleep || ''} onChange={e => update({ sleep: e.target.value })} />
            </div>
        </div>
    )
}
