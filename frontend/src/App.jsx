import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { initPushNotifications } from './utils/push'

/* ── Phase 6: Eager imports — Landing, Login, Signup for fast FCP ── */
import Landing  from './pages/Landing'
import Login    from './pages/Login'
import Signup   from './pages/Signup'

/* ── Phase 6: Lazy-loaded pages — code-split for smaller bundle ──── */
const PatientDashboard    = lazy(() => import('./pages/PatientDashboard'))
const BreathAnalysis      = lazy(() => import('./pages/BreathAnalysis'))
const RiskAnalysis        = lazy(() => import('./pages/RiskAnalysis'))
const AirQuality          = lazy(() => import('./pages/AirQuality'))
const AirQualityMap       = lazy(() => import('./pages/AirQualityMap'))
const HealthHistory       = lazy(() => import('./pages/HealthHistory'))
const Reports             = lazy(() => import('./pages/Reports'))
const Alerts              = lazy(() => import('./pages/Alerts'))
const Settings            = lazy(() => import('./pages/Settings'))
const Assessment          = lazy(() => import('./pages/Assessment'))
const AssessmentResults   = lazy(() => import('./pages/AssessmentResults'))
const HealthProfileSetup  = lazy(() => import('./pages/HealthProfileSetup'))
const DoctorDashboard     = lazy(() => import('./pages/DoctorDashboard'))
const DoctorPatients      = lazy(() => import('./pages/DoctorPatients'))
const DoctorPatientProfile= lazy(() => import('./pages/DoctorPatientProfile'))
const DoctorReports       = lazy(() => import('./pages/DoctorReports'))
const DoctorAlerts        = lazy(() => import('./pages/DoctorAlerts'))
const DoctorSettings      = lazy(() => import('./pages/DoctorSettings'))
const AppointmentChat     = lazy(() => import('./pages/AppointmentChat'))
const DoctorRecommendations= lazy(() => import('./pages/DoctorRecommendations'))
const HavaPage            = lazy(() => import('./pages/HavaPage'))
const PrivacyPolicy       = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService      = lazy(() => import('./pages/TermsOfService'))
const Security            = lazy(() => import('./pages/Security'))
const UserManual          = lazy(() => import('./pages/UserManual'))

import CookieConsent      from './components/CookieConsent'
import PatientShell       from './components/PatientShell'
import DoctorShell        from './components/DoctorShell'
import ScrollToTop        from './components/ScrollToTop'
import ErrorBoundary      from './components/ErrorBoundary'
import SessionExpiryModal from './components/SessionExpiryModal'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

/* ── Phase 6: Suspense fallback — minimal CLS, matches dark theme ── */
function PageLoader() {
    return (
        <div
            role="status"
            aria-label="Loading page"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                flexDirection: 'column',
                gap: 16,
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                fontSize: '0.875rem',
            }}
        >
            <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2.5px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                animation: 'spin 0.7s linear infinite',
            }} />
            <span>Loading…</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''   // always set in .env.production

function ProtectedRoute({ children, allowedRole }) {
    let userString = sessionStorage.getItem('user_data');
    if (!userString || userString === 'undefined') {
        userString = localStorage.getItem('user_data');
        if (userString && userString !== 'undefined') {
            // Hydrate sessionStorage so this tab retains its session even if localStorage changes elsewhere
            sessionStorage.setItem('user_data', userString);
            const token = localStorage.getItem('supabase_token');
            if (token) sessionStorage.setItem('supabase_token', token);
        }
    }
    
    if (!userString || userString === 'undefined') return <Navigate to="/login" replace />;
    
    let user = {};
    try {
        user = JSON.parse(userString);
    } catch(e) {
        return <Navigate to="/login" replace />;
    }

    if (!user || !user.id) return <Navigate to="/login" replace />;
    
    // STRICT ROLE DETECTION — trust only user_metadata.role set by backend at signup
    // Never use display name or email heuristics (security risk: any patient could register as "Dr. X")
    const metadataRole = user.user_metadata?.role?.toLowerCase();
    const topRole = (user.role && user.role !== 'authenticated') ? user.role?.toLowerCase() : null;
    const role = (metadataRole && metadataRole !== 'authenticated') ? metadataRole : (topRole || 'patient');
    
    console.log(`[RBAC] Path: ${window.location.pathname}, Detected: ${role}, Required: ${allowedRole}`);

    if (allowedRole && role !== allowedRole) {
        // Force redirection to the correct portal
        const target = role === 'doctor' ? "/doctor/dashboard" : "/dashboard";
        console.log(`[RBAC] Unauthorized access. Redirecting ${role} to ${target}`);
        return <Navigate to={target} replace />;
    }
    
    return children;
}

