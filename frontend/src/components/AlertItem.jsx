import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

const severityMap = {
    high: { icon: AlertTriangle, cls: 'badge-danger', color: 'var(--color-danger)', bg: 'var(--color-danger-light)' },
    moderate: { icon: AlertCircle, cls: 'badge-warning', color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
    low: { icon: Info, cls: 'badge-primary', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
}

export default function AlertItem({ severity = 'moderate', title, description, time, onDismiss }) {
    const s = severityMap[severity] || severityMap.moderate
    const Icon = s.icon

    return (
        <div className="alert-item" style={{ borderLeftColor: s.color }} role="alert">
            <div className="alert-item-icon" style={{ background: s.bg }} aria-hidden="true">
                <Icon size={14} color={s.color} />
            </div>

            <div className="alert-item-body">
                <div className="alert-item-header">
                    <div className="alert-item-title">{title}</div>
                    <span className={`badge ${s.cls} alert-item-badge`}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
                </div>
                {description && <div className="alert-item-desc text-meta">{description}</div>}
                {time && <div className="alert-item-time text-meta">{time}</div>}
            </div>

            {onDismiss && (
                <button className="alert-item-dismiss" onClick={onDismiss} aria-label="Dismiss alert">
                    <X size={13} />
                </button>
            )}

            <style>{`
        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-left-width: 3.5px;
          border-radius: var(--radius-md);
          padding: 13px 16px;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .alert-item:hover {
          box-shadow: var(--shadow-md);
          transform: translateX(2px);
          border-color: var(--color-border-2);
        }

        .alert-item-icon {
          width: 30px; height: 30px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .alert-item-body {
          flex: 1;
          min-width: 0;
        }

        .alert-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }

        .alert-item-title {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--color-text);
        }

        .alert-item-desc {
          margin-bottom: 3px;
        }

        .alert-item-time {
          font-size: 11px;
          color: var(--color-subtle);
        }

        .alert-item-dismiss {
          background: transparent;
          border: none;
          color: var(--color-subtle);
          cursor: pointer;
          padding: 2px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: color 0.12s;
        }

        .alert-item-dismiss:hover {
          color: var(--color-text);
        }
      `}</style>
        </div>
    )
}
