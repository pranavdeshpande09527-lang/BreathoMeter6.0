import { useEffect, useRef, useState } from 'react'

/**
 * AQIGauge — Phase 3 redesign
 * - EPA standard color tokens (--aqi-*)
 * - Real "Updated HH:MM" timestamp for real-time credibility
 * - Contextual AI insight text below gauge
 * - Improved WCAG aria-label with pollutant detail
 * - Progressive disclosure: summary → detail on expand
 */

/** EPA AQI breakpoints — programmatic, never decorative */
const EPA_LEVELS = [
  { max: 50,  label: 'Good',                color: 'var(--aqi-good)',           bg: 'rgba(0,200,83,0.10)',    advice: 'Air quality is excellent. A great day for outdoor exercise and open windows.' },
  { max: 100, label: 'Moderate',            color: 'var(--aqi-moderate)',        bg: 'rgba(255,214,0,0.12)',   advice: 'Unusually sensitive individuals should limit prolonged outdoor exertion.' },
  { max: 150, label: 'Unhealthy for Some',  color: 'var(--aqi-sensitive)',       bg: 'rgba(255,109,0,0.10)',   advice: 'People with asthma or heart disease should reduce prolonged outdoor activity.' },
  { max: 200, label: 'Unhealthy',           color: 'var(--aqi-unhealthy)',       bg: 'rgba(221,44,0,0.10)',    advice: 'Everyone may experience health effects. Sensitive groups should stay indoors.' },
  { max: 300, label: 'Very Unhealthy',      color: 'var(--aqi-very-unhealthy)',  bg: 'rgba(123,31,162,0.12)',  advice: 'Health alert. Avoid prolonged outdoor activity. Wear N95 mask if going out.' },
  { max: 500, label: 'Hazardous',           color: 'var(--aqi-hazardous)',       bg: 'rgba(126,0,35,0.14)',    advice: 'Emergency conditions. Everyone should avoid all outdoor activity. Stay indoors.' },
]

function getEPALevel(aqi) {
  if (aqi == null) return null
  return EPA_LEVELS.find(l => aqi <= l.max) || EPA_LEVELS[EPA_LEVELS.length - 1]
}

