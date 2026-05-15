import { useState, useEffect } from 'react'
import { Wind, MapPin, Droplets, Cloud, Flame, CheckCircle2 } from 'lucide-react'

function aqiCategory(aqi) {
  if (aqi == null) return { label: 'Loading…', color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#64748b' }
  if (aqi <= 50)  return { label: 'Good',            color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   dot: '#22c55e' }
  if (aqi <= 100) return { label: 'Moderate',         color: '#eab308', bg: 'rgba(234,179,8,0.10)',  dot: '#eab308' }
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#f97316', bg: 'rgba(249,115,22,0.10)', dot: '#f97316' }
  if (aqi <= 200) return { label: 'Unhealthy',        color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  dot: '#ef4444' }
  if (aqi <= 300) return { label: 'Very Unhealthy',   color: '#a855f7', bg: 'rgba(168,85,247,0.10)', dot: '#a855f7' }
  return                { label: 'Hazardous',          color: '#7f1d1d', bg: 'rgba(127,29,29,0.18)',  dot: '#dc2626' }
}

function uvLabel(uv) {
  if (uv == null) return '—'
  if (uv <= 2)  return 'Low'
  if (uv <= 5)  return 'Moderate'
  if (uv <= 7)  return 'High'
  if (uv <= 10) return 'Very High'
  return 'Extreme'
}

export default function LandingAQICard() {
  const [aqiData, setAqiData]       = useState(null)
  const [aqiCity, setAqiCity]       = useState(null)
  const [aqiTime, setAqiTime]       = useState(null)
  const [aqiLoading, setAqiLoading] = useState(true)
  const [aqiError, setAqiError]     = useState(false)

  useEffect(() => {
    let cancelled = false
    
    // Defer the API call to avoid blocking the main thread during initial paint/hydration
    const timer = setTimeout(async () => {
      try {
        const ipRes  = await fetch('https://ipinfo.io/json')
        const ipData = await ipRes.json()
        if (cancelled) return
        const city = ipData.city || 'Your Location'
        const [lat, lon] = (ipData.loc || '20.5937,78.9629').split(',')
        setAqiCity(city)

        const aqiRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,uv_index`
        )
        const data = await aqiRes.json()
        if (cancelled) return
        setAqiData(data.current)
        setAqiTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }))
      } catch {
        if (!cancelled) setAqiError(true)
      } finally {
        if (!cancelled) setAqiLoading(false)
      }
    }, 600) // Delay so hero paints first

    return () => { 
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const cat = aqiCategory(aqiData?.us_aqi)

  return (
    <>
      <div className="lp-monitor-panel lp-aqi-card">
        {/* Header */}
        <div className="lp-panel-header">
          <div className="lp-panel-title">
            <Wind size={11} />
            <span>AIR QUALITY INDEX</span>
          </div>
          <div className="lp-panel-status">
            <span className="lp-live-dot" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Location row */}
        <div className="lp-aqi-location">
          <MapPin size={10} style={{ opacity: 0.5 }} />
          <span>{aqiCity || '…'}</span>
        </div>

        {/* Big AQI number */}
        <div className="lp-aqi-hero" style={{ '--aqi-color': cat.color, '--aqi-bg': cat.bg }}>
          {aqiLoading ? (
            <div className="lp-aqi-loading">Fetching…</div>
          ) : aqiError ? (
            <div className="lp-aqi-loading" style={{ color: '#ef4444' }}>Unavailable</div>
          ) : (
            <>
              <div className="lp-aqi-number">{aqiData?.us_aqi ?? '—'}</div>
              <div className="lp-aqi-label-badge" style={{ background: cat.bg, color: cat.color }}>
                <span className="lp-aqi-dot" style={{ background: cat.dot }} />
                {cat.label}
              </div>
            </>
          )}
        </div>

        {/* Pollutant grid */}
        <div className="lp-vitals-grid">
          {[
            { label: 'PM2.5', value: aqiData?.pm2_5?.toFixed(1) ?? '—', unit: 'μg/m³', icon: Droplets },
            { label: 'PM10',  value: aqiData?.pm10?.toFixed(1)  ?? '—', unit: 'μg/m³', icon: Cloud },
            { label: 'Ozone', value: aqiData?.ozone?.toFixed(0) ?? '—', unit: 'μg/m³', icon: Wind },
            { label: 'UV Index', value: aqiData?.uv_index != null ? `${aqiData.uv_index.toFixed(1)}` : '—', unit: uvLabel(aqiData?.uv_index), icon: Flame },
          ].map((v) => (
            <div key={v.label} className="lp-vital-cell lp-vital-safe">
              <div className="lp-vital-label">
                <v.icon size={9} style={{ opacity: 0.5, marginRight: 3 }} />{v.label}
              </div>
              <div className="lp-vital-value">
                {v.value}<span className="lp-vital-unit">{v.unit}</span>
              </div>
              <div className="lp-vital-bar lp-vital-bar-safe" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="lp-panel-footer">
          <span className="lp-panel-footlabel">
            <CheckCircle2 size={9} /> Real-time environmental data
          </span>
          <span className="lp-panel-footlabel lp-panel-timestamp">
            {aqiTime ? `Updated ${aqiTime}` : '…'}
          </span>
        </div>
      </div>

    </>
  )
}
