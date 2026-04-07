import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../utils/api'

export default function Step7Environment({ data, update }) {
    const [fetchStatus, setFetchStatus] = useState('idle') // idle | loading | success | error
    const debounceRef = useRef(null)

    const fetchAQIForCity = useCallback(async (city) => {
        if (!city || city.trim().length < 2) return
        setFetchStatus('loading')

        try {
            const result = await api.environment.getAqiByCity(city.trim())
            update({
                aqi: result.aqi ?? null,
                pm25: result.pm25 ?? null,
                pm10: result.pm10 ?? null,
                no2: result.no2 ?? null,
                o3: result.o3 ?? null,
                so2: result.so2 ?? null,
                co: result.co ?? null,
                temperature: result.temperature ?? null,
                humidity: result.humidity ?? null,
            })
            setFetchStatus('success')
        } catch (err) {
            console.warn('AQI fetch by city failed:', err)
            // Clear any previous AQI data on failure
            update({
                aqi: null, pm25: null, pm10: null,
                no2: null, o3: null, so2: null, co: null
            })
            setFetchStatus('error')
        }
    }, [update])

    const handleCityChange = (e) => {
        const city = e.target.value
        update({ city })
        setFetchStatus('idle')

        // Debounce 1 second
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (city.trim().length >= 2) {
            debounceRef.current = setTimeout(() => {
                fetchAQIForCity(city)
            }, 1000)
        }
    }

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h2 className="text-card-title" style={{ marginBottom: 4 }}>Section 7: Environmental Exposure</h2>
                <div className="text-meta">Pollution and workplace respiratory risks.</div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="city">City / Location</label>
                <input
                    id="city"
                    type="text"
                    placeholder="e.g. New Delhi, Mumbai, Nashik"
                    className="form-input"
                    value={data.city || ''}
                    onChange={handleCityChange}
                />
                {/* Fetch status indicator */}
                {fetchStatus === 'loading' && (
                    <div className="text-meta" style={{ marginTop: 6, color: 'var(--color-primary)' }}>
                        ⏳ Fetching real-time AQI for {data.city}...
                    </div>
                )}
                {fetchStatus === 'error' && (
                    <div className="text-meta" style={{ marginTop: 6, color: 'var(--color-danger)' }}>
                        ⚠️ Could not fetch AQI for this city. AQI service may be unavailable. Please enter values manually below or try a different city name.
                    </div>
                )}
            </div>

            {/* Real AQI data from API */}
            {fetchStatus === 'success' && data.aqi != null && (
                <div className="card" style={{ padding: '16px', background: 'var(--color-bg)', border: '1px solid var(--color-warning-muted)', borderLeft: '4px solid var(--color-warning)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div className="text-label" style={{ color: 'var(--color-warning)' }}>Live AQI Data</div>
                        <div className="badge badge-warning">AQI {data.aqi}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        {data.pm25 != null && <div className="text-meta">PM2.5<br /><strong style={{ color: 'var(--color-text)' }}>{data.pm25} µg/m³</strong></div>}
                        {data.pm10 != null && <div className="text-meta">PM10<br /><strong style={{ color: 'var(--color-text)' }}>{data.pm10} µg/m³</strong></div>}
                        {data.no2 != null && <div className="text-meta">NO₂<br /><strong style={{ color: 'var(--color-text)' }}>{data.no2} ppb</strong></div>}
                        {data.o3 != null && <div className="text-meta">O₃<br /><strong style={{ color: 'var(--color-text)' }}>{data.o3} ppb</strong></div>}
                        {data.so2 != null && <div className="text-meta">SO₂<br /><strong style={{ color: 'var(--color-text)' }}>{data.so2} ppb</strong></div>}
                        {data.co != null && <div className="text-meta">CO<br /><strong style={{ color: 'var(--color-text)' }}>{data.co} ppm</strong></div>}
                        {data.temperature != null && <div className="text-meta">Temp<br /><strong style={{ color: 'var(--color-text)' }}>{data.temperature}°C</strong></div>}
                        {data.humidity != null && <div className="text-meta">Humidity<br /><strong style={{ color: 'var(--color-text)' }}>{data.humidity}%</strong></div>}
                    </div>
                </div>
            )}

            {/* Manual AQI fallback (only show if API failed or city too short) */}
            {(fetchStatus === 'error' || (!data.aqi && data.city && data.city.length >= 2)) && (
                <div className="form-group">
                    <label className="form-label" htmlFor="manual_aqi">AQI (manual entry)</label>
                    <input
                        id="manual_aqi"
                        type="number"
                        min="0"
                        max="500"
                        placeholder="Enter AQI value manually"
                        className="form-input"
                        value={data.aqi || ''}
                        onChange={e => update({ aqi: e.target.value ? parseFloat(e.target.value) : null })}
                    />
                </div>
            )}

            <div className="form-group">
                <label className="form-label" htmlFor="outdoor">Hours spent outdoors daily</label>
                <input
                    id="outdoor"
                    type="number"
                    min="0"
                    max="24"
                    className="form-input"
                    value={data.outdoorHours || ''}
                    onChange={e => update({ outdoorHours: e.target.value })}
                />
            </div>

            <div className="form-group">
                <label className="form-label">Work environment</label>
                <select className="form-input" value={data.workEnv || ''} onChange={e => update({ workEnv: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="Office">Office</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Outdoor">Outdoor</option>
                    <option value="Dusty environment">Dusty environment</option>
                </select>
            </div>

            <div className="form-group">
                <label className="form-label">Exposure to smoke or chemicals</label>
                <select className="form-input" value={data.chemicalExp || ''} onChange={e => update({ chemicalExp: e.target.value })}>
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Occasional">Occasional</option>
                    <option value="Frequent">Frequent</option>
                </select>
            </div>
        </div>
    )
}
