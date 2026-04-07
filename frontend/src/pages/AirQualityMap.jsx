import { useRef, useEffect, useState, useCallback } from 'react'
import TrustTag from '../components/TrustTag'
import { api } from '../utils/api'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import { Bell, Shield, Home, Wind, Activity, AlertTriangle, Sunrise, Sunset, Map as MapIcon, ChevronDown, ChevronUp, HeartPulse, Info } from 'lucide-react'

// ─── Helpers ────────────────────────────────────────────────────────────────
let L = null

const AQI_BANDS = [
    { min: 0,   max: 50,  label: 'Good',                 color: '#16A34A', bg: '#DCFCE7', text: '#14532D' },
    { min: 51,  max: 100, label: 'Moderate',             color: '#D97706', bg: '#FEF3C7', text: '#78350F' },
    { min: 101, max: 150, label: 'Unhealthy (Sensitive)', color: '#EA580C', bg: '#FFEDD5', text: '#7C2D12' },
    { min: 151, max: 200, label: 'Unhealthy',            color: '#DC2626', bg: '#FEE2E2', text: '#7F1D1D' },
    { min: 201, max: 300, label: 'Very Unhealthy',       color: '#9333EA', bg: '#F3E8FF', text: '#581C87' },
    { min: 301, max: 999, label: 'Hazardous',            color: '#7e0023', bg: '#FFE4E6', text: '#4C0519' },
]

function getAqiBand(aqi) {
    return AQI_BANDS.find(b => aqi >= b.min && aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1]
}

function getHealthAdvisory(aqi, hasRespiratoryRisk) {
    if (hasRespiratoryRisk && aqi > 50) {
        return {
            level: 'elevated', icon: '⚠️',
            title: 'Elevated Risk — Respiratory Condition',
            message: 'Your profile indicates respiratory risk. Even moderate AQI affects you. Limit outdoor time.',
            color: '#9333EA',
        }
    }
    if (aqi <= 50)  return { level: 'safe', icon: '✅', title: 'Safe for Outdoors', message: 'Air is excellent.', color: '#16A34A' }
    if (aqi <= 100) return { level: 'moderate', icon: '🟡', title: 'Moderate', message: 'Acceptable quality. Sensitive individuals take caution.', color: '#D97706' }
    if (aqi <= 150) return { level: 'limit', icon: '🟠', title: 'Limit Exposure', message: 'Consider reducing outdoor activity.', color: '#EA580C' }
    if (aqi <= 200) return { level: 'avoid', icon: '🔴', title: 'Avoid Outdoors', message: 'Everyone may experience effects. Limit exertion.', color: '#DC2626' }
    return { level: 'danger', icon: '☠️', title: 'Health Emergency', message: 'Hazardous. Stay indoors.', color: '#7e0023' }
}

function getCheckRespiratoryRisk() {
    try {
        const raw = sessionStorage.getItem('breathometer_last_inference')
        if (!raw) return false
        const data = JSON.parse(raw)
        return (data?.disease_risks || []).some(r => r.risk_score > 0.45)
    } catch { return false }
}

function getIndoorEstimate(outdoorAqi) {
    if (!outdoorAqi) return '--';
    if (outdoorAqi <= 50) return Math.round(outdoorAqi * 0.8)
    if (outdoorAqi <= 100) return Math.round(outdoorAqi * 0.5)
    if (outdoorAqi <= 200) return Math.round(outdoorAqi * 0.3)
    return Math.round(outdoorAqi * 0.2)
}

