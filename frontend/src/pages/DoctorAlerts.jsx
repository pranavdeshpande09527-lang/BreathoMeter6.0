import { useState, useEffect } from 'react'
import AlertItem from '../components/AlertItem'
import { api } from '../utils/api'

export default function DoctorAlerts() {
    const [alerts, setAlerts] = useState([])
    const [dismissed, setDismissed] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                if (userData.id) {
                    const fetchedAlerts = await api.alerts.getDoctorAlerts(userData.id);
                    setAlerts(fetchedAlerts || []);
                }
            } catch (err) {
                console.error("Failed to load doctor alerts", err);
            } finally {
                setLoading(false);
            }
        }
        fetchAlerts();
    }, [])

    const visible = alerts.filter(a => !dismissed.includes(a.id))

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Clinical Notifications</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Clinical Alerts</h1>
                    </div>
                    <div className="text-meta">{visible.length} active</div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visible.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--color-muted)' }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
                        <div style={{ fontWeight: 600 }}>All clinical alerts cleared</div>
                    </div>
                ) : (
                    visible.map(a => (
                        <AlertItem key={a.id} {...a} onDismiss={() => setDismissed(d => [...d, a.id])} />
                    ))
                )}
            </div>
        </div>
    )
}
