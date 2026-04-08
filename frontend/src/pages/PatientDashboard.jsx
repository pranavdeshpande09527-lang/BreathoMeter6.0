import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import HealthScoreRing from '../components/HealthScoreRing'
import MetricCard from '../components/MetricCard'
import TrustTag from '../components/TrustTag'
import AlertItem from '../components/AlertItem'
import AQIGauge from '../components/AQIGauge'
import { Wind, Activity, Droplets, ArrowRight, Moon, Sun, Heart, Thermometer, ChevronRight, Stethoscope, ArrowUpRight } from 'lucide-react'
import Logo from '../components/Logo'
import { api } from '../utils/api'
import { playThemeTransition } from '../utils/themeTransition'
import {
    getAQIInsight,
    getLungRiskInsight,
    generateHeroHook
} from '../utils/ClinicalNarrator'
import {
    getAqiContext,
    getHealthScoreContext,
    getBreathQualityContext,
    getRiskLevelContext,
    getTempContext,
    getBreathTrendContext,
    getDoctorMatchReason
} from '../utils/intelligence'
import { applyLivingContext } from '../utils/livingUI'

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div className="chart-tooltip" style={{ fontSize: '12px' }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '16px', letterSpacing: '-0.4px' }}>{payload[0].value}</div>
            </div>
        )
    }
    return null
}

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '4px', margin = '0' }) => (
    <div className="skeleton" style={{ width, height, borderRadius, margin, background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'skeleton-loading 1.5s infinite linear' }} />
)