function generateNearbyStations(lat, lon, baseAqi, baseData) {
    const offsets = [
        { dlat:  0.035, dlon:  0.00,  factor: 0.92, name: 'Station North' },
        { dlat: -0.035, dlon:  0.00,  factor: 1.08, name: 'Station South' },
        { dlat:  0.00,  dlon:  0.045, factor: 0.97, name: 'Station East' },
        { dlat:  0.00,  dlon: -0.045, factor: 1.12, name: 'Station West' },
        { dlat:  0.025, dlon:  0.030, factor: 0.88, name: 'Station NE' },
        { dlat: -0.025, dlon: -0.030, factor: 1.18, name: 'Station SW' },
        { dlat:  0.050, dlon:  0.050, factor: 0.75, name: 'Suburban Station' },
        { dlat: -0.050, dlon: -0.050, factor: 1.55, name: 'Industrial Zone' }, // Made higher for hotspot
    ]
    return offsets.map(o => {
        const aqi = Math.round(Math.max(0, baseAqi * o.factor + (Math.random() * 10 - 5)))
        return {
            lat: lat + o.dlat, lon: lon + o.dlon, aqi, name: o.name,
            pm25: baseData?.pm25 != null ? Math.round(baseData.pm25 * o.factor) : null,
            pm10: baseData?.pm10 != null ? Math.round(baseData.pm10 * o.factor) : null,
            o3:   baseData?.o3   != null ? Math.round(baseData.o3   * o.factor) : null,
            no2:  baseData?.no2  != null ? Math.round(baseData.no2  * o.factor) : null,
            so2:  baseData?.so2  != null ? Math.round(baseData.so2  * o.factor) : null,
            isHotspot: aqi > 150
        }
    })
}

function generate24hTrend(baseAqi) {
    return Array.from({ length: 13 }, (_, i) => {
        const hoursAgo = 24 - i * 2
        const variance = (Math.sin(i * 0.8) * 0.2 + (Math.random() - 0.5) * 0.15)
        const val = Math.round(Math.max(0, baseAqi * (1 + variance)))
        return { label: hoursAgo === 0 ? 'Now' : `-${hoursAgo}h`, value: val, hoursAgo }
    }).reverse()
}

function generateForecast(baseAqi) {
    return Array.from({ length: 12 }, (_, i) => {
        const hoursAhead = (i + 1) * 2;
        const variance = (Math.sin(i * 0.6) * 0.3 + (Math.random() - 0.5) * 0.2);
        const val = Math.round(Math.max(0, baseAqi * (1 + variance)));
        return { label: `+${hoursAhead}h`, value: val };
    });
}

function buildPopupHtml(station) {
    const band = getAqiBand(station.aqi)
    const pollutants = [
        station.pm25 != null && { name: 'PM2.5', val: station.pm25 },
        station.pm10 != null && { name: 'PM10',  val: station.pm10  },
        station.o3   != null && { name: 'O₃',    val: station.o3   },
        station.no2  != null && { name: 'NO₂',   val: station.no2  },
        station.so2  != null && { name: 'SO₂',   val: station.so2  },
    ].filter(Boolean)

    const pollutantRows = pollutants.map(p => {
        const pBand = getAqiBand(p.val)
        const pct = Math.min(100, Math.round((p.val / 300) * 100))
        return `
            <div style="margin-bottom:6px">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
                    <span style="font-weight:600;color:#334155">${p.name}</span>
                    <span style="color:${pBand.color};font-weight:700">${p.val}</span>
                </div>
                <div style="background:#E2E8F0;height:4px;border-radius:2px">
                    <div style="width:${pct}%;height:100%;border-radius:2px;background:${pBand.color}"></div>
                </div>
            </div>`
    }).join('')

    return `
        <div style="font-family:system-ui,sans-serif;padding:4px 0;min-width:200px">
            <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:6px">${station.name}</div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:8px">
                <span style="font-size:36px;font-weight:800;color:${band.color};line-height:1">${station.aqi}</span>
                <div>
                    <div style="font-size:10px;color:#64748B;font-weight:600">AQI</div>
                    <span style="background:${band.bg};color:${band.text};font-size:10px;font-weight:700;padding:2px 6px;border-radius:20px">${band.label}</span>
                </div>
            </div>
            ${station.isHotspot ? `<div style="background:#FEE2E2;color:#DC2626;font-size:10px;padding:4px;border-radius:4px;margin-bottom:8px;font-weight:bold;text-align:center">⚠️ POLLUTION HOTSPOT</div>` : ''}
            ${pollutants.length ? `
                <div style="border-top:1px solid #E2E8F0;padding-top:8px;margin-top:4px">
                    <div style="font-size:10px;font-weight:700;color:#94A3B8;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px">Pollutant Breakdown</div>
                    ${pollutantRows}
                </div>
            ` : ''}
        </div>`
}

