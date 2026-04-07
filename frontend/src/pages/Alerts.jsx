import { useState, useEffect } from 'react'
import AlertItem from '../components/AlertItem'
import { Filter } from 'lucide-react'
import { api } from '../utils/api'

const filters = ['All', 'High', 'Moderate', 'Low']

export default function Alerts() {
  const [allAlerts, setAllAlerts] = useState([])
  const [active, setActive] = useState('All')
  const [dismissed, setDismissed] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        if (userData.id) {
          const fetchedAlerts = await api.alerts.getAlerts(userData.id);
          setAllAlerts(fetchedAlerts || []);
        }
      } catch (err) {
        console.error("Failed to load alerts", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, [])

  const filtered = allAlerts.filter(a => {
    if (dismissed.includes(a.id)) return false
    if (active === 'All') return true
    return a.severity === active.toLowerCase()
  })

  return (
    <div className="page-enter">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="text-label">Health Notifications</div>
            <h1 className="text-page-title" style={{ marginTop: 4 }}>Alerts</h1>
          </div>
          <button className="btn btn-outline btn-sm"><Filter size={13} /> Filter</button>
        </div>
      </div>

      {/* PRIMARY ANCHOR — Full-height alert feed */}
      <div className="al-layout">
        <div className="al-feed">
          {/* Filter tabs */}
          <div className="al-filter-bar">
            {filters.map(f => (
              <button
                key={f}
                className={`al-filter-btn ${active === f ? 'al-filter-btn--active' : ''}`}
                onClick={() => setActive(f)}
              >
                {f}
                {f === 'All' && (
                  <span className="al-filter-count">{allAlerts.filter(a => !dismissed.includes(a.id)).length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Alert feed */}
          <div className="al-list">
            {filtered.length === 0 ? (
              <div className="al-empty">
                <div style={{ fontSize: 32 }}>✓</div>
                <div style={{ fontWeight: 600, marginTop: 8 }}>No alerts in this category</div>
                <div className="text-meta" style={{ marginTop: 4 }}>You're all clear.</div>
              </div>
            ) : (
              filtered.map(a => (
                <AlertItem
                  key={a.id}
                  severity={a.severity}
                  title={a.title}
                  description={a.description}
                  time={a.time}
                  onDismiss={() => setDismissed(d => [...d, a.id])}
                />
              ))
            )}
          </div>
        </div>

        {/* Right panel — Alert stats */}
        <div className="al-sidebar">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="text-card-title" style={{ marginBottom: 14 }}>Alert Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'High Priority', count: allAlerts.filter(a => a.severity === 'high').length, color: 'var(--color-danger)' },
                { label: 'Moderate', count: allAlerts.filter(a => a.severity === 'moderate').length, color: 'var(--color-warning)' },
                { label: 'Informational', count: allAlerts.filter(a => a.severity === 'low' || a.severity === 'info').length, color: 'var(--color-primary)' },
              ].map(s => (
                <div key={s.label} className="al-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>{s.label}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .al-layout {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: var(--sp-md);
          align-items: start;
        }
        .al-feed {}
        .al-filter-bar {
          display: flex;
          gap: 6px;
          margin-bottom: 16px;
        }
        .al-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.12s;
        }
        .al-filter-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        .al-filter-btn--active {
          background: var(--color-primary);
          color: #fff;
          border-color: var(--color-primary);
        }
        .al-filter-count {
          background: rgba(255,255,255,0.25);
          border-radius: var(--radius-full);
          padding: 0 6px;
          font-size: 11px;
          font-weight: 700;
        }
        .al-filter-btn--active .al-filter-count {
          background: rgba(255,255,255,0.3);
        }
        .al-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .al-empty {
          text-align: center;
          padding: 48px;
          color: var(--color-muted);
        }
        .al-stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .al-stat-row:last-child { border-bottom: none; }
        .al-pref-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .al-pref-row:last-child { border-bottom: none; }
        .al-toggle {
          width: 34px; height: 18px;
          border-radius: var(--radius-full);
          background: var(--color-border);
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
        }
        .al-toggle::after {
          content: '';
          position: absolute;
          width: 13px; height: 13px;
          border-radius: 50%;
          background: #fff;
          top: 2.5px; left: 3px;
          transition: left 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.15);
        }
        .al-toggle--on {
          background: var(--color-primary);
        }
        .al-toggle--on::after {
          left: 18px;
        }
        @media (max-width: 900px) {
          .al-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
