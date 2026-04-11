import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AQIGauge from '../components/AQIGauge'
import TrustTag from '../components/TrustTag'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { api } from '../utils/api'

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => (
    <div className="skeleton" style={{ width, height, borderRadius, margin, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-loading 1.5s infinite linear' }} />
)

// Derive activity recommendations purely from real AQI value
function getActivityRecommendations(aqi) {
    if (aqi <= 50) return [
        { label: 'Outdoor Jogging', safe: true, note: 'Safe — excellent conditions for all activity' },
        { label: 'Walking', safe: true, note: 'Air quality is satisfactory' },
        { label: 'Indoor Exercise', safe: true, note: 'Safe' },
        { label: 'Cycling', safe: true, note: 'Good conditions' },
    ]
    if (aqi <= 100) return [
        { label: 'Outdoor Jogging', safe: true, note: 'Acceptable — sensitive groups should limit prolonged exertion' },
        { label: 'Walking', safe: true, note: 'Generally safe' },
        { label: 'Indoor Exercise', safe: true, note: 'Recommended for sensitive groups' },
        { label: 'Cycling', safe: true, note: 'Acceptable for healthy adults' },
    ]
    if (aqi <= 150) return [
        { label: 'Outdoor Jogging', safe: false, note: 'Not recommended for sensitive groups' },
        { label: 'Walking', safe: true, note: 'Acceptable with mask' },
        { label: 'Indoor Exercise', safe: true, note: 'Safer option — stay indoors' },
        { label: 'Cycling', safe: false, note: 'Avoid prolonged outdoor exposure' },
    ]
    if (aqi <= 200) return [
        { label: 'Outdoor Jogging', safe: false, note: 'Avoid — everyone may experience health effects' },
        { label: 'Walking', safe: false, note: 'Keep outdoor time minimal' },
        { label: 'Indoor Exercise', safe: true, note: 'Safe — stay indoors' },
        { label: 'Cycling', safe: false, note: 'Avoid' },
    ]
    return [
        { label: 'Outdoor Jogging', safe: false, note: 'Health emergency — avoid all outdoor exertion' },
        { label: 'Walking', safe: false, note: 'Avoid outdoors' },
        { label: 'Indoor Exercise', safe: true, note: 'Stay indoors, keep windows closed' },
        { label: 'Cycling', safe: false, note: 'Avoid' },
    ]
}

// Derive AQI category label from value
function getAqiCategory(aqi) {
    if (aqi <= 50) return { label: 'Good', cls: 'badge-safe' }
    if (aqi <= 100) return { label: 'Moderate', cls: 'badge-warning' }
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive', cls: 'badge-warning' }
    if (aqi <= 200) return { label: 'Unhealthy', cls: 'badge-danger' }
    if (aqi <= 300) return { label: 'Very Unhealthy', cls: 'badge-danger' }
    return { label: 'Hazardous', cls: 'badge-danger' }
}

// Derive health impact string
function getHealthImpact(aqi) {
    if (aqi <= 50) return 'Little to no risk for all groups'
    if (aqi <= 100) return 'Sensitive groups may be affected'
    if (aqi <= 150) return 'Sensitive groups experience health effects'
    if (aqi <= 200) return 'Everyone may experience health effects'
    if (aqi <= 300) return 'Health emergency for all'
    return 'Serious health risk — hazardous conditions'
}

// Derive primary pollutant from real data
function getPrimaryPollutant(aqiData) {
    if (!aqiData) return 'Unknown'
    const candidates = [
        { name: 'PM2.5', val: aqiData.pm25 },
        { name: 'PM10', val: aqiData.pm10 },
        { name: 'NO₂', val: aqiData.no2 },
        { name: 'O₃', val: aqiData.o3 },
        { name: 'SO₂', val: aqiData.so2 },
    ].filter(c => c.val != null)
    if (candidates.length === 0) return 'Unknown'
    return candidates.sort((a, b) => b.val - a.val)[0].name
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                <div style={{ color: 'var(--color-muted)' }}>{label}</div>
                <div style={{ fontWeight: 700 }}>AQI: {payload[0].value}</div>
            </div>
        )
    }
    return null
}

