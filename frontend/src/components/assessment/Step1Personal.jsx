export default function Step1Personal({ data, update }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 1: Personal Health Metrics</h2>
                <div className="text-meta">Core physical measurements to establish your baseline health.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="age">Age</label>
                    <input id="age" type="number" min="0" max="120" className="form-input"
                        value={data.age || ''} onChange={e => update({ age: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Gender</label>
                    <select className="form-input" value={data.gender || ''} onChange={e => update({ gender: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="height">Height (cm)</label>
                    <input id="height" type="number" min="50" max="250" className="form-input"
                        value={data.height || ''} onChange={e => {
                            const newHeight = e.target.value;
                            const hMeters = newHeight / 100;
                            const w = data.weight;
                            const bmi = (w && hMeters > 0) ? (w / (hMeters * hMeters)).toFixed(1) : data.bmi;
                            update({ height: newHeight, bmi })
                        }} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="weight">Weight (kg)</label>
                    <input id="weight" type="number" min="20" max="300" className="form-input"
                        value={data.weight || ''} onChange={e => {
                            const newWeight = e.target.value;
                            const hMeters = data.height / 100;
                            const bmi = (newWeight && hMeters > 0) ? (newWeight / (hMeters * hMeters)).toFixed(1) : data.bmi;
                            update({ weight: newWeight, bmi })
                        }} />
                </div>
            </div>

            <div className="card" style={{ padding: '16px', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                <div className="text-label" style={{ marginBottom: 4 }}>Calculated BMI</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text)' }}>
                    {data.bmi || '--'}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="heartrate">Resting Heart Rate (BPM)</label>
                    <input id="heartrate" type="number" min="30" max="200" className="form-input"
                        value={data.heartRate || ''} onChange={e => update({ heartRate: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="temp">Body Temperature (°C)</label>
                    <input id="temp" type="number" step="0.1" min="34" max="42" className="form-input"
                        value={data.temperature || ''} onChange={e => update({ temperature: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="spo2">Blood Oxygen SpO₂ (%)</label>
                    <input id="spo2" type="number" min="70" max="100" className="form-input"
                        value={data.spO2 || ''} onChange={e => update({ spO2: e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="bp">Blood Pressure (Sys/Dia)</label>
                    <input id="bp" type="text" placeholder="e.g. 120/80" className="form-input"
                        value={data.bp || ''} onChange={e => update({ bp: e.target.value })} />
                </div>
            </div>
        </div>
    )
}