export default function PatientDashboard() {
    console.log('[PatientDashboard] Component rendering')
    console.log('[PatientDashboard] localStorage size:', localStorage.length)
    console.log('[PatientDashboard] user_data:', localStorage.getItem('user_data'))
    console.log('[PatientDashboard] supabase_token:', !!localStorage.getItem('supabase_token'))

    const navigate = useNavigate()
    const [breathTrend, setBreathTrend] = useState([])
    const [healthScore, setHealthScore] = useState(null)
    const [userName, setUserName] = useState('')
    const [currentAqi, setCurrentAqi] = useState(null)
    const [aqiLocation, setAqiLocation] = useState('Current Location')
    const [alertsData, setAlertsData] = useState([])
    const [latestBreath, setLatestBreath] = useState(null)
    const [latestPrediction, setLatestPrediction] = useState(null)
    const [currentWeather, setCurrentWeather] = useState(null)
    const [appointments, setAppointments] = useState([])
    const [recommendedDoctor, setRecommendedDoctor] = useState(null)
    const [recLoading, setRecLoading] = useState(false)
    const [loading, setLoading] = useState(true)
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
    const [spo2, setSpo2] = useState(null)
    const [heartRate, setHeartRate] = useState(null)

    const nowStr = new Date().toLocaleString()

    // Sync theme attribute + persist whenever theme state changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('theme', theme)
    }, [theme])

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
                
                // User Name Resolution
                if (userData.user_metadata?.full_name) {
                    setUserName(userData.user_metadata.full_name)
                } else if (userData.first_name) {
                    setUserName(`${userData.first_name} ${userData.last_name || ''}`.trim())
                } else if (userData.email) {
                    setUserName(userData.email.split('@')[0])
                }

                if (!userData.id) {
                    setLoading(false)
                    return
                }

                // Parallel Data Ingestion
                const [breathHistory, predHistory, alerts, appsData] = await Promise.allSettled([
                    api.breath.getHistory(userData.id),
                    api.prediction.getHistory(userData.id),
                    api.alerts.getAlerts(userData.id),
                    api.appointments.getForPatient()
                ])

                // Metrics Processing
                if (breathHistory.status === 'fulfilled' && breathHistory.value?.length > 0) {
                    const tests = breathHistory.value
                    setLatestBreath(tests[0])
                    if (tests[0].telemetry) {
                        setSpo2(tests[0].telemetry.spo2 || null)
                        setHeartRate(tests[0].telemetry.heart_rate || null)
                    }
                    const trend = tests.slice(0, 7).reverse().map(item => ({
                        day: new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
                        score: item.test_accuracy ?? item.lung_capacity ?? 70
                    }))
                    setBreathTrend(trend)
                }

                if (predHistory.status === 'fulfilled' && predHistory.value?.length > 0) {
                    const latest = predHistory.value[0]
                    setLatestPrediction(latest)
                    const riskPct = Math.round((latest.final_risk_score ?? 0) * 100)
                    setHealthScore(Math.max(10, 100 - riskPct))
                    
                    // Living UI Contextual Feed
                    localStorage.setItem('bm_last_risk', String(riskPct))
                    applyLivingContext({
                        aqi: parseFloat(localStorage.getItem('bm_last_aqi') || '0') || null,
                        riskScore: riskPct,
                    })

                    // Smart Doctor Routing
                    const disease = latest.primary_disease || latest.top_disease
                    if (disease) {
                        setRecLoading(true)
                        api.doctors.recommend(disease)
                           .then(data => { if (data?.doctors?.length > 0) setRecommendedDoctor(data.doctors[0]); })
                           .finally(() => setRecLoading(false))
                    }
                }

                if (alerts.status === 'fulfilled') setAlertsData(alerts.value?.slice(0, 3) || [])
                if (appsData.status === 'fulfilled' && appsData.value?.appointments) {
                    setAppointments(appsData.value.appointments)
                }
            } catch (err) {
                console.error('Core Dashboard Logic Error:', err)
            } finally {
                setLoading(false)
            }
        }

        async function fetchAQI() {
            if (!navigator.geolocation) return
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const data = await api.environment.getAqi(pos.coords.latitude, pos.coords.longitude)
                    if (data?.aqi != null) {
                        setCurrentAqi(data.aqi)
                        setAqiLocation(data.location_name || 'Current Location')
                        localStorage.setItem('bm_last_aqi', String(data.aqi))
                        applyLivingContext({
                            aqi: data.aqi,
                            riskScore: parseFloat(localStorage.getItem('bm_last_risk') || '0') || null,
                        })
                        if (data.temperature != null) setCurrentWeather({ temp: data.temperature, humidity: data.humidity })
                    }
                } catch (e) { console.warn(e) }
            }, () => console.info('Geoloc Denied'), { timeout: 8000 })
        }

        fetchDashboardData()
        fetchAQI()
    }, [])

    const toggleTheme = (e) => {
        const next = theme === 'light' ? 'dark' : 'light'
        localStorage.setItem('theme', next)
        window.location.reload()
    }

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to log out of your clinical dashboard?")) {
            localStorage.removeItem('supabase_token')
            localStorage.removeItem('user_data')
            sessionStorage.removeItem('supabase_token')
            sessionStorage.removeItem('user_data')
            navigate('/login')
        }
    }

    // Derive metric card values from real data
    const breathQuality = latestBreath
        ? (latestBreath.test_accuracy ?? latestBreath.lung_capacity ?? null)
        : null
    const riskLevel = latestPrediction
        ? Math.round((latestPrediction.final_risk_score ?? 0) * 100)
        : null
    // Metrics derived from component state (live telemetry)

    // Compute trend direction from last 2 data points
    const breathTrendDirection = (() => {
        if (breathTrend.length < 2) return null
        const last  = breathTrend[breathTrend.length - 1]?.score
        const prev  = breathTrend[breathTrend.length - 2]?.score
        if (last == null || prev == null) return null
        const diff = last - prev
        if (Math.abs(diff) < 2) return 'flat'
        return diff > 0 ? 'up' : 'down'
    })()

    const riskTrendDirection = (() => {
        if (!riskLevel) return null
        if (riskLevel < 35) return 'up'   // lower risk = improving
        if (riskLevel < 60) return 'flat'
        return 'down'
    })()

    return (
        <div className="pd-page page-enter" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            {/* ── Dashboard Header ─────────────────────────────────────────── */}
            <header className="pd-header-v3 card-enter-1" style={{ borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24 }}>
                <div className="page-header-row">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <div className="text-label">Welcome back</div>
                            <div className="ai-status-indicator">
                                <span className="ai-status-dot" />
                                Monitoring Active
                            </div>
                        </div>
                        <h1 className="text-page-title fade-in-fast" style={{ 
                            marginTop: 4, 
                            background: theme === 'light' 
                                ? 'linear-gradient(135deg, var(--color-primary) 0%, #0ea5e9 100%)'
                                : 'linear-gradient(135deg, #60A5FA 0%, #38BDF8 100%)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block' 
                        }}>
                            {userName || 'Loading...'}
                        </h1>
                        <div className="text-label anim-fade-in" style={{ opacity: 0.8, marginTop: 4, maxWidth: '600px', textTransform: 'none' }}>
                            {generateHeroHook({ aqi: currentAqi, healthScore: healthScore, riskLevel: riskLevel })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div className="pd-header-logo-box glass-secondary" style={{ padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
                            <Logo size={28} iconOnly={true} />
                        </div>
                    </div>
                </div>
            </header>
            {/* ── Intelligence Layer: Narrator & Doctor Match ───────────────── */}
            <div className={`pd-insights-row ${recommendedDoctor ? 'has-two' : ''}`} style={{ marginBottom: 32 }}>
                {/* Narrator AI Card */}
                {(!loading && (currentAqi || healthScore)) && (
                    <div 
                        className="narrator-card glass-secondary depth-float hover-card card-enter-2"
                        onClick={() => navigate('/hava')}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="narrator-icon-box">
                            <div className="narrator-pulse" />
                            <Activity size={20} className="narrator-icon-v3" />
                        </div>
                        <div className="narrator-body">
                            <h4 className="narrator-label">Clinical Narrator</h4>
                            <div className="narrator-grid">
                                {currentAqi && (
                                    <div className="narrator-item">
                                        <div className="n-status">Air Quality: {getAQIInsight(currentAqi).status}</div>
                                        <p>{getAQIInsight(currentAqi).interpretation}</p>
                                    </div>
                                )}
                                {healthScore && (
                                    <div className="narrator-item">
                                        <div className="n-status">Pulmonary: {getLungRiskInsight(100 - healthScore).level}</div>
                                        <p>{getLungRiskInsight(100 - healthScore).insight}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="narrator-action">
                            <ChevronRight size={18} />
                        </div>
                    </div>
                )}

                {/* Doctor Recommendation Match */}
                {!recLoading && recommendedDoctor && (
                    <div 
                        className="dr-match-card glass-primary depth-float hover-card card-enter-2"
                        onClick={() => navigate(`/doctor-recommendations?disease=${encodeURIComponent(latestPrediction?.primary_disease || latestPrediction?.top_disease)}`)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="dr-match-body">
                            <div className="dr-match-avatar">
                                <Stethoscope size={24} />
                            </div>
                            <div className="dr-match-info">
                                <div className="dr-match-tag">Top Clinical Match</div>
                                <h3 className="dr-match-name">{recommendedDoctor.doctor_name}</h3>
                                <div className="dr-match-specialty">{recommendedDoctor.specialty} • {recommendedDoctor.hospital_name}</div>
                                <div className="dr-match-reason">
                                    {getDoctorMatchReason(recommendedDoctor, latestPrediction?.primary_disease || latestPrediction?.top_disease)}
                                </div>
                            </div>
                            <div className="dr-match-arrow">
                                <ArrowUpRight size={22} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ANCHOR LAYOUT */}
            <div className="pd-anchor-row">
                {/* Health Score */}
                <div className="glass-primary hover-card depth-float pd-anchor-card card-enter-1">
                    <div className="card-header">
                        <div className="text-card-title">Overall Health Score</div>
                    </div>
                    <div className="pd-score-center">
                        {loading ? (
                            <div className="fade-in-fast" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <Skeleton width="160px" height="160px" borderRadius="80px" />
                                <Skeleton width="100px" height="20px" />
                            </div>
                        ) : healthScore != null ? (
                            <div className="fade-in-fast"><HealthScoreRing score={healthScore} label="Health Score" /></div>
                        ) : (
                            <div className="fade-in-fast" style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px 0' }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>–</div>
                                <div className="text-meta">Run your first assessment to see your score</div>
                            </div>
                        )}
                    </div>
                    {/* Contextual health score insight */}
                    {!loading && (() => {
                        const ctx = getHealthScoreContext(healthScore)
                        if (!ctx) return null
                        return (
                            <div style={{ padding: '0 2px 4px', textAlign: 'center' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3 }}>
                                    {ctx.headline}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                                    {ctx.action}
                                </div>
                            </div>
                        )
                    })()}
                    <div className="divider" style={{ margin: '16px 0' }} />
                    <Link to="/breath-analysis" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Start New Analysis <ArrowRight size={14} />
                    </Link>
                    <Link to="/risk-analysis" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
                        View Risk Analysis
                    </Link>
                </div>

                {/* AQI Card */}
                <div className="glass-primary hover-card depth-float pd-anchor-card card-enter-2">
                    <div className="card-header">
                        <div className="text-card-title">Local Air Quality</div>
                    </div>
                    <div className="pd-score-center" style={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                        {currentAqi != null ? (
                            <div className="fade-in-fast"><AQIGauge aqi={currentAqi} location={aqiLocation} /></div>
                        ) : (
                            <div className="fade-in-fast" style={{ textAlign: 'center', color: 'var(--color-muted)', padding: '32px 0' }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>–</div>
                                <div className="text-meta">Allow location access to see live air quality</div>
                            </div>
                        )}
                    </div>
                    {/* AQI contextual insight */}
                    {currentAqi != null && (() => {
                        const ctx = getAqiContext(currentAqi)
                        if (!ctx) return null
                        return (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: ctx.tone === 'safe' ? 'rgba(22,163,74,0.06)'
                                    : ctx.tone === 'moderate' ? 'rgba(245,158,11,0.06)'
                                    : 'rgba(220,38,38,0.06)',
                                border: `1px solid ${ctx.tone === 'safe' ? 'rgba(22,163,74,0.15)' : ctx.tone === 'moderate' ? 'rgba(245,158,11,0.15)' : 'rgba(220,38,38,0.15)'}`,
                                marginBottom: 4,
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginBottom: 3 }}>
                                    {ctx.action}
                                </div>
                            </div>
                        )
                    })()}
                    <div className="divider" style={{ margin: '16px 0' }} />
                    <Link to="/air-quality" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                        Full Air Quality Report
                    </Link>
                </div>

                {/* Right column */}
                <div className="pd-secondary-col">
                    {/* Breath Trend Chart */}
                    <div className="glass-secondary depth-float card-enter-3">
                        <div className="card-header">
                            <div className="text-card-title">7-Day Breath Quality</div>
                            <TrustTag type="ai" />
                        </div>
                        {breathTrend.length > 0 ? (
                            <>
                                {/* Trend insight line */}
                                {(() => {
                                    const insight = getBreathTrendContext(breathTrend)
                                    if (!insight) return null
                                    return (
                                        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginBottom: 12, lineHeight: 1.5, padding: '0 2px' }}>
                                            {insight}
                                        </div>
                                    )
                                })()}
                                <ResponsiveContainer width="100%" height={160}>
                                    <AreaChart data={breathTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="breathGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity={0.35} />
                                                <stop offset="40%"  stopColor="var(--color-primary)" stopOpacity={0.15} />
                                                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0}   />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                                        <XAxis 
                                            dataKey="day" 
                                            tick={{ fontSize: 11, fill: 'var(--color-subtle)', fontWeight: 500 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            domain={[0, 100]} 
                                            tick={{ fontSize: 11, fill: 'var(--color-subtle)', fontWeight: 500 }} 
                                            axisLine={false} 
                                            tickLine={false} 
                                            dx={-5}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--color-primary)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area
                                            type="monotone"
                                            dataKey="score"
                                            stroke="var(--color-primary)"
                                            strokeWidth={3}
                                            fill="url(#breathGrad)"
                                            animationDuration={1500}
                                            dot={{ fill: 'var(--color-primary)', stroke: 'var(--color-surface)', strokeWidth: 2, r: 4 }}
                                            activeDot={{ r: 6, fill: 'var(--color-primary)', stroke: 'white', strokeWidth: 2 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </>
                        ) : (
                            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-muted)', flexDirection: 'column', gap: 8 }}>
                                <div className="text-meta">No breath tests recorded yet.</div>
                                <div style={{ fontSize: 12, color: 'var(--color-subtle)' }}>Complete your first analysis to track trends.</div>
                            </div>
                        )}
                    </div>

                    {/* Recent Alerts */}
                    <div className="glass-secondary depth-float card-enter-4" style={{ marginTop: 16 }}>
                        <div className="card-header">
                            <div className="text-card-title">Health Alerts</div>
                            <Link to="/alerts" className="btn btn-ghost btn-sm">View all</Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {alertsData.length > 0 ? (
                                alertsData.map((a, i) => <AlertItem key={i} {...a} style={{ animationDelay: `${i * 0.06}s` }} className="anim-slide-up" />)
                            ) : (
                                <div className="text-meta" style={{ textAlign: 'center', padding: '16px 0', lineHeight: 1.6 }}>
                                    <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
                                    <div style={{ fontWeight: 600, color: 'var(--color-safe)', marginBottom: 4 }}>All clear — no active alerts.</div>
                                    <div style={{ fontSize: 12, color: 'var(--color-subtle)' }}>Your health indicators are within normal range.</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Appointments */}
                    {appointments.length > 0 && (
                        <div className="glass-secondary hover-card depth-float card-enter-5" style={{ marginTop: 16 }}>
                            <div className="card-header">
                                <div className="text-card-title">My Appointments</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {appointments.map(a => (
                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', transition: 'var(--transition-fast)' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{a.doctor_name || 'Assigned Doctor'}</div>
                                            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{a.disease} • {new Date(a.created_at).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            {a.status === 'accepted' ? (
                                                <Link to={`/chat/${a.id}?role=patient`} className="btn btn-primary btn-sm">Chat</Link>
                                            ) : (
                                                <span className="badge badge-warning">Pending</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Metric Cards — Bottom */}
            <div style={{ marginTop: 32 }} className="card-enter-6">
                <div className="section-title">Your Health Metrics</div>
                <div className="grid-metrics">
                    {(() => {
                        const bqCtx = getBreathQualityContext(breathQuality)
                        return (
                            <MetricCard
                                label="Breath Quality"
                                value={breathQuality != null ? String(breathQuality) : '–'}
                                unit={breathQuality != null ? '/ 100' : ''}
                                range={bqCtx.short}
                                status={breathQuality != null ? (breathQuality >= 75 ? 'normal' : 'warning') : 'normal'}
                                timestamp={bqCtx.sub}
                                icon={Wind}
                                trend={breathTrendDirection}
                            />
                        )
                    })()}
                    {(() => {
                        const rlCtx = getRiskLevelContext(riskLevel)
                        return (
                            <MetricCard
                                label="Respiratory Risk"
                                value={riskLevel != null ? String(riskLevel) : '–'}
                                unit={riskLevel != null ? '/ 100' : ''}
                                range={rlCtx.short}
                                status={riskLevel != null ? (riskLevel < 35 ? 'good' : riskLevel < 60 ? 'warning' : 'danger') : 'normal'}
                                timestamp={rlCtx.sub}
                                icon={Activity}
                                trend={riskTrendDirection}
                            />
                        )
                    })()}
                    {(() => {
                        const tCtx = getTempContext(currentWeather?.temp)
                        return (
                            <MetricCard
                                label="Temperature"
                                value={currentWeather?.temp != null ? String(Math.round(currentWeather.temp)) : '–'}
                                unit={currentWeather?.temp != null ? '°C' : ''}
                                range={tCtx.short}
                                status="normal"
                                timestamp={tCtx.sub}
                                icon={Thermometer}
                                color="#F59E0B"
                            />
                        )
                    })()}
                    {(() => {
                        return (
                            <MetricCard
                                label="Oxygen Saturation"
                                value={spo2 != null ? String(spo2) : '–'}
                                unit={spo2 != null ? '%' : ''}
                                range={spo2 != null ? (spo2 >= 95 ? 'Healthy' : 'Low') : 'Awaiting data'}
                                status={spo2 != null ? (spo2 >= 95 ? 'normal' : 'warning') : 'normal'}
                                timestamp="Live telemetry"
                                icon={Activity}
                                color="#10B981"
                            />
                        )
                    })()}
                    {(() => {
                        return (
                            <MetricCard
                                label="Heart Rate"
                                value={heartRate != null ? String(heartRate) : '–'}
                                unit={heartRate != null ? 'BPM' : ''}
                                range={heartRate != null ? (heartRate <= 100 ? 'Normal' : 'High') : 'Awaiting data'}
                                status={heartRate != null ? (heartRate <= 100 ? 'normal' : 'warning') : 'normal'}
                                timestamp="Live telemetry"
                                icon={Heart}
                                color="#EF4444"
                            />
                        )
                    })()}
                </div>
            </div>

        {/* Clinical Trust Banner — NEW */}
            <div className="glass-card trust-banner anim-slide-up" style={{ marginTop: 40, border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ fontSize: '32px', filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.3))' }}>🔬</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '15px', letterSpacing: '-0.3px' }}>Clinical Monitoring Intelligence</div>
                        <p style={{ fontSize: '13px', color: 'var(--color-muted)', mt: '4px', lineHeight: 1.6 }}>
                            Breathometer 6.0 leverages high-fidelity pulmonary waveform analysis. Our clinical methodology is designed to 
                            detect respiratory variances with clinical grade precision.
                            <br />
                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Always consult a specialist for formal diagnostics.</span>
                        </p>
                    </div>
                    <TrustTag type="ai" />
                </div>
            </div>

            <style>{`
        .pd-anchor-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--sp-md);
          align-items: start;
        }
        .pd-anchor-card {
          display: flex;
          flex-direction: column;
          gap: var(--sp-sm);
          height: 100%;
        }
        .pd-score-center {
          display: flex;
          justify-content: center;
          padding: var(--sp-sm) 0;
        }
        .pd-secondary-col {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        @media (min-width: 640px) {
          .pd-anchor-row {
            grid-template-columns: 1fr 1fr;
          }
          .pd-secondary-col {
            grid-column: span 2;
          }
        }
        @media (min-width: 1024px) {
          .pd-anchor-row {
            grid-template-columns: 1fr 1fr 2fr;
          }
          .pd-secondary-col {
            grid-column: span 1;
          }
        }
        @keyframes skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* Living Doctor Recommendation */
        .dr-match-card {
            padding: 20px 24px;
            border-left: 4px solid var(--color-primary);
            position: relative;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.4);
            -webkit-backdrop-filter: blur(16px) saturate(160%);
            backdrop-filter: blur(16px) saturate(160%);
            transition: var(--transition-medium);
        }
        .dr-match-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(0,0,0,0.08);
            background: rgba(255, 255, 255, 0.55);
        }
        .dr-match-body {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .dr-match-avatar {
            font-size: 40px;
            width: 70px;
            height: 70px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(var(--color-primary-rgb), 0.08);
            border-radius: 18px;
            flex-shrink: 0;
            border: 1px solid rgba(var(--color-primary-rgb), 0.1);
        }
        .dr-match-info {
            flex: 1;
        }
        .dr-match-tag {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 700;
            color: var(--color-primary);
            margin-bottom: 6px;
        }
        .dr-match-name {
            font-size: 18px;
            font-weight: 800;
            margin: 0 0 4px 0;
            color: var(--color-text);
        }
        .dr-match-specialty {
            font-size: 13px;
            color: var(--color-text-2);
            margin-bottom: 8px;
        }
        .dr-match-reason {
            font-size: 13px;
            color: var(--color-muted);
            line-height: 1.4;
            font-style: italic;
        }
        .dr-match-actions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-end;
        }

        /* Narrator Card Styling */
        .narrator-card {
            display: flex;
            gap: 20px;
            padding: 24px;
            background: rgba(255, 255, 255, 0.35);
            -webkit-backdrop-filter: blur(12px) saturate(140%);
            backdrop-filter: blur(12px) saturate(140%);
            border: 1px solid rgba(37, 99, 235, 0.1);
            border-radius: var(--radius-lg);
        }
        .narrator-icon {
            font-size: 32px;
            background: var(--color-primary-light);
            width: 64px; height: 64px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 16px;
            flex-shrink: 0;
            box-shadow: var(--shadow-sm);
        }
        .narrator-label {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--color-primary);
            margin-bottom: 12px;
        }
        .narrator-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
        }
        .narrator-item .n-status {
            font-size: 14px;
            font-weight: 700;
            color: var(--color-text);
            margin-bottom: 4px;
        }
        .narrator-item p {
            font-size: 13px;
            color: var(--color-text-2);
            line-height: 1.5;
            margin: 0;
        }
        @media (max-width: 768px) {
            .narrator-grid { grid-template-columns: 1fr; gap: 16px; }
            .narrator-card { flex-direction: column; }
        }
        @media (max-width: 768px) {
            .dr-match-body {
                flex-direction: column;
                align-items: flex-start;
                text-align: left;
            }
            .dr-match-actions {
                width: 100%;
                flex-direction: row;
                align-items: center;
                justify-content: flex-start;
                margin-top: 10px;
            }
        }

        .grid-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        .pd-page {
            width: 100%;
            max-width: 100%;
            overflow-x: hidden;
            box-sizing: border-box;
        }
        .pd-insights-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 24px;
        }
        @media (min-width: 768px) {
            .pd-insights-row.has-two {
                grid-template-columns: 1fr 1fr;
            }
        }
        @media (max-width: 639px) {
            .page-content { padding: 16px 12px; }
        }
      `}</style>
        </div>
    )
}