export default function AirQuality() {
    const [aqiData, setAqiData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [locationName, setLocationName] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [error, setError] = useState(null)
    const [emailState, setEmailState] = useState('idle') // idle | sending | sent | error
    const navigate = useNavigate()
    const urlLocation = useLocation()
    const queryParams = new URLSearchParams(urlLocation.search)
    const cityQuery = queryParams.get('city')

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/air-quality?city=${encodeURIComponent(searchQuery.trim())}`)
        }
    }

    const handleSendReport = async () => {
        if (emailState === 'sending') return
        setEmailState('sending')
        try {
            await api.email.sendReport({
                aqi: aqiData?.aqi,
                city: locationName || undefined,
            })
            setEmailState('sent')
            toast.success('📊 Health report sent to your email!')
            setTimeout(() => setEmailState('idle'), 4000)
        } catch (err) {
            setEmailState('error')
            setTimeout(() => setEmailState('idle'), 3000)
        }
    }

    useEffect(() => {
        async function fetchRealAQI() {
            setLoading(true)
            setError(null)

            // If a city was searched via the search bar
            if (cityQuery) {
                try {
                    const data = await api.environment.getAqiByCity(cityQuery)
                    setAqiData(data)
                    setLocationName(data.location_name || cityQuery)
                    setLoading(false)
                    // Also store to backend so danger alerts fire for city searches
                    try {
                        await api.environment.storeData({
                            pm25: data.pm25 ?? 0,
                            pm10: data.pm10 ?? 0,
                            aqi: data.aqi,
                            location: data.location_name || cityQuery
                        })
                    } catch (storeErr) {
                        console.warn('Could not store environment data to backend:', storeErr)
                    }
                    return
                } catch (e) {
                    console.error('Search fetch failed:', e)
                    setError(`Could not find AQI data for "${cityQuery}". Please try a different city name.`)
                    setLoading(false)
                    return
                }
            }

            if (!navigator.geolocation) {
                // No geo support and no city searched
                setError('Geolocation is not supported by your browser. Please use the search bar to look up a city.')
                setLoading(false)
                return
            }

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const data = await api.environment.getAqi(pos.coords.latitude, pos.coords.longitude)
                        setAqiData(data)
                        setLocationName(data.location_name || 'Your Location')

                        // Store real data to backend for history tracking
                        try {
                            await api.environment.storeData({
                                pm25: data.pm25 ?? 0,
                                pm10: data.pm10 ?? 0,
                                aqi: data.aqi,
                                location: data.location_name || 'Unknown'
                            })
                        } catch (storeErr) {
                            console.warn('Could not store environment data to backend:', storeErr)
                        }
                    } catch (e) {
                        setError('Failed to fetch AQI data. The AQI service may be temporarily unavailable.')
                    } finally {
                        setLoading(false)
                    }
                },
                async (err) => {
                    // Location denied — do NOT fallback to any hardcoded city
                    setError('Location access denied. Please enable location permissions or use the search bar to find a city.')
                    setLoading(false)
                },
                { enableHighAccuracy: true, timeout: 10000 }
            )
        }

        fetchRealAQI()
    }, [cityQuery])

    // Build pollutant cards from real data
    // NOTE: WAQI iaqi.pm25.v etc. are AQI sub-indices (0–500), NOT raw concentrations in μg/m³.
    // The sub-index for the dominant pollutant will equal the overall AQI — this is expected & correct.
    const buildPollutants = (d) => {
        if (!d) return []
        const subStatus = (val) => {
            if (val <= 50) return { status: 'Good', cls: 'badge-safe' }
            if (val <= 100) return { status: 'Moderate', cls: 'badge-warning' }
            if (val <= 150) return { status: 'Unhealthy (Sensitive)', cls: 'badge-warning' }
            if (val <= 200) return { status: 'Unhealthy', cls: 'badge-danger' }
            return { status: 'Very Unhealthy', cls: 'badge-danger' }
        }
        return [
            d.pm25 != null && { name: 'PM2.5', value: Math.round(d.pm25), unit: 'sub-idx', safe: '≤ 50', ...subStatus(d.pm25) },
            d.pm10 != null && { name: 'PM10',  value: Math.round(d.pm10), unit: 'sub-idx', safe: '≤ 50', ...subStatus(d.pm10) },
            d.o3   != null && { name: 'O₃',    value: Math.round(d.o3),   unit: 'sub-idx', safe: '≤ 50', ...subStatus(d.o3) },
            d.no2  != null && { name: 'NO₂',   value: Math.round(d.no2),  unit: 'sub-idx', safe: '≤ 50', ...subStatus(d.no2) },
            d.so2  != null && { name: 'SO₂',   value: Math.round(d.so2),  unit: 'sub-idx', safe: '≤ 50', ...subStatus(d.so2) },
            d.co   != null && { name: 'CO',     value: Math.round(d.co),   unit: 'sub-idx', safe: '≤ 50', ...subStatus(d.co) },
        ].filter(Boolean)
    }

    const pollutants = buildPollutants(aqiData)
    const activities = aqiData ? getActivityRecommendations(aqiData.aqi) : []
    const category = aqiData ? getAqiCategory(aqiData.aqi) : null

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Environmental Health</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Air Quality</h1>
                    </div>
                    <div className="aq-header-actions">
                        <form onSubmit={handleSearch} className="search-bar-form">
                            <input
                                type="text"
                                placeholder="Search city..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            <button type="submit" className="search-btn">
                                🔍
                            </button>
                        </form>
                        <TrustTag type="timed" customLabel={`Updated: ${new Date().toLocaleString()}`} />
                        {aqiData && (
                            <button
                                className={`aq-report-btn aq-report-btn--${emailState}`}
                                onClick={handleSendReport}
                                disabled={emailState === 'sending'}
                                title="Send a health report to your email"
                            >
                                {emailState === 'sending' && <span className="aq-report-spinner" />}
                                {emailState === 'sent' && '✅'}
                                {emailState === 'error' && '❌'}
                                {emailState === 'idle' && '📊'}
                                <span>
                                    {emailState === 'sending' ? 'Sending...' :
                                     emailState === 'sent' ? 'Report Sent!' :
                                     emailState === 'error' ? 'Failed' :
                                     'Send Report'}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <div style={{ fontSize: 42, marginBottom: 16 }}>🌍</div>
                    <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 10, color: 'var(--color-text)' }}>Acquiring Real-time Data...</div>
                    <Skeleton width="240px" height="14px" margin="0 auto" />
                </div>
            )}

            {/* Error state */}
            {!loading && error && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--color-danger-muted)' }}>
                    <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--color-danger)', marginBottom: 8 }}>Unable to load AQI data</div>
                    <div className="text-meta">{error}</div>
                </div>
            )}

            {/* Data loaded */}
            {!loading && !error && aqiData && (
                <>
                    {/* ANCHOR ROW — AQIGauge + Pollutants grid */}
                    <div className="aq-anchor-row">
                        <div className="glass-primary depth-float card-enter" style={{ padding: '24px' }}>
                            <div className="text-card-title" style={{ marginBottom: 4 }}>Current AQI</div>
                            <div className="text-meta" style={{ marginBottom: 20 }}>{locationName}</div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <AQIGauge aqi={aqiData.aqi} location={locationName} />
                            </div>
                            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(var(--color-primary-rgb), 0.05)', borderRadius: 12, fontSize: 12, color: 'var(--color-subtle)', lineHeight: 1.5, border: '1px solid rgba(var(--color-primary-rgb), 0.1)' }}>
                                <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Technical Note</div>
                                The Air Quality Index (AQI) is defined by the highest sub-index among major pollutants. If PM2.5 is the dominant pollutant, the overall AQI will match the PM2.5 index.
                            </div>
                            <div className="divider" style={{ margin: '20px 0' }} />
                            <div className="aq-gauge-info">
                                <div className="aq-info-row">
                                    <span className="text-meta">Category</span>
                                    <span className={`badge ${category.cls}`}>{category.label}</span>
                                </div>
                                <div className="aq-info-row">
                                    <span className="text-meta">Health Impact</span>
                                    <span className="text-meta">{getHealthImpact(aqiData.aqi)}</span>
                                </div>
                                <div className="aq-info-row">
                                    <span className="text-meta">Primary Pollutant</span>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{getPrimaryPollutant(aqiData)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Pollutant Grid */}
                        <div className="aq-pollutants-panel">
                            <div className="section-title" style={{ marginBottom: 12 }}>Pollutant Levels</div>
                            {pollutants.length > 0 ? (
                                <div className="aq-pollutants-grid">
                                    {pollutants.map((p, idx) => (
                                        <div key={p.name} className={`glass-secondary depth-float hover-card aq-pollutant-card card-enter-${(idx % 4) + 1}`}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{p.name}</div>
                                                <span className={`badge ${p.cls}`}>{p.status}</span>
                                            </div>
                                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
                                                {p.value}
                                                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-muted)', marginLeft: 3 }}>{p.unit}</span>
                                            </div>
                                            <div className="text-meta" style={{ marginTop: 5 }}>Safe: {p.safe} {p.unit}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-meta" style={{ padding: '20px 0' }}>Detailed pollutant breakdown not available for this station.</div>
                            )}
                        </div>
                    </div>

                    {/* Weather Row */}
                    <div style={{ marginTop: 24 }} className="card-enter-2">
                        <div className="section-title" style={{ marginBottom: 12 }}>Current weather</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                            <div className="glass-secondary depth-float hover-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: 'var(--color-primary-light)', padding: 10, borderRadius: 10 }}>🌡️</div>
                                <div>
                                    <div className="text-meta">Temperature</div>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{aqiData.temperature != null ? `${Math.round(aqiData.temperature)}°C` : '–'}</div>
                                </div>
                            </div>
                            <div className="glass-secondary depth-float hover-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: '#E0F2FE', padding: 10, borderRadius: 10 }}>💧</div>
                                <div>
                                    <div className="text-meta">Humidity</div>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{aqiData.humidity != null ? `${Math.round(aqiData.humidity)}%` : '–'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity recommendations */}
                    <div className="aq-lower-row card-enter-3" style={{ marginTop: 20 }}>
                        <div className="glass-secondary depth-float">
                            <div className="text-card-title" style={{ marginBottom: 16 }}>AQI Level Reference</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {[
                                    { range: '0–50', label: 'Good', cls: 'badge-safe', desc: 'Little to no risk' },
                                    { range: '51–100', label: 'Moderate', cls: 'badge-warning', desc: 'Acceptable quality' },
                                    { range: '101–150', label: 'Unhealthy (Sensitive)', cls: 'badge-warning', desc: 'Sensitive groups affected' },
                                    { range: '151–200', label: 'Unhealthy', cls: 'badge-danger', desc: 'Everyone affected' },
                                    { range: '201–300', label: 'Very Unhealthy', cls: 'badge-danger', desc: 'Health alert' },
                                    { range: '301–500', label: 'Hazardous', cls: 'badge-danger', desc: 'Health emergency' },
                                ].map(r => (
                                    <div key={r.range} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.range}</span>
                                        <span className={`badge ${r.cls}`}>{r.label}</span>
                                        <span className="text-meta">{r.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-secondary depth-float">
                            <div className="text-card-title" style={{ marginBottom: 16 }}>Activity Recommendations</div>
                            <div className="text-meta" style={{ marginBottom: 12 }}>Based on current AQI: <strong>{aqiData.aqi}</strong></div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {activities.map(a => (
                                    <div key={a.label} className="aq-activity-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</span>
                                            <span className={`badge ${a.safe ? 'badge-safe' : 'badge-danger'}`}>
                                                {a.safe ? 'Safe' : 'Avoid'}
                                            </span>
                                        </div>
                                        <div className="text-meta" style={{ marginTop: 2 }}>{a.note}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <style>{`
        .aq-anchor-row {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: var(--sp-md);
          align-items: start;
        }
        .aq-header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .aq-gauge-card {
          display: flex;
          flex-direction: column;
        }
        .aq-gauge-info {
          display: flex;
          flex-direction: column;
        }
        .aq-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 9px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .aq-info-row:last-child { border-bottom: none; }
        .aq-pollutants-panel {}
        .aq-pollutants-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .aq-pollutant-card {
          padding: 16px;
        }
        .aq-lower-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-md);
        }
        .aq-activity-item {
          padding: 12px;
          background: rgba(var(--color-bg-rgb, 255, 255, 255), 0.5);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          transition: transform 0.2s ease, background 0.2s ease;
        }
        .aq-activity-item:hover {
          transform: translateX(4px);
          background: rgba(var(--color-bg-rgb, 255, 255, 255), 0.8);
        }
        .search-bar-form {
          display: flex;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          padding: 4px;
          transition: all 0.2s;
        }
        .search-bar-form:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-faded);
        }
        .search-input {
          background: transparent;
          border: none;
          padding: 6px 12px;
          font-size: 14px;
          color: var(--color-text);
          outline: none;
          width: 180px;
        }
        .search-btn {
          background: var(--color-primary);
          border: none;
          color: white;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .search-btn:hover {
          opacity: 0.9;
        }
        @media (max-width: 900px) {
          .aq-anchor-row, .aq-lower-row { grid-template-columns: 1fr; }
          .aq-pollutants-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── Send Report Button ───────────────────────────────────────── */
        .aq-report-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1.5px solid var(--color-primary);
          background: linear-gradient(135deg, var(--color-primary), #3b82f6);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4,0,0.2,1);
          white-space: nowrap;
          font-family: var(--font-family);
          box-shadow: 0 4px 14px rgba(37,99,235,0.28);
        }
        .aq-report-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37,99,235,0.40);
        }
        .aq-report-btn:active:not(:disabled) {
          transform: scale(0.96);
        }
        .aq-report-btn:disabled {
          opacity: 0.70;
          cursor: not-allowed;
        }
        .aq-report-btn--sent {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          border-color: #16a34a;
          box-shadow: 0 4px 14px rgba(22,163,74,0.28);
        }
        .aq-report-btn--error {
          background: linear-gradient(135deg, #dc2626, #ef4444);
          border-color: #dc2626;
          box-shadow: 0 4px 14px rgba(220,38,38,0.28);
        }
        .aq-report-btn--sending {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-color: #6366f1;
        }

        /* Spinner inside button */
        .aq-report-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          display: inline-block;
          animation: aq-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes aq-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    )
}
