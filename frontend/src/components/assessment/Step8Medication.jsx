export default function Step8Medication({ data, update }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 8: Medication and Treatment</h2>
                <div className="text-meta">Current pharmacological and supportive respiratory care.</div>
            </div>

            <div className="form-group">
                <label className="form-label">Are you currently using an inhaler?</label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1, padding: '12px', border: `1px solid ${data.inhaler === 'Yes' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: data.inhaler === 'Yes' ? 'var(--color-primary-light)' : 'var(--color-surface)', color: data.inhaler === 'Yes' ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" value="Yes" checked={data.inhaler === 'Yes'} onChange={e => update({ inhaler: e.target.value })} style={{ display: 'none' }} /> Yes
                    </label>
                    <label style={{ flex: 1, padding: '12px', border: `1px solid ${data.inhaler === 'No' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: data.inhaler === 'No' ? 'var(--color-primary-light)' : 'var(--color-surface)', color: data.inhaler === 'No' ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" value="No" checked={data.inhaler === 'No'} onChange={e => update({ inhaler: e.target.value })} style={{ display: 'none' }} /> No
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Are you taking other respiratory medication?</label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1, padding: '12px', border: `1px solid ${data.respMeds === 'Yes' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: data.respMeds === 'Yes' ? 'var(--color-primary-light)' : 'var(--color-surface)', color: data.respMeds === 'Yes' ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" value="Yes" checked={data.respMeds === 'Yes'} onChange={e => update({ respMeds: e.target.value })} style={{ display: 'none' }} /> Yes
                    </label>
                    <label style={{ flex: 1, padding: '12px', border: `1px solid ${data.respMeds === 'No' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: data.respMeds === 'No' ? 'var(--color-primary-light)' : 'var(--color-surface)', color: data.respMeds === 'No' ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" value="No" checked={data.respMeds === 'No'} onChange={e => update({ respMeds: e.target.value })} style={{ display: 'none' }} /> No
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Recent antibiotics for respiratory illness? (Last 30 days)</label>
                <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ flex: 1, padding: '12px', border: `1px solid ${data.antibiotics === 'Yes' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: data.antibiotics === 'Yes' ? 'var(--color-primary-light)' : 'var(--color-surface)', color: data.antibiotics === 'Yes' ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" value="Yes" checked={data.antibiotics === 'Yes'} onChange={e => update({ antibiotics: e.target.value })} style={{ display: 'none' }} /> Yes
                    </label>
                    <label style={{ flex: 1, padding: '12px', border: `1px solid ${data.antibiotics === 'No' ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', background: data.antibiotics === 'No' ? 'var(--color-primary-light)' : 'var(--color-surface)', color: data.antibiotics === 'No' ? 'var(--color-primary)' : 'var(--color-text)', textAlign: 'center', cursor: 'pointer', fontWeight: 500 }}>
                        <input type="radio" value="No" checked={data.antibiotics === 'No'} onChange={e => update({ antibiotics: e.target.value })} style={{ display: 'none' }} /> No
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Oxygen therapy usage?</label>
                <select className="form-input" value={data.oxygenTherapy || ''} onChange={e => update({ oxygenTherapy: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Emergency only">Emergency only</option>
                    <option value="Nightly">Nightly</option>
                    <option value="Continuous">Continuous (24/7)</option>
                </select>
            </div>
        </div>
    )
}