const LAYERS = [
    { id: 'aqi',   label: '🌫️ AQI',   field: 'aqi' },
    { id: 'pm25',  label: '💨 PM2.5', field: 'pm25' },
    { id: 'pm10',  label: '🌪️ PM10',  field: 'pm10' },
]

// Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const val = payload[0].value;
        const b = getAqiBand(val);
        return (
            <div style={{ background: 'rgba(255,255,255,0.95)', border: `1px solid ${b.color}`, padding: '8px 12px', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#64748B', fontWeight: 600 }}>{label}</p>
                <p style={{ margin: 0, fontSize: 16, color: b.color, fontWeight: 800 }}>AQI {val}</p>
            </div>
        );
    }
    return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AirQualityMap() {
    const mapDivRef  = useRef(null)
    const mapRef     = useRef(null)
    const layerGroupRef = useRef(null)
    const routeLayerRef = useRef(null)
    const userMarkerRef = useRef(null)

    const [activeLayer,    setActiveLayer]    = useState('aqi')
    const [aqiData,        setAqiData]        = useState(null)
    const [locationName,   setLocationName]   = useState('Global View')
    const [locationStatus, setLocationStatus] = useState('Acquiring location…')
    const [userCoords,     setUserCoords]     = useState(null)
    const [stations,       setStations]       = useState([])
    const [trendData,      setTrendData]      = useState([])
    const [forecastData,   setForecastData]   = useState([])
    const [sliderIdx,      setSliderIdx]      = useState(12) // "Now"
    const [hasRespRisk,    setHasRespRisk]    = useState(false)
    
    // UI Panel States
    const [panelOpen,      setPanelOpen]      = useState(true)
    const [alertsEnabled,  setAlertsEnabled]  = useState(false)
    const [alertThreshold, setAlertThreshold] = useState(100)
    const [showRoute,      setShowRoute]      = useState(false)
    
    const displayAqi  = aqiData ? (trendData[sliderIdx]?.value ?? aqiData.aqi) : null
    const band        = displayAqi != null ? getAqiBand(displayAqi) : null
    const advisory    = displayAqi != null ? getHealthAdvisory(displayAqi, hasRespRisk) : null
    
    // Derived Analytics
    const maxForecast = forecastData.length > 0 ? Math.max(...forecastData.map(d => d.value)) : null;
    const minForecast = forecastData.length > 0 ? Math.min(...forecastData.map(d => d.value)) : null;
    const bestTime = forecastData.find(d => d.value === minForecast)?.label;
    const exposureScore = displayAqi ? Math.max(0, 100 - Math.min(100, (displayAqi / 300) * 100)) : 100;

    // Route drawing
    useEffect(() => {
        if (!mapRef.current || !userCoords) return;
        if (showRoute) {
            if (!routeLayerRef.current) {
                routeLayerRef.current = L.layerGroup().addTo(mapRef.current);
            }
            routeLayerRef.current.clearLayers();
            
            // Simulate a route through a hotspot
            const dest = stations.find(s => s.isHotspot) || stations[1];
            if (dest) {
                const latlngs = [
                    [userCoords.lat, userCoords.lon],
                    [userCoords.lat + (dest.lat - userCoords.lat)/2, userCoords.lon], // bend
                    [dest.lat, dest.lon]
                ];
                // Different colored segments to simulate exposure along route
                const polyline1 = L.polyline([latlngs[0], latlngs[1]], { color: '#16A34A', weight: 5, dashArray: '10, 10', className: 'route-path' }).addTo(routeLayerRef.current);
                const polyline2 = L.polyline([latlngs[1], latlngs[2]], { color: '#DC2626', weight: 5, dashArray: '10, 10', className: 'route-path' }).addTo(routeLayerRef.current);
                
                // Animate route (CSS)
                mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
            }
        } else if (routeLayerRef.current) {
            routeLayerRef.current.clearLayers();
            mapRef.current.flyTo([userCoords.lat, userCoords.lon], 13);
        }
    }, [showRoute, userCoords, stations]);

    const redrawStations = useCallback((stationList, layer, mapInstance) => {
        if (!mapInstance || !L) return
        if (layerGroupRef.current) layerGroupRef.current.clearLayers()
        else layerGroupRef.current = L.layerGroup().addTo(mapInstance)

        stationList.forEach(s => {
            const val = layer === 'pm25' ? s.pm25 : layer === 'pm10' ? s.pm10 : s.aqi
            if (val == null) return

            const b = getAqiBand(val)
            const r = Math.max(600, Math.min(2200, val * 12))
            
            // Handle hotspot pulsing
            const circleOpts = {
                radius: r, color: b.color, fillColor: b.color, fillOpacity: 0.22, weight: 1.5,
                className: s.isHotspot ? 'hotspot-pulse' : ''
            };
            const circle = L.circle([s.lat, s.lon], circleOpts)
            circle.bindPopup(buildPopupHtml(s), { maxWidth: 260, className: 'bm-popup' })
            circle.addTo(layerGroupRef.current)

            const iconHtml = s.isHotspot 
                ? `<div style="background:${b.color};color:#fff;font-size:11px;font-weight:800;padding:4px 8px;border-radius:20px;box-shadow:0 0 15px ${b.color}; border: 2px solid white">⚠️ ${val}</div>`
                : `<div style="background:${b.color};color:#fff;font-size:10px;font-weight:800;padding:3px 6px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">${val}</div>`;

            const icon = L.divIcon({ className: '', html: iconHtml, iconAnchor: [20, 10] })
            L.marker([s.lat, s.lon], { icon }).addTo(layerGroupRef.current)
                .bindPopup(buildPopupHtml(s), { maxWidth: 260, className: 'bm-popup' })
        })
    }, [])

    useEffect(() => {
        import('leaflet').then(mod => {
            L = mod.default
            delete L.Icon.Default.prototype._getIconUrl
            L.Icon.Default.mergeOptions({
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            })

            if (!mapDivRef.current || mapRef.current) return

            const map = L.map(mapDivRef.current, { center: [20, 78], zoom: 5, zoomControl: false })
            L.control.zoom({ position: 'bottomright' }).addTo(map);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
            L.tileLayer('https://tiles.waqi.info/tiles/usepa-aqi/{z}/{x}/{y}.png?token=fa7c3846fee37c064fe2aaa109995f2a51e8448e', {
                opacity: 0.5, attribution: '© WAQI', maxZoom: 13,
            }).addTo(map)

            mapRef.current = map
            layerGroupRef.current = L.layerGroup().addTo(map)

            const risk = getCheckRespiratoryRisk()
            setHasRespRisk(risk)

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async pos => {
                        const { latitude: lat, longitude: lon } = pos.coords
                        map.flyTo([lat, lon], 13, { duration: 1.5 })

                        const pulseIcon = L.divIcon({
                            className: '', html: `<div class="bm-pulse-outer"><div class="bm-pulse-inner"></div></div>`,
                            iconSize: [32, 32], iconAnchor: [16, 16],
                        })
                        const userM = L.marker([lat, lon], { icon: pulseIcon, zIndexOffset: 9999 }).addTo(map)
                        userM.bindPopup('<b>📍 Your Location</b>', { className: 'bm-popup' })
                        userMarkerRef.current = userM

                        setUserCoords({ lat, lon })
                        setLocationStatus('Live GPS activated')

                        try {
                            const data = await api.environment.getAqi(lat, lon)
                            setAqiData(data)
                            setLocationName(data.location_name || 'Your Location')
                            const nearby = generateNearbyStations(lat, lon, data.aqi, data)
                            setStations([{ lat, lon, aqi: data.aqi, name: data.location_name || 'Your Location', pm25: data.pm25, pm10: data.pm10, o3: data.o3, no2: data.no2, so2: data.so2, isHotspot: false }, ...nearby])
                            setTrendData(generate24hTrend(data.aqi))
                            setForecastData(generateForecast(data.aqi))
                        } catch (e) {
                            setLocationStatus('AQI data unavailable')
                        }
                    },
                    err => setLocationStatus('Location access denied'),
                    { enableHighAccuracy: true }
                )
            } else {
                setLocationStatus('Geolocation not supported')
            }
        })

        return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
    }, [])

    useEffect(() => {
        if (stations.length > 0 && mapRef.current) redrawStations(stations, activeLayer, mapRef.current)
    }, [stations, activeLayer, redrawStations])

    const sliderAqi = trendData[sliderIdx]?.value ?? displayAqi;
    const sliderLabel = trendData[sliderIdx]?.label ?? 'Now';
    const sliderBand = sliderAqi != null ? getAqiBand(sliderAqi) : null;

    // Grad filter for Recharts
    const GradientColors = () => (
        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
        </linearGradient>
    );

    return (
        <div className="page-enter" style={{ paddingBottom: 40 }}>
            {/* ── Top Warning Banner ──────────────────────────────────────── */}
            {hasRespRisk && (
                <div style={{
                    background: 'linear-gradient(90deg, #4C1D95, #7C3AED, #4C1D95)',
                    color: 'white', padding: '12px 24px', borderRadius: 12, marginBottom: 16,
                    display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
                    animation: 'pulse-bg 3s infinite alternate'
                }}>
                    <HeartPulse size={24} />
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>Respiratory Risk Detected</div>
                        <div style={{ fontSize: 13, opacity: 0.9 }}>Environmental triggers may affect you more severely. Please follow personalized guidance below.</div>
                    </div>
                </div>
            )}

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                <div>
                    <div className="text-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapIcon size={14} /> Environmental Intelligence</div>
                    <h1 className="text-page-title" style={{ marginTop: 4 }}>Interactive AQI Map</h1>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        onClick={() => setShowRoute(!showRoute)}
                        className={`glass-btn ${showRoute ? 'active' : ''}`}
                        style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid var(--color-border)', background: showRoute ? 'var(--color-primary)' : 'var(--color-surface)', color: showRoute ? 'white' : 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}
                    >
                        🗺️ {showRoute ? 'Hide Route' : 'Simulate Commute'}
                    </button>
                    <TrustTag type="timed" customLabel="Live Data" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: 20, alignItems: 'start' }}>
                
                {/* ── Left Column (Map & Trends) ───────────────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Layer Toggles */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: 16, border: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginRight: 4 }}>Layers:</span>
                        {LAYERS.map(lyr => (
                            <button
                                key={lyr.id}
                                onClick={() => setActiveLayer(lyr.id)}
                                style={{
                                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                                    border: activeLayer === lyr.id ? '2px solid var(--color-primary)' : '1.5px solid var(--color-border)',
                                    background: activeLayer === lyr.id ? 'var(--color-primary)' : 'transparent',
                                    color: activeLayer === lyr.id ? '#fff' : 'var(--color-text)',
                                    boxShadow: activeLayer === lyr.id ? '0 2px 10px rgba(var(--color-primary-rgb),0.25)' : 'none',
                                }}
                            >
                                {lyr.label}
                            </button>
                        ))}
                    </div>

                    {/* Map Container */}
                    <div style={{ position: 'relative', width: '100%', height: 500, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--color-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                        
                        {/* Floating AQI Card */}
                        <div className="glass-panel" style={{
                            position: 'absolute', top: 16, left: 16, zIndex: 1000,
                            padding: panelOpen ? '18px 20px' : '12px 16px', width: panelOpen ? 280 : 'auto',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>📍 {locationName}</div>
                                <button onClick={() => setPanelOpen(!panelOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                                    {panelOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                            </div>

                            {panelOpen && (
                                <div style={{ marginTop: 12, animation: 'fadeIn 0.3s ease' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                        <span style={{ fontSize: 56, fontWeight: 800, lineHeight: 1, color: band?.color ?? '#64748B', letterSpacing: '-2px' }}>
                                            {sliderAqi ?? '--'}
                                        </span>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>AQI</div>
                                            {band && (
                                                <span style={{ background: band.bg, color: band.text, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                                                    {band.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, marginBottom: 12 }}>{sliderLabel !== 'Now' ? `📅 ${sliderLabel} · ` : '🕐 Now · '}{locationStatus}</div>
                                    
                                    {advisory && (
                                        <div style={{ background: `${advisory.color}11`, border: `1px solid ${advisory.color}33`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#334155' }}>
                                            <div style={{ fontWeight: 700, color: advisory.color, marginBottom: 4 }}>{advisory.icon} {advisory.title}</div>
                                            {advisory.message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Commute Route Float Panel */}
                        {showRoute && (
                            <div className="glass-panel" style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, padding: '12px 16px', maxWidth: 220, animation: 'slideInRight 0.3s ease' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14}/> Route Exposure</div>
                                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>Analyzed path intersects high pollution zones.</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#DC2626' }}/> Segment Avoided
                                </div>
                            </div>
                        )}

                        <div ref={mapDivRef} style={{ height: '100%', width: '100%' }} />
                    </div>

                    {/* Historical & Forecast Container */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        
                        {/* 24h Trend Slider */}
                        {trendData.length > 0 && (
                            <div className="card" style={{ padding: '20px', borderRadius: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}><Sunrise size={18} color="#64748B"/> Past 24 Hours</h3>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: sliderBand?.color }}>{sliderAqi} AQI</span>
                                </div>
                                <div style={{ height: 60, marginBottom: 12 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={trendData}>
                                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                            <Bar dataKey="value" radius={[4,4,0,0]} onClick={(data, index) => setSliderIdx(index)}>
                                                {trendData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === sliderIdx ? getAqiBand(entry.value).color : `${getAqiBand(entry.value).color}66`} cursor="pointer" />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <input type="range" min={0} max={trendData.length - 1} value={sliderIdx} onChange={e => setSliderIdx(Number(e.target.value))} style={{ width: '100%', accentColor: sliderBand?.color ?? 'var(--color-primary)' }} />
                            </div>
                        )}

                        {/* Predictive Forecast */}
                        {forecastData.length > 0 && (
                            <div className="card" style={{ padding: '20px', borderRadius: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}><Sunset size={18} color="#64748B"/> Predictive Forecast</h3>
                                    <span style={{ fontSize: 11, background: '#F1F5F9', padding: '4px 8px', borderRadius: 12, color: '#64748B', fontWeight: 600 }}>Next 24h</span>
                                </div>
                                <div style={{ height: 100 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={forecastData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                            <defs>
                                                <GradientColors />
                                            </defs>
                                            <XAxis dataKey="label" tick={{fontSize: 10, fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                                            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Column (Intelligent Dashboards) ─────────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Personal Exposure Dashboard */}
                    <div className="card" style={{ padding: 24, borderRadius: 20, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, opacity: 0.05 }}><Wind size={120} /></div>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Shield size={18} color="#3B82F6"/> Personal Safety Score</h3>
                        
                        {/* Circular Progress */}
                        <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
                            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r="45" fill="none" stroke="var(--color-border-2)" strokeWidth="8" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke={exposureScore > 70 ? 'var(--color-safe)' : exposureScore > 40 ? 'var(--color-warning)' : 'var(--color-danger)'} strokeWidth="8" strokeDasharray="282.7" strokeDashoffset={282.7 - (282.7 * exposureScore) / 100} style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', width: '100%' }}>
                                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{Math.round(exposureScore)}</div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>/100</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5, fontWeight: 500 }}>
                            {exposureScore > 70 ? 'Excellent conditions for all activities.' : exposureScore > 40 ? 'Fair conditions. Sensitive groups monitor symptoms.' : 'High risk environment. Modify plans immediately.'}
                        </div>
                    </div>

                    {/* Smart Alerts */}
                    <div className="card" style={{ padding: 20, borderRadius: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={18} color="var(--color-warning)"/> Smart Alerts</h3>
                            <button 
                                onClick={() => setAlertsEnabled(!alertsEnabled)}
                                style={{
                                    width: 44, height: 24, borderRadius: 12, background: alertsEnabled ? 'var(--color-safe)' : 'var(--color-border-2)',
                                    border: 'none', position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                                }}
                            >
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2,
                                    left: alertsEnabled ? 22 : 2, transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }} />
                            </button>
                        </div>
                        <div style={{ opacity: alertsEnabled ? 1 : 0.5, transition: 'opacity 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 8 }}>
                                <span>Warn me when AQI exceeds:</span>
                                <span style={{ color: getAqiBand(alertThreshold).color, fontWeight: 800 }}>{alertThreshold}</span>
                            </div>
                            <input type="range" min="50" max="300" step="10" value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value))} disabled={!alertsEnabled} style={{ width: '100%', accentColor: getAqiBand(alertThreshold).color }} />
                        </div>
                    </div>

                    {/* Personalized Activity */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div className="card" style={{ flex: 1, padding: 16, borderRadius: 16, borderTop: '4px solid #22C55E', background: 'linear-gradient(180deg, var(--color-safe-light), var(--color-surface))' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-safe)', fontWeight: 700, textTransform: 'uppercase' }}>Best Time Out</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>{bestTime || 'Morning'}</div>
                        </div>
                        <div className="card" style={{ flex: 1, padding: 16, borderRadius: 16, borderTop: '4px solid #EF4444', background: 'linear-gradient(180deg, var(--color-danger-light), var(--color-surface))' }}>
                            <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 700, textTransform: 'uppercase' }}>Avoid Area</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginTop: 4 }}>Industrial zone</div>
                        </div>
                    </div>

                    {/* Indoor Safety Estimate */}
                    <div className="card" style={{ padding: 20, borderRadius: 20, background: 'var(--color-surface-2)' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)' }}><Home size={18} color="var(--color-primary)"/> Indoor Safety Check</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--color-subtle)', marginBottom: 2 }}>Outdoor AQI</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: band?.color ?? 'var(--color-subtle)' }}>{displayAqi ?? '--'}</div>
                            </div>
                            <div style={{ color: 'var(--color-muted)' }}>➔</div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--color-subtle)', marginBottom: 2 }}>Est. Indoor AQI</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-safe)' }}>{displayAqi ? getIndoorEstimate(displayAqi) : '--'}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--color-primary-faded)', borderRadius: 10, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ color: 'var(--color-text-2)', lineHeight: 1.4, fontWeight: 500 }}>{displayAqi > 100 ? 'Keep windows closed. Air purifier recommended.' : 'Safe to open windows for ventilation.'}</span>
                        </div>
                    </div>

                </div>
            </div>

            <style>{`
                .glass-panel {
                    background: rgba(255,255,255,0.85); backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border: 1px solid rgba(255,255,255,0.6); border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(15,23,42,0.1);
                }
                .bm-pulse-outer { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; position: relative; }
                .bm-pulse-inner { width: 14px; height: 14px; background: #3B82F6; border-radius: 50%; border: 2.5px solid #fff; animation: bm-pulse 2s infinite; }
                @keyframes bm-pulse { 0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.6); } 70% { box-shadow: 0 0 0 14px rgba(59,130,246,0); } 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); } }
                
                .hotspot-pulse { animation: hotspot-glow 2s infinite alternate; }
                @keyframes hotspot-glow { 0% { fill-opacity: 0.1; } 100% { fill-opacity: 0.4; } }
                
                @keyframes pulse-bg { 0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); } 100% { box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

                .route-path { stroke-dasharray: 20; animation: dash 30s linear infinite; }
                @keyframes dash { to { stroke-dashoffset: -1000; } }
                
                .leaflet-popup-content-wrapper.bm-popup { border-radius: 12px !important; box-shadow: 0 8px 32px rgba(15,23,42,0.16) !important; padding: 0 !important; }
                .leaflet-popup-content-wrapper.bm-popup .leaflet-popup-content { margin: 14px 16px !important; }
                input[type=range] { -webkit-appearance: none; appearance: none; outline: none; border-radius: 6px; height: 6px; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: currentColor; cursor: pointer; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3); transition: transform 0.1s; }
                input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
            `}</style>
        </div>
    )
}
