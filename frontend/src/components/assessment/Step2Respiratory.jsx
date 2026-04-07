export default function Step2Respiratory({ data, update }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 2: Respiratory Condition</h2>
                <div className="text-meta">Evaluate your current breathing patterns and respiratory history.</div>
            </div>

            <div className="form-group">
                <label className="form-label">How often do you experience shortness of breath?</label>
                <select className="form-input" value={data.sob || ''} onChange={e => update({ sob: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="Never">Never</option>
                    <option value="During intense exercise">During intense exercise</option>
                    <option value="During moderate activity">During moderate activity</option>
                    <option value="During light activity">During light activity</option>
                    <option value="Even while resting">Even while resting</option>
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">How long has your cough lasted?</label>
                    <select className="form-input" value={data.coughDuration || ''} onChange={e => update({ coughDuration: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="No cough">No cough</option>
                        <option value="< 3 days">&lt; 3 days</option>
                        <option value="3–7 days">3–7 days</option>
                        <option value="1–3 weeks">1–3 weeks</option>
                        <option value="> 3 weeks">&gt; 3 weeks</option>
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Type of cough</label>
                    <select className="form-input" value={data.coughType || ''} onChange={e => update({ coughType: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Dry cough">Dry cough</option>
                        <option value="Wet cough">Wet cough</option>
                        <option value="Occasional cough">Occasional cough</option>
                        <option value="Persistent cough">Persistent cough</option>
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Do you hear wheezing while breathing?</label>
                    <select className="form-input" value={data.wheezing || ''} onChange={e => update({ wheezing: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Never">Never</option>
                        <option value="Sometimes">Sometimes</option>
                        <option value="Frequently">Frequently</option>
                        <option value="Constantly">Constantly</option>
                    </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Do you experience chest tightness?</label>
                    <select className="form-input" value={data.chestTightness || ''} onChange={e => update({ chestTightness: e.target.value })}>
                        <option value="">Select...</option>
                        <option value="Never">Never</option>
                        <option value="Occasionally">Occasionally</option>
                        <option value="Daily">Daily</option>
                        <option value="Severe frequent episodes">Severe frequent episodes</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="breathRate">Average breathing rate (breaths per min)</label>
                <input id="breathRate" type="number" min="5" max="60" className="form-input"
                    value={data.breathRate || ''} onChange={e => update({ breathRate: e.target.value })} />
            </div>
        </div>
    )
}
