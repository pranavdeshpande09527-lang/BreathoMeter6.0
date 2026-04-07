import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft, Phone, MapPin, Star, Briefcase, Award, Trophy, ChevronDown } from 'lucide-react'
import { getDoctorMatchReason } from '../utils/intelligence'

const SORT_OPTIONS = [
    { key: 'score',      label: 'Smart Score' },
    { key: 'experience', label: 'Experience' },
    { key: 'name',       label: 'Name (A–Z)' },
]

function DoctorCard({ doctor, rank, disease }) {
    const isTopRated   = doctor.tags?.includes('Most Experienced')
    const isMostExp    = doctor.tags?.includes('Most Experienced')
    const isFirst      = rank === 0

    const expColor = doctor.experience >= 25
        ? 'var(--color-safe)'
        : doctor.experience >= 15
            ? 'var(--color-primary)'
            : 'var(--color-text-2)'

    const cleanPhone = doctor.phone?.replace(/\s+/g, '') || ''
    const matchReason = getDoctorMatchReason(doctor, disease)

    return (
        <div className={`dr-card ${isFirst ? 'dr-card--top' : ''}`}>
            {/* Rank badge */}
            <div className="dr-rank">
                {isFirst ? <Trophy size={16} /> : `#${rank + 1}`}
            </div>

            {/* Top badges */}
            {(isTopRated || isMostExp) && (
                <div className="dr-badges">
                    {isTopRated && (
                        <span className="dr-badge dr-badge--rated">
                            <Star size={10} fill="currentColor" /> Best Rated
                        </span>
                    )}
                    {isMostExp && (
                        <span className="dr-badge dr-badge--exp">
                            <Briefcase size={10} /> Most Experienced
                        </span>
                    )}
                </div>
            )}

            <div className="dr-card-body">
                {/* Avatar + Identity */}
                <div className="dr-identity">
                    <div className="dr-avatar">
                        {rank % 2 === 0 ? '👩‍⚕️' : '👨‍⚕️'}
                    </div>
                    <div className="dr-identity-info">
                        <div className="dr-name">{doctor.doctor_name}</div>
                        <div className="dr-specialty">{doctor.specialty}</div>
                        <div className="dr-hospital">{doctor.hospital_name}</div>
                        {doctor.city && <div className="dr-city-tag">📍 {doctor.city}</div>}
                        {/* Match reason insight */}
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5, fontStyle: 'italic' }}>
                            {matchReason}
                        </div>
                    </div>
                </div>

                {/* Metrics row */}
                <div className="dr-metrics">
                    <div className="dr-metric" title="Experience">
                        <div className="dr-metric-icon" style={{ color: expColor }}>
                            <Award size={14} />
                        </div>
                        <div className="dr-metric-val" style={{ color: expColor }}>
                            {doctor.experience}+
                        </div>
                        <div className="dr-metric-label">Yrs Exp</div>
                    </div>

                    <div className="dr-metric" title="Smart Score">
                        <div className="dr-metric-icon" style={{ color: 'var(--color-primary)' }}>
                            <Trophy size={14} />
                        </div>
                        <div className="dr-metric-val" style={{ color: 'var(--color-primary)' }}>
                            {Math.round((doctor.score ?? 0) * 100)}
                        </div>
                        <div className="dr-metric-label">Score</div>
                    </div>

                    <div className="dr-metric" title="Qualification">
                        <div className="dr-metric-icon">
                            <Star size={14} />
                        </div>
                        <div className="dr-metric-val" style={{ fontSize: 10, lineHeight: 1.3, color: 'var(--color-text-2)', fontWeight: 600 }}>
                            {doctor.qualification || '—'}
                        </div>
                        <div className="dr-metric-label">Qual.</div>
                    </div>
                </div>

                {/* Address */}
                {doctor.address && (
                    <div className="dr-address">
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{doctor.address}</span>
                    </div>
                )}

                {/* CTA Row */}
                <div className="dr-actions">
                    {cleanPhone && (
                        <a
                            href={`tel:${cleanPhone}`}
                            className="btn btn-primary btn-sm dr-call-btn"
                            id={`call-btn-${rank}`}
                        >
                            <Phone size={13} />
                            {doctor.phone}
                        </a>
                    )}
                    {!cleanPhone && (
                        <span className="dr-no-phone text-meta">Phone not available</span>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function DoctorRecommendations() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const disease = searchParams.get('disease') || ''

    const [loading, setLoading]   = useState(false)
    const [error, setError]       = useState(null)
    const [result, setResult]     = useState(null)   // full API response
    const [sortBy, setSortBy]     = useState('score')
    const [cityInput, setCityInput] = useState('')
    const [searchCity, setSearchCity] = useState('')  // committed city for search
    const [isFallback, setIsFallback] = useState(false)

    const fetchDoctors = useCallback(async (cityOverride) => {
        if (!disease) return
        setLoading(true)
        setError(null)
        setIsFallback(false)
        try {
            const data = await api.doctors.recommend(disease, cityOverride || undefined)
            
            // If no specialists found, fall back to General Physician
            if (data?.doctors?.length === 0) {
                console.info('No specific specialists found, falling back to General Physician')
                const fallbackData = await api.doctors.recommend('General Physician', cityOverride || undefined)
                if (fallbackData?.doctors?.length > 0) {
                    setResult({
                        ...fallbackData,
                        message: `Specific specialists for ${disease} are currently unavailable in this area. We recommend starting with a General Physician for a clinical referral.`
                    })
                    setIsFallback(true)
                } else {
                    setResult(data)
                }
            } else {
                setResult(data)
            }
        } catch (err) {
            console.error('Failed to fetch doctors:', err)
            setError('Could not load recommendations. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [disease])

    useEffect(() => {
        fetchDoctors()
    }, [fetchDoctors])

    const handleCitySearch = () => {
        const c = cityInput.trim()
        setSearchCity(c)
        fetchDoctors(c)
    }

    const sortedDoctors = () => {
        if (!result?.doctors) return []
        const docs = [...result.doctors]
        if (sortBy === 'experience') return docs.sort((a, b) => b.experience - a.experience)
        if (sortBy === 'name')       return docs.sort((a, b) => a.doctor_name.localeCompare(b.doctor_name))
        return docs  // score (default, already sorted DESC by backend)
    }

    const doctors = sortedDoctors()

    return (
        <div className="page-enter dr-page">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(-1)}
                            id="back-btn"
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                        <div>
                            <div className="text-label">Specialist Finder</div>
                            <h1 className="text-page-title" style={{ marginTop: 4 }}>
                                Find a Specialist Who Can Help
                                {disease && <span className="dr-disease-label"> · {disease}</span>}
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-header: city override */}
            <div className="dr-search-bar card">
                <div className="dr-search-inner">
                    <MapPin size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <input
                        type="text"
                        className="form-input dr-city-input"
                        placeholder="Override city (e.g. Pune, Mumbai, Nagpur, Aurangabad)"
                        value={cityInput}
                        onChange={e => setCityInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
                        id="city-search-input"
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleCitySearch}
                        disabled={loading}
                        id="city-search-btn"
                        style={{ whiteSpace: 'nowrap' }}
                    >
                        {loading ? 'Searching...' : 'Search City'}
                    </button>
                </div>
                {result?.city_used && (
                    <div className="dr-city-used text-meta">
                        📍 Showing doctors in: <strong>{result.city_used}</strong>
                        {result.expanded && (
                            <span className="dr-expanded-pill">Expanded · All Maharashtra</span>
                        )}
                    </div>
                )}
            </div>

            {/* Expanded fallback or informative message */}
            {result?.message && (
                <div className={`dr-fallback-msg card ${isFallback ? 'dr-fallback-msg--active' : ''}`}>
                    <span style={{ fontSize: 16 }}>{isFallback ? '🩺' : 'ℹ️'}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: isFallback ? 700 : 400, color: isFallback ? 'var(--color-primary)' : 'inherit', marginBottom: isFallback ? 4 : 0 }}>
                            {isFallback ? 'Guided Recommendation' : 'Information'}
                        </div>
                        <span>{result.message}</span>
                    </div>
                </div>
            )}

            {/* Sort controls */}
            {!loading && doctors.length > 0 && (
                <div className="dr-controls">
                    <div className="text-label" style={{ alignSelf: 'center' }}>
                        {result?.total} matching specialists found · Sort by:
                    </div>
                    <div className="dr-sort-pills">
                        {SORT_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                className={`dr-sort-pill ${sortBy === opt.key ? 'active' : ''}`}
                                onClick={() => setSortBy(opt.key)}
                                id={`sort-${opt.key}`}
                            >
                                {opt.label}
                                {sortBy === opt.key && <ChevronDown size={12} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="card dr-loading-card">
                    <div className="dr-pulse-icon">🏥</div>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                        Finding the right specialists for you...
                    </div>
                    <div className="text-meta">Matching {disease} against our clinical database — this takes just a moment.</div>
                    <div className="dr-loading-dots">
                        <span /><span /><span />
                    </div>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="card" style={{ padding: 32, textAlign: 'center', border: '1px solid var(--color-danger-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: 8 }}>
                        {error}
                    </div>
                    <button className="btn btn-outline" onClick={() => fetchDoctors(searchCity)}>
                        Retry
                    </button>
                </div>
            )}

            {/* No disease param */}
            {!loading && !error && !disease && (
                <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>No condition specified</div>
                    <div className="text-meta">Select a condition from your Risk Analysis to find matching specialists near you.</div>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/risk-analysis')}>
                        Return to Risk Analysis
                    </button>
                </div>
            )}

            {/* Empty results */}
            {!loading && !error && disease && doctors.length === 0 && (
                <div className="card" style={{ padding: 48, textAlign: 'center', background: 'var(--color-surface)', border: '1.5px dashed var(--color-border)' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: 'var(--color-text)' }}>
                        No clinical practitioners found in this area
                    </div>
                    <div className="text-meta" style={{ marginBottom: 24, maxWidth: 450, margin: '0 auto 24px' }}>
                        We've checked for both specialists in <strong>{disease}</strong> and general practitioners, but none were found in your current vicinity. 
                        Try expanding your search to a larger city or refreshing your location.
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => fetchDoctors()}>
                            Retry Search
                        </button>
                        <button className="btn btn-outline" onClick={() => navigate('/risk-analysis')}>
                            Return Home
                        </button>
                    </div>
                </div>
            )}

            {/* Doctor Cards Grid */}
            {!loading && !error && doctors.length > 0 && (
                <div className="dr-grid">
                    {doctors.map((doc, idx) => (
                        <DoctorCard key={`${doc.doctor_name}-${idx}`} doctor={doc} rank={idx} disease={isFallback ? 'Initial Consultation' : disease} />
                    ))}
                </div>
            )}

            {/* Inline styles */}
            <style>{`
                /* ── Page Layout ── */
                .dr-page { max-width: 1100px; }

                .dr-disease-label {
                    color: var(--color-primary);
                    font-size: 0.75em;
                    font-weight: 600;
                    letter-spacing: 0;
                }

                /* ── Search Bar ── */
                .dr-search-bar {
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: var(--color-surface);
                    border-radius: 16px;
                    border: 1px solid var(--color-border);
                }
                .dr-search-inner {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .dr-city-input {
                    flex: 1;
                    padding: 8px 14px;
                    font-size: 14px;
                }
                .dr-city-used {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                }
                .dr-expanded-pill {
                    background: rgba(var(--color-warning-rgb, 255,165,0), 0.12);
                    color: var(--color-warning, #f59e0b);
                    padding: 2px 10px;
                    border-radius: 30px;
                    font-size: 11px;
                    font-weight: 600;
                }

                /* ── Fallback msg ── */
                .dr-fallback-msg {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 14px 18px;
                    background: rgba(var(--color-warning-rgb, 255,165,0), 0.07);
                    border: 1px solid rgba(var(--color-warning-rgb, 255,165,0), 0.25);
                    border-radius: 14px;
                    line-height: 1.5;
                    color: var(--color-text-2);
                    transition: all 0.3s ease;
                }
                .dr-fallback-msg--active {
                    border-left: 4px solid var(--color-primary);
                    background: rgba(var(--color-primary-rgb), 0.04);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                }

                /* ── Controls ── */
                .dr-controls {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    flex-wrap: wrap;
                }
                .dr-sort-pills {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .dr-sort-pill {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    padding: 6px 14px;
                    border-radius: 30px;
                    border: 1.5px solid var(--color-border);
                    background: var(--color-surface);
                    color: var(--color-text-2);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.18s ease;
                }
                .dr-sort-pill:hover {
                    border-color: var(--color-primary);
                    color: var(--color-primary);
                }
                .dr-sort-pill.active {
                    background: var(--color-primary);
                    border-color: var(--color-primary);
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(var(--color-primary-rgb), 0.3);
                }

                /* ── Loading ── */
                .dr-loading-card {
                    text-align: center;
                    padding: 48px 32px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                }
                .dr-pulse-icon {
                    font-size: 48px;
                    animation: drPulse 1.4s ease-in-out infinite;
                    margin-bottom: 8px;
                }
                @keyframes drPulse {
                    0%, 100% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.15); opacity: 1; }
                }
                .dr-loading-dots {
                    display: flex;
                    gap: 6px;
                    margin-top: 12px;
                }
                .dr-loading-dots span {
                    width: 8px; height: 8px;
                    background: var(--color-primary);
                    border-radius: 50%;
                    animation: dotBounce 1.2s ease-in-out infinite;
                }
                .dr-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
                .dr-loading-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes dotBounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }

                /* ── Grid ── */
                .dr-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 20px;
                }

                /* ── Doctor Card ── */
                .dr-card {
                    background: var(--color-surface);
                    border: 1.5px solid var(--color-border);
                    border-radius: 20px;
                    padding: 20px;
                    position: relative;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    overflow: hidden;
                }
                .dr-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 16px 40px rgba(0,0,0,0.10);
                    border-color: rgba(var(--color-primary-rgb), 0.3);
                }
                .dr-card--top {
                    border-color: var(--color-primary);
                    background: linear-gradient(135deg, var(--color-surface) 0%, rgba(var(--color-primary-rgb), 0.04) 100%);
                    box-shadow: 0 8px 32px rgba(var(--color-primary-rgb), 0.12);
                }
                .dr-card--top::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, var(--color-primary), #4a90e2);
                    border-radius: 20px 20px 0 0;
                }

                /* Rank badge */
                .dr-rank {
                    position: absolute;
                    top: 14px; right: 14px;
                    width: 32px; height: 32px;
                    border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 11px; font-weight: 800;
                    background: var(--color-border);
                    color: var(--color-text-2);
                }
                .dr-card--top .dr-rank {
                    background: linear-gradient(135deg, var(--color-primary), #4a90e2);
                    color: #fff;
                    box-shadow: 0 4px 10px rgba(var(--color-primary-rgb), 0.35);
                }

                /* Badges */
                .dr-badges {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                .dr-badge {
                    display: flex; align-items: center; gap: 4px;
                    padding: 3px 10px;
                    border-radius: 30px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }
                .dr-badge--rated {
                    background: rgba(var(--color-safe-rgb, 34,197,94), 0.12);
                    color: var(--color-safe, #22c55e);
                }
                .dr-badge--exp {
                    background: rgba(var(--color-primary-rgb), 0.1);
                    color: var(--color-primary);
                }

                /* Identity */
                .dr-card-body { display: flex; flex-direction: column; gap: 14px; }
                .dr-identity { display: flex; gap: 14px; align-items: flex-start; }
                .dr-avatar {
                    font-size: 36px;
                    width: 52px; height: 52px;
                    border-radius: 14px;
                    background: var(--color-border);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }
                .dr-identity-info { flex: 1; min-width: 0; }
                .dr-name {
                    font-size: 15px; font-weight: 800;
                    color: var(--color-text);
                    margin-bottom: 3px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .dr-specialty {
                    font-size: 12px; font-weight: 600;
                    color: var(--color-primary);
                    margin-bottom: 2px;
                }
                .dr-hospital {
                    font-size: 12px;
                    color: var(--color-text-2);
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .dr-city-tag {
                    font-size: 11px;
                    color: var(--color-muted);
                    margin-top: 2px;
                }

                /* Metrics */
                .dr-metrics {
                    display: flex;
                    gap: 0;
                    background: rgba(var(--color-primary-rgb), 0.03);
                    border: 1px solid var(--color-border);
                    border-radius: 12px;
                    overflow: hidden;
                }
                .dr-metric {
                    flex: 1;
                    display: flex; flex-direction: column; align-items: center;
                    gap: 3px;
                    padding: 10px 8px;
                    border-right: 1px solid var(--color-border);
                }
                .dr-metric:last-child { border-right: none; }
                .dr-metric-icon { color: var(--color-text-2); }
                .dr-metric-val {
                    font-size: 15px; font-weight: 800;
                    color: var(--color-text);
                }
                .dr-metric-label {
                    font-size: 10px; font-weight: 600;
                    color: var(--color-muted);
                    text-transform: uppercase; letter-spacing: 0.04em;
                }

                /* Address */
                .dr-address {
                    display: flex; align-items: flex-start; gap: 7px;
                    font-size: 12px;
                    color: var(--color-text-2);
                    line-height: 1.5;
                }

                /* CTA */
                .dr-actions { display: flex; gap: 8px; align-items: center; }
                .dr-call-btn {
                    display: flex; align-items: center; gap: 7px;
                    font-size: 13px !important;
                    padding: 8px 14px !important;
                    border-radius: 10px !important;
                    flex: 1;
                    justify-content: center;
                    text-decoration: none;
                    transition: all 0.18s ease;
                }
                .dr-call-btn:hover {
                    transform: scale(1.02);
                    box-shadow: 0 6px 16px rgba(var(--color-primary-rgb), 0.3);
                }
                .dr-no-phone {
                    font-size: 12px;
                    font-style: italic;
                }

                /* Responsive */
                @media (max-width: 600px) {
                    .dr-grid { grid-template-columns: 1fr; }
                    .dr-controls { flex-direction: column; align-items: flex-start; }
                }
            `}</style>
        </div>
    )
}
