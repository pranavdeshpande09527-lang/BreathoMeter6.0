/**
 * MetricCard — Premium clinical metric display.
 * Shows: icon, label, value, unit, status badge, range, timestamp, trend indicator.
 * v2: trend prop, animated value entrance.
 */
import { useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function MetricCard({ label, value, unit, range, status, timestamp, icon: Icon, trend, color }) {
    const statusMap = {
        normal:   { cls: 'badge-safe',    label: 'Normal'   },
        low:      { cls: 'badge-warning', label: 'Low'      },
        high:     { cls: 'badge-warning', label: 'High'     },
        critical: { cls: 'badge-danger',  label: 'Critical' },
        good:     { cls: 'badge-safe',    label: 'Good'     },
        moderate: { cls: 'badge-warning', label: 'Moderate' },
        poor:     { cls: 'badge-danger',  label: 'Poor'     },
        warning:  { cls: 'badge-warning', label: 'Warning'  },
        danger:   { cls: 'badge-danger',  label: 'High'     },
        healthy:  { cls: 'badge-safe',    label: 'Healthy'  },
    }
    const st = statusMap[status?.toLowerCase()] || { cls: 'badge-primary', label: status || '—' }

    // Trend display config
    const trendEl = trend === 'up'   ? { cls: 'mc-trend-up',   Icon: TrendingUp,   label: '↑ Improving' }
                  : trend === 'down' ? { cls: 'mc-trend-down', Icon: TrendingDown, label: '↓ Declining' }
                  : trend === 'flat' ? { cls: 'mc-trend-flat', Icon: Minus,        label: '— Stable' }
                  : null

    const valueRef = useRef(null)

    // Animate value entrance when value changes
    useEffect(() => {
        if (valueRef.current && value && value !== '–') {
            valueRef.current.classList.remove('mc-value-animated')
            // Force reflow
            void valueRef.current.offsetWidth
            valueRef.current.classList.add('mc-value-animated')
        }
    }, [value])

    // Derive bottom status bar color and width
    const barConfig = {
        normal:   { color: 'var(--color-safe)',    width: '80%',  glowClass: 'hover-glow-safe'    },
        good:     { color: 'var(--color-safe)',    width: '90%',  glowClass: 'hover-glow-safe'    },
        healthy:  { color: 'var(--color-safe)',    width: '85%',  glowClass: 'hover-glow-safe'    },
        low:      { color: 'var(--color-warning)', width: '40%',  glowClass: 'hover-glow-warning'  },
        high:     { color: 'var(--color-warning)', width: '75%',  glowClass: 'hover-glow-warning'  },
        moderate: { color: 'var(--color-warning)', width: '55%',  glowClass: 'hover-glow-warning'  },
        warning:  { color: 'var(--color-warning)', width: '60%',  glowClass: 'hover-glow-warning'  },
        critical: { color: 'var(--color-danger)',  width: '95%',  glowClass: 'hover-glow-danger'   },
        poor:     { color: 'var(--color-danger)',  width: '85%',  glowClass: 'hover-glow-danger'   },
        danger:   { color: 'var(--color-danger)',  width: '80%',  glowClass: 'hover-glow-danger'   },
    }
    const barCfg = barConfig[status?.toLowerCase()] || { color: 'var(--color-primary)', width: '60%', glowClass: 'hover-glow-primary' }

    return (
        <div className={`mc-card glass-secondary hover-card ${barCfg.glowClass}`}>
            <div className="mc-header">
                {Icon && (
                    <div className="mc-icon" style={{ 
                        background: color ? `${color}15` : 'var(--color-primary-light)',
                        border: `1px solid ${color ? `${color}30` : 'var(--color-primary-muted)'}`
                    }} aria-hidden="true">
                        <Icon size={14} color={color || "var(--color-primary)"} strokeWidth={2.5} />
                    </div>
                )}
                <div className="mc-label">{label}</div>
                <span className={`badge ${st.cls} mc-badge`}>{st.label}</span>
            </div>

            <div className="mc-value-row">
                <span className="mc-value mc-value-animated" ref={valueRef}>{value}</span>
                {unit && <span className="mc-unit">{unit}</span>}
            </div>

            {/* Trend indicator */}
            {trendEl && (
                <div className={trendEl.cls}>
                    <trendEl.Icon size={11} strokeWidth={2.5} />
                    <span>{trendEl.label}</span>
                </div>
            )}

            {range && (
                <div className="mc-range">Target: {range}</div>
            )}

            {timestamp && (
                <div className="mc-timestamp">Updated {timestamp}</div>
            )}

            {/* Status bar — visual scale of value */}
            <div className="status-bar" style={{ marginTop: 'auto', paddingTop: 4 }}>
                <div
                    className="status-bar-fill"
                    style={{ width: barCfg.width, background: barCfg.color }}
                />
            </div>

            <style>{`
        .mc-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 128px;
          padding: var(--sp-md);
          will-change: transform, box-shadow;
        }
        .mc-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .mc-icon {
          width: 30px; height: 30px;
          background: var(--color-primary-light);
          border: 1px solid var(--color-primary-muted);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          will-change: transform;
          transition: transform 0.22s cubic-bezier(0.34, 1.42, 0.64, 1),
                      box-shadow 0.22s ease;
        }
        .mc-card:hover .mc-icon {
          transform: scale(1.14) translateY(-1px);
          box-shadow: 0 4px 10px rgba(37,99,235,0.15);
        }
        .mc-label {
          flex: 1;
          font-size: 12px;
          font-weight: 600;
          color: var(--color-muted);
          letter-spacing: 0.1px;
        }
        .mc-value-row {
          display: flex;
          align-items: baseline;
          gap: 5px;
          margin-top: 2px;
        }
        .mc-value {
          font-size: 30px;
          font-weight: 800;
          color: var(--color-text);
          letter-spacing: -0.8px;
          line-height: 1;
          transition: color 0.4s ease;
        }
        .mc-unit {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
        }
        .mc-range {
          font-size: 11.5px;
          color: var(--color-subtle);
          font-weight: 400;
        }
        .mc-timestamp {
          font-size: 10.5px;
          color: var(--color-subtle);
          margin-top: auto;
          font-weight: 400;
        }
      `}</style>
        </div>
    )
}
