import { getConfidenceTier, formatConfidence } from '../utils/predictionConfidence'

/**
 * ConfidenceBadge
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays the confidence score as a colour-coded badge with tier label.
 *
 * Props:
 *   confidence  {number}   0–1 float
 *   size        {'sm'|'md'|'lg'}  default 'md'
 *   showBar     {boolean}  show a horizontal progress bar below the badge
 */
export default function ConfidenceBadge({ confidence, size = 'md', showBar = false }) {
    const tier = getConfidenceTier(confidence)
    const pct = confidence != null ? Math.round(confidence * 100) : null

    const sizes = {
        sm: { fontSize: 11, padding: '3px 9px', barH: 3 },
        md: { fontSize: 12, padding: '5px 12px', barH: 4 },
        lg: { fontSize: 14, padding: '7px 16px', barH: 6 },
    }
    const s = sizes[size] || sizes.md

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6 }}>
            <div
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: s.padding,
                    borderRadius: 30,
                    fontSize: s.fontSize,
                    fontWeight: 700,
                    background: `${tier.color}18`,
                    color: tier.color,
                    border: `1.5px solid ${tier.color}40`,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                }}
            >
                <span style={{ fontSize: s.fontSize + 2 }}>{tier.emoji}</span>
                {tier.label}
                {pct != null && (
                    <span style={{ opacity: 0.8, fontWeight: 500 }}>— {pct}%</span>
                )}
            </div>

            {showBar && pct != null && (
                <div
                    style={{
                        width: '100%',
                        height: s.barH,
                        background: 'rgba(0,0,0,0.07)',
                        borderRadius: s.barH,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: tier.color,
                            borderRadius: s.barH,
                            transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                        }}
                    />
                </div>
            )}
        </div>
    )
}
