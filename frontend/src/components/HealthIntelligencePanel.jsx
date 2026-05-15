/**
 * HealthIntelligencePanel — Phase 7
 * Renders contextual, condition-aware health guidance driven by aqiIntelligence.js.
 * Uses the .hip-panel CSS system (index.css Phase 7 block) with data-urgency variants.
 *
 * Props:
 *   aqi          {number|null}   Current AQI value
 *   conditions   {string[]}      Patient conditions e.g. ['asthma','copd']
 *   loading      {boolean}       Show shimmer skeleton while AQI fetches
 *   className    {string}        Extra CSS classes
 */
import { useMemo } from 'react'
import { getAQIInsight } from '../utils/aqiIntelligence'

/* Maps urgency key → human badge label */
const BADGE_LABELS = {
  critical: 'URGENT',
  high:     'HIGH',
  medium:   'MODERATE',
  low:      'ADVISORY',
  none:     'ALL CLEAR',
}

export default function HealthIntelligencePanel({
  aqi       = null,
  conditions = [],
  loading   = false,
  className = '',
}) {
  const insight = useMemo(
    () => (aqi != null ? getAQIInsight({ aqi, conditions }) : null),
    [aqi, conditions],
  )

  /* ── Shimmer while AQI is loading ─────────────────────────── */
  if (loading) {
    return (
      <div
        className={`hip-panel ${className}`}
        data-urgency="low"
        role="status"
        aria-label="Loading health intelligence"
        aria-busy="true"
      >
        <div className="hip-loading">
          <div className="hip-shimmer" style={{ width: '65%' }} />
          <div className="hip-shimmer" />
          <div className="hip-shimmer" />
        </div>
      </div>
    )
  }

  /* ── No AQI data yet ──────────────────────────────────────── */
  if (!insight) {
    return (
      <div
        className={`hip-panel ${className}`}
        data-urgency="none"
        role="note"
        aria-label="Health intelligence — awaiting location data"
      >
        <div className="hip-header">
          <div className="hip-icon-title">
            <span className="hip-icon" aria-hidden="true">🌬️</span>
            <div className="hip-headline">Health Intelligence</div>
          </div>
          <span className="hip-badge">AWAITING DATA</span>
        </div>
        <p className="hip-body">
          Allow location access to receive personalised, real-time air quality
          guidance based on your respiratory profile.
        </p>
      </div>
    )
  }

  /* ── Full insight panel ───────────────────────────────────── */
  const urgency    = insight.urgency   || 'none'
  const badgeLabel = BADGE_LABELS[urgency] || urgency.toUpperCase()

  return (
    <div
      className={`hip-panel ${className}`}
      data-urgency={urgency}
      role="region"
      aria-label={`Health intelligence: ${urgency} urgency`}
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Header */}
      <div className="hip-header">
        <div className="hip-icon-title">
          <span className="hip-icon" aria-hidden="true">{insight.icon}</span>
          <div className="hip-headline">{insight.headline}</div>
        </div>
        <span className="hip-badge" aria-label={`Urgency: ${urgency}`}>
          {badgeLabel}
        </span>
      </div>

      {/* AQI band pill */}
      <div>
        <div className="hip-aqi-pill" aria-label={`AQI ${aqi} — ${insight.band}`}>
          <span className="hip-aqi-dot" aria-hidden="true" />
          AQI {aqi} · {insight.band}
        </div>
      </div>

      {/* Body guidance */}
      <p className="hip-body">{insight.body}</p>

      {/* Condition-specific note (if any) */}
      {insight.conditionNote && (
        <p
          className="hip-body"
          style={{ marginTop: -8, fontWeight: 500, opacity: 0.9 }}
        >
          {insight.conditionNote}
        </p>
      )}

      {/* Recommended action */}
      <div className="hip-action" role="note">
        <span className="hip-action-label">Action:</span>
        <span>{insight.action}</span>
      </div>
    </div>
  )
}