export default function App() {
    // Proactive JWT refresh: schedule a silent token refresh 5 minutes before expiry
    useEffect(() => {
        async function scheduleTokenRefresh() {
            try {
                const rawUser = sessionStorage.getItem('user_data') || localStorage.getItem('user_data');
                if (!rawUser || rawUser === 'undefined') return;
                const user = JSON.parse(rawUser);
                // Supabase tokens expire at user.exp (Unix seconds)
                const exp = user?.exp;
                if (!exp) return;
                const nowMs = Date.now();
                const expMs = exp * 1000;
                const msUntilExpiry = expMs - nowMs;
                const refreshAtMs = msUntilExpiry - 5 * 60 * 1000; // 5 min before expiry
                if (refreshAtMs <= 0) return; // Already expired or too close

                const timer = setTimeout(async () => {
                    try {
                        const refreshToken = sessionStorage.getItem('supabase_refresh_token') ||
                                             localStorage.getItem('supabase_refresh_token');
                        if (!refreshToken) return;
                        const res = await fetch(`${API_BASE}/auth/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh_token: refreshToken })
                        });
                        if (!res.ok) return;
                        const data = await res.json();
                        if (data.access_token) {
                            localStorage.setItem('supabase_token', data.access_token);
                            sessionStorage.setItem('supabase_token', data.access_token);
                            if (data.refresh_token) {
                                localStorage.setItem('supabase_refresh_token', data.refresh_token);
                                sessionStorage.setItem('supabase_refresh_token', data.refresh_token);
                            }
                            if (data.user) {
                                const updatedUser = JSON.stringify(data.user);
                                localStorage.setItem('user_data', updatedUser);
                                sessionStorage.setItem('user_data', updatedUser);
                            }
                            console.log('[JWT] Token silently refreshed.');
                        }
                    } catch (e) {
                        console.warn('[JWT] Proactive refresh failed:', e);
                    }
                }, refreshAtMs);

                return () => clearTimeout(timer);
            } catch (e) {
                console.warn('[JWT] Could not schedule token refresh:', e);
            }
        }
        scheduleTokenRefresh();
    }, []);

    // Initialize Push Notifications
    useEffect(() => {
        const rawUser = sessionStorage.getItem('user_data') || localStorage.getItem('user_data');
        if (rawUser && rawUser !== 'undefined') {
            initPushNotifications();
        }
    }, []);

    return (
        <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
                {/* Phase 6: Suspense wrapper — single boundary for all lazy routes */}
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Public Routes — eager */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />

                        {/* Public Routes — lazy (low-traffic, no FCP impact) */}
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/terms-of-service" element={<TermsOfService />} />
                        <Route path="/security" element={<Security />} />
                        <Route path="/manual" element={<UserManual />} />
                        <Route path="/profile-setup" element={<ProtectedRoute allowedRole="patient"><HealthProfileSetup /></ProtectedRoute>} />

                        {/* Patient System — all lazy */}
                        <Route element={<ProtectedRoute allowedRole="patient"><PatientShell /></ProtectedRoute>}>
                            <Route path="/dashboard"          element={<PatientDashboard />} />
                            <Route path="/breath-analysis"    element={<BreathAnalysis />} />
                            <Route path="/risk-analysis"      element={<RiskAnalysis />} />
                            <Route path="/air-quality"        element={<AirQuality />} />
                            <Route path="/air-quality-map"    element={<AirQualityMap />} />
                            <Route path="/assessment"         element={<Assessment />} />
                            <Route path="/assessment-results" element={<AssessmentResults />} />
                            <Route path="/health-history"     element={<HealthHistory />} />
                            <Route path="/reports"            element={<Reports />} />
                            <Route path="/alerts"             element={<Alerts />} />
                            <Route path="/settings"           element={<Settings />} />
                            <Route path="/doctors"            element={<DoctorRecommendations />} />
                            <Route path="/hava"               element={<HavaPage />} />
                        </Route>

                        {/* Doctor System — all lazy */}
                        <Route element={<ProtectedRoute allowedRole="doctor"><DoctorShell /></ProtectedRoute>}>
                            <Route path="/doctor/dashboard"           element={<DoctorDashboard />} />
                            <Route path="/doctor/patients"            element={<DoctorPatients />} />
                            <Route path="/doctor/patient-profile/:id" element={<DoctorPatientProfile />} />
                            <Route path="/doctor/alerts"              element={<DoctorAlerts />} />
                            <Route path="/doctor/reports"             element={<DoctorReports />} />
                            <Route path="/doctor/settings"            element={<DoctorSettings />} />
                        </Route>

                        {/* Standalone Features — lazy */}
                        <Route path="/chat/:id" element={<ProtectedRoute><AppointmentChat /></ProtectedRoute>} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
            <SessionExpiryModal />
            <CookieConsent />
            <ToastContainer position="bottom-right" theme="dark" />
        </BrowserRouter>
    );
}
