export default function Step9Daily({ data, update }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 9: Daily Health Tracking (Optional)</h2>
                <div className="text-meta">Snapshot of how you are feeling right now today.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="dailySpo2">Daily SpO₂ (%)</label>
                    <input id="dailySpo2" type="number" min="70" max="100" className="form-input"
                        value={data.dailySpo2 || ''} onChange={e => update({ dailySpo2: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="dailyTemp">Daily Temperature (°C)</label>
                    <input id="dailyTemp" type="number" step="0.1" min="34" max="42" className="form-input"
                        value={data.dailyTemp || ''} onChange={e => update({ dailyTemp: e.target.value })} />
                </div>
            </div>

            <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}>Breathing difficulty today</label>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)' }}>
                        {data.dailyDifficulty || 0}
                    </span>
                </div>
                <input
                    type="range"
                    min="0" max="5" step="1"
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                    value={data.dailyDifficulty || 0}
                    onChange={e => update({ dailyDifficulty: Number(e.target.value) })}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--color-subtle)' }}>
                    <span>None (0)</span>
                    <span>Very Severe (5)</span>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="medsToday">Medication taken today</label>
                <input id="medsToday" type="text" placeholder="e.g. Albuterol 2 puffs" className="form-input"
                    value={data.medsToday || ''} onChange={e => update({ medsToday: e.target.value })} />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="symptomsToday">Any new or worsening symptoms today?</label>
                <textarea id="symptomsToday" className="form-input" rows="3" placeholder="Describe how you are feeling..."
                    value={data.symptomsToday || ''} onChange={e => update({ symptomsToday: e.target.value })} />
            </div>
        </div>
    )
}
