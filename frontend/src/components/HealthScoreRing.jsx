/**
 * HealthScoreRing — Signature SVG Component
 * Large circular health score indicator for Patient Dashboard anchor.
 */
export default function HealthScoreRing({ score = 78, label = 'Health Score' }) {
    const radius = 80
    const stroke = 10
    const normalizedR = radius - stroke / 2
    const circumference = normalizedR * 2 * Math.PI
    const offset = circumference - (score / 100) * circumference

    const getColor = (s) => {
        if (s >= 80) return 'var(--color-safe)'
        if (s >= 50) return 'var(--color-warning)'
        return 'var(--color-danger)'
    }

    const getStatus = (s) => {
        if (s >= 80) return { label: 'Good', cls: 'badge-safe' }
        if (s >= 50) return { label: 'Moderate', cls: 'badge-warning' }
        return { label: 'At Risk', cls: 'badge-danger' }
    }

    const color = getColor(score)
    const status = getStatus(score)

    return (
        <div className="hsr-wrapper">
            <div className="hsr-ring-container">
                <svg
                    width={radius * 2}
                    height={radius * 2}
                    role="img"
                    aria-label={`${label}: ${score} out of 100`}
                >
                    {/* Track */}
                    <circle
                        cx={radius} cy={radius} r={normalizedR}
                        fill="none"
                        stroke="var(--color-border)"
                        strokeWidth={stroke}
                    />
                    {/* Progress */}
                    <circle
                        cx={radius} cy={radius} r={normalizedR}
                        fill="none"
                        stroke={color}
                        strokeWidth={stroke}
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%',
                            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                    {/* Center text */}
                    <text x={radius} y={radius - 8} textAnchor="middle" style={{ fill: 'var(--color-text)', fontSize: '32px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
                        {score}
                    </text>
                    <text x={radius} y={radius + 14} textAnchor="middle" style={{ fill: 'var(--color-muted)', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
                        / 100
                    </text>
                </svg>
            </div>

            <div className="hsr-info">
                <div className="hsr-label">{label}</div>
                <span className={`badge ${status.cls}`}>{status.label}</span>
                <div className="hsr-sub">Based on latest analysis</div>
            </div>

            <style>{`
        .hsr-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .hsr-ring-container {
          filter: drop-shadow(0 2px 12px rgba(37,99,235,0.08));
        }
        .hsr-info {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .hsr-label {
          font-size: 15px;
          font-weight: 600;
          color: var(--color-text);
        }
        .hsr-sub {
          font-size: 12px;
          color: var(--color-subtle);
        }
      `}</style>
        </div>
    )
}