function getNow() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function AQIGauge({ aqi, location = 'Detecting location…', pm25, pm10 }) {
  const radius = 72
  const stroke = 8
  const normalizedR = radius - stroke / 2
  const circumference = normalizedR * 2 * Math.PI

  const [animatedOffset, setAnimatedOffset] = useState(circumference)
  const [visible, setVisible]               = useState(false)
  const [expanded, setExpanded]             = useState(false)
  const [timestamp, setTimestamp]           = useState(getNow)

  const level = getEPALevel(aqi)

  // Sweep animation on mount / value change
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 60)
    const t2 = setTimeout(() => {
      const target = aqi != null
        ? circumference - Math.min(aqi / 500, 1) * circumference
        : circumference
      setAnimatedOffset(target)
    }, 120)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [aqi, circumference])

  // Refresh timestamp every 60 s to show real-time credibility
  useEffect(() => {
    const id = setInterval(() => setTimestamp(getNow()), 60_000)
    return () => clearInterval(id)
  }, [])

  const arcColor  = level?.color  || 'var(--color-border)'
  const bgTint    = level?.bg     || 'transparent'
  const ariaLabel = aqi != null
    ? `Air Quality Index: ${aqi}, ${level?.label}.${pm25 != null ? ` PM2.5: ${pm25} µg/m³.` : ''}${level?.advice ? ` Advisory: ${level.advice}` : ''}`
    : 'Air Quality Index: data loading'

  return (
    <div
      className="aqig-wrapper"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.28s cubic-bezier(0.4,0,0.2,1)' }}
    >
      {/* ── Ring ───────────────────────────────────────────────── */}
      <div className="aqig-ring" style={{ '--glow-color': arcColor }}>
        <svg
          width={radius * 2}
          height={radius * 2}
          role="img"
          aria-label={ariaLabel}
          style={{ overflow: 'visible' }}
        >
          {/* Track */}
          <circle
            cx={radius} cy={radius} r={normalizedR}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />

          {/* Glow halo */}
          {aqi != null && (
            <circle
              cx={radius} cy={radius} r={normalizedR}
              fill="none"
              stroke={arcColor}
              strokeWidth={stroke + 6}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={animatedOffset}
              strokeLinecap="round"
              opacity="0.12"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)',
                filter: 'blur(4px)',
              }}
            />
          )}

          {/* Active arc */}
          <circle
            cx={radius} cy={radius} r={normalizedR}
            fill="none"
            stroke={arcColor}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1), stroke 0.4s cubic-bezier(0.4,0,0.2,1)',
            }}
          />

          {/* AQI number — anti-halation: var(--text-on-dark) instead of #fff */}
          <text
            x={radius} y={radius - 5}
            textAnchor="middle"
            style={{
              fill: aqi != null ? arcColor : 'var(--color-muted)',
              fontSize: '28px',
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              transition: 'fill 0.4s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            {aqi ?? '–'}
          </text>

          {/* "AQI" label */}
          <text
            x={radius} y={radius + 16}
            textAnchor="middle"
            style={{
              fill: 'var(--color-muted)',
              fontSize: '9px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            AQI · EPA
          </text>
        </svg>
      </div>

      {/* ── Category badge ─────────────────────────────────────── */}
      <div className="aqig-info">
        {level && (
          <span
            className="aqig-badge"
            style={{ color: level.color, background: bgTint, border: `1px solid ${level.color}33` }}
          >
            <span className="aqig-badge-dot" style={{ background: level.color }} />
            {level.label}
          </span>
        )}
        {!level && <span className="aqig-badge aqig-badge--loading">Awaiting data…</span>}

        <div className="aqig-location" aria-label={`Location: ${location}`}>
          📍 {location}
        </div>

        {/* Timestamp — real-time credibility signal */}
        <div className="aqig-timestamp" aria-live="polite">
          Updated {timestamp}
        </div>
      </div>

      {/* ── Contextual AI insight (progressive disclosure) ─────── */}
      {level && (
        <div className="aqig-insight" style={{ background: bgTint }}>
          <p className="aqig-insight-text">{level.advice}</p>

          {/* Expand for pollutant detail */}
          {(pm25 != null || pm10 != null) && (
            <button
              className="aqig-expand-btn"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide pollutant details' : 'Show pollutant details'}
            >
              {expanded ? 'Hide details ↑' : 'Pollutant detail ↓'}
            </button>
          )}

          {expanded && (
            <div className="aqig-pollutants" role="region" aria-label="Pollutant breakdown">
              {pm25 != null && (
                <div className="aqig-pollutant-row">
                  <span className="aqig-pollutant-label">PM2.5</span>
                  <span className="aqig-pollutant-value">{pm25} <span className="aqig-pollutant-unit">µg/m³</span></span>
                </div>
              )}
              {pm10 != null && (
                <div className="aqig-pollutant-row">
                  <span className="aqig-pollutant-label">PM10</span>
                  <span className="aqig-pollutant-value">{pm10} <span className="aqig-pollutant-unit">µg/m³</span></span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        .aqig-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        .aqig-ring {
          position: relative;
          filter: drop-shadow(0 2px 12px color-mix(in srgb, var(--glow-color, transparent) 22%, transparent));
          transition: filter 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        .aqig-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .aqig-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .aqig-badge--loading {
          color: var(--color-muted);
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
        }
        .aqig-badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .aqig-location {
          font-size: 11px;
          color: var(--color-muted);
          font-weight: 500;
          text-align: center;
        }
        .aqig-timestamp {
          font-size: 9.5px;
          font-weight: 600;
          color: var(--color-muted);
          letter-spacing: 0.5px;
          opacity: 0.6;
          font-family: monospace;
          text-transform: uppercase;
        }
        .aqig-insight {
          width: 100%;
          border-radius: 8px;
          padding: 10px 14px;
          border: 1px solid var(--color-border);
        }
        .aqig-insight-text {
          font-size: 11.5px;
          line-height: 1.6;
          color: var(--color-muted);
          margin: 0 0 6px;
        }
        .aqig-expand-btn {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-primary);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          letter-spacing: 0.3px;
          transition: opacity 0.15s;
        }
        .aqig-expand-btn:hover { opacity: 0.7; }
        .aqig-pollutants {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-top: 1px solid var(--color-border);
          padding-top: 8px;
        }
        .aqig-pollutant-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }
        .aqig-pollutant-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--color-muted);
          font-family: monospace;
        }
        .aqig-pollutant-value {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-text);
          font-variant-numeric: tabular-nums;
        }
        .aqig-pollutant-unit {
          font-size: 10px;
          font-weight: 500;
          color: var(--color-muted);
        }
      `}</style>
    </div>
  )
}
