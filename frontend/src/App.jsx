import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PatientDashboard from './pages/PatientDashboard'
import BreathAnalysis from './pages/BreathAnalysis'
import RiskAnalysis from './pages/RiskAnalysis'
import AirQuality from './pages/AirQuality'
import AirQualityMap from './pages/AirQualityMap'
import HealthHistory from './pages/HealthHistory'
import Reports from './pages/Reports'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'
import Assessment from './pages/Assessment'
import AssessmentResults from './pages/AssessmentResults'
import HealthProfileSetup from './pages/HealthProfileSetup'
import DoctorDashboard from './pages/DoctorDashboard'
import DoctorPatients from './pages/DoctorPatients'
import DoctorPatientProfile from './pages/DoctorPatientProfile'
import DoctorReports from './pages/DoctorReports'
import DoctorAlerts from './pages/DoctorAlerts'
import DoctorSettings from './pages/DoctorSettings'
import AppointmentChat from './pages/AppointmentChat'
import DoctorRecommendations from './pages/DoctorRecommendations'
import HavaPage from './pages/HavaPage'
import PatientShell from './components/PatientShell'
import DoctorShell from './components/DoctorShell'
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import SessionExpiryModal from './components/SessionExpiryModal'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

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
                        const res = await fetch('https://breathometer6-0.onrender.com/auth/refresh', {
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

    return (
        <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/profile-setup" element={<ProtectedRoute allowedRole="patient"><HealthProfileSetup /></ProtectedRoute>} />

                    {/* Patient System */}
                    <Route element={<ProtectedRoute allowedRole="patient"><PatientShell /></ProtectedRoute>}>
                        <Route path="/dashboard" element={<PatientDashboard />} />
                        <Route path="/breath-analysis" element={<BreathAnalysis />} />
                        <Route path="/risk-analysis" element={<RiskAnalysis />} />
                        <Route path="/air-quality" element={<AirQuality />} />
                        <Route path="/air-quality-map" element={<AirQualityMap />} />
                        <Route path="/assessment" element={<Assessment />} />
                        <Route path="/assessment-results" element={<AssessmentResults />} />
                        <Route path="/health-history" element={<HealthHistory />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/doctors" element={<DoctorRecommendations />} />
                        <Route path="/hava" element={<HavaPage />} />
                    </Route>

                    {/* Doctor System */}
                    <Route element={<ProtectedRoute allowedRole="doctor"><DoctorShell /></ProtectedRoute>}>
                        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                        <Route path="/doctor/patients" element={<DoctorPatients />} />
                        <Route path="/doctor/patient-profile/:id" element={<DoctorPatientProfile />} />
                        <Route path="/doctor/alerts" element={<DoctorAlerts />} />
                        <Route path="/doctor/reports" element={<DoctorReports />} />
                        <Route path="/doctor/settings" element={<DoctorSettings />} />
                    </Route>

                    {/* Standalone Features */}
                    <Route path="/chat/:id" element={<ProtectedRoute><AppointmentChat /></ProtectedRoute>} />
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ErrorBoundary>
            <SessionExpiryModal />
            <ToastContainer position="bottom-right" theme="dark" />
        </BrowserRouter>
    );
}

