import { toast } from 'react-toastify';

// Production URL is set via VITE_API_BASE_URL in .env.production
// Local dev without the env var automatically falls back to 127.0.0.1:8000
const API_BASE = import.meta.env.VITE_API_BASE_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://127.0.0.1:8000'
        : 'https://breathometer6-0.onrender.com');

class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

async function fetchWithAuth(url, options = {}) {
    let token = sessionStorage.getItem('supabase_token') || localStorage.getItem('supabase_token');
    
    // Sanitize token (prevent 'undefined' string from being sent as bearer token)
    if (token === 'undefined' || token === 'null' || !token) {
        token = null;
    }

    // suppressAuthRedirect: when true, a 401 will NOT fire the session-expired
    // event or clear storage. Use this for background/non-critical saves where
    // a token expiry should not interrupt the user's current flow.
    const { suppressAuthRedirect = false, ...fetchOptions } = options;

    const headers = {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            ...fetchOptions,
            headers,
        });

        if (response.status === 401 && !suppressAuthRedirect) {
            // Unauthorized — clear storage and fire a graceful session-expired event
            localStorage.removeItem('supabase_token');
            localStorage.removeItem('user_data');
            sessionStorage.removeItem('supabase_token');
            sessionStorage.removeItem('user_data');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
                // Fire custom event so SessionExpiryModal can intercept without hard redirect
                window.dispatchEvent(new CustomEvent('session-expired'));
            }
        }

        if (!response.ok) {
            let errorMessage = 'An error occurred';
            try {
                const errorData = await response.json();
                if (Array.isArray(errorData.detail)) {
                    // Handle FastAPI validation errors (422)
                    errorMessage = errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ');
                } else {
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                }
            } catch (e) {
                // Ignore parse errors for non-JSON responses
            }
            throw new ApiError(response.status, errorMessage);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        // Show an error toast for API failures
        // Suppress infrastructure-level errors (Supabase key errors, cold-start noise)
        const msg = error.message || '';
        const isInfraError = /supabase|api.?key|invalid.*key|anon.*key/i.test(msg);
        if (error.status !== 401 && !isInfraError) {
            toast.error(msg || "Failed to connect to server");
        } else if (error.status === 401 && !suppressAuthRedirect && window.location.pathname !== '/login') {
            toast.info("Session expired, please log in again.");
        }
        throw error;
    }
}

export const api = {
    auth: {
        login: (username, password) => fetchWithAuth('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        }),
        signup: (username, password, fullName, role, profileData = {}) => fetchWithAuth('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ username, password, full_name: fullName, role, ...profileData })
        }),
        getProfile: () => fetchWithAuth('/auth/profile'),
        updateProfile: (data) => fetchWithAuth('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(data)
        }),
        changePassword: (newPassword) => fetchWithAuth('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ new_password: newPassword })
        }),
        getNotifications: () => fetchWithAuth('/auth/notifications'),
        updateNotifications: (preferences) => fetchWithAuth('/auth/notifications', {
            method: 'PUT',
            body: JSON.stringify({ preferences })
        }),
        listPatients: () => fetchWithAuth('/auth/patients'),
        listDoctors: () => fetchWithAuth('/auth/doctors'),
        getPatientDetail: (patientId) => fetchWithAuth(`/auth/patients/${patientId}`),
        logout: () => {
            localStorage.removeItem('supabase_token')
            localStorage.removeItem('user_data')
            sessionStorage.removeItem('supabase_token')
            sessionStorage.removeItem('user_data')
            window.location.href = '/login'
        }
    },
    environment: {
        storeData: (data) => fetchWithAuth('/environment', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        getAqi: (lat, lon) => fetchWithAuth(`/environment/aqi?lat=${lat}&lon=${lon}`),
        getAqiByCity: (city) => fetchWithAuth(`/environment/aqi-by-city?city=${encodeURIComponent(city)}`),
        getWeather: (lat, lon) => fetchWithAuth(`/environment/weather?lat=${lat}&lon=${lon}`),
        getMapMarkers: (lat, lon, radius) => fetchWithAuth(`/environment/aqi-map?lat=${lat}&lon=${lon}&radius_km=${radius}`)
    },
    breath: {
        submitTest: (data) => fetchWithAuth('/breath-test', {
            method: 'POST',
            suppressAuthRedirect: true,
            body: JSON.stringify(data)
        }),
        getHistory: (userId) => fetchWithAuth(`/breath-test/${userId}`)
    },
    prediction: {
        storePrediction: (data) => fetchWithAuth('/prediction/store', {
            method: 'POST',
            suppressAuthRedirect: true,
            body: JSON.stringify(data)
        }),
        getHistory: (userId) => fetchWithAuth(`/prediction/${userId}`)
    },
    inference: {
        predict: (data, expand = true) => fetchWithAuth(`/inference/predict${expand ? '?expand=true' : ''}`, {
            method: 'POST',
            suppressAuthRedirect: true,
            body: JSON.stringify(data)
        })
    },
    ai: {
        chat: (message) => fetchWithAuth('/chatbot/message', {
            method: 'POST',
            body: JSON.stringify({ message })
        })
    },
    chat: {
        storeMessage: (message, response) => fetchWithAuth('/chat', {
            method: 'POST',
            body: JSON.stringify({ message, response })
        })
    },
    feedback: {
        submit: (data) => fetchWithAuth('/feedback/submit', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        logDoctorClick: (predictionId, doctorName) => fetchWithAuth(`/feedback/doctor-click?prediction_id=${predictionId}&doctor_name=${encodeURIComponent(doctorName)}`, {
            method: 'POST'
        })
    },
    appointments: {
        request: (data) => fetchWithAuth('/appointments/request', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        getForDoctor: () => fetchWithAuth('/appointments/doctor'),
        getForPatient: () => fetchWithAuth('/appointments/patient'),
        accept: (id) => fetchWithAuth(`/appointments/accept/${id}`, { method: 'POST' }),
        getMessages: (id) => fetchWithAuth(`/appointments/message/${id}`),
        sendMessage: (id, content) => fetchWithAuth(`/appointments/message/${id}`, {
            method: 'POST',
            body: JSON.stringify({ content })
        })
    },
    health: {
        submitData: (data) => fetchWithAuth('/health/input', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        getLatest: () => fetchWithAuth('/health/latest')
    },
    reports: {
        getSummary: () => fetchWithAuth('/reports/summary'),
        getDoctorReports: () => fetchWithAuth('/reports/doctor'),
        verify: (reportId) => fetchWithAuth(`/reports/verify/${reportId}`, { method: 'POST' })
    },
    alerts: {
        getAlerts: (userId) => fetchWithAuth(`/alerts/${userId}`),
        getDoctorAlerts: (doctorId) => fetchWithAuth(`/alerts/doctor/${doctorId}`)
    },
    doctors: {
        find: (city, disease) => fetchWithAuth(`/doctors/find?disease=${encodeURIComponent(disease)}${city ? '&city=' + encodeURIComponent(city) : ''}`),
        recommend: (disease, city) => fetchWithAuth(`/doctors/recommend?disease=${encodeURIComponent(disease)}${city ? '&city=' + encodeURIComponent(city) : ''}`),
        cities: () => fetchWithAuth('/doctors/cities'),
    },
    email: {
        sendReport: (data = {}) => fetchWithAuth('/email/send-report', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    },
};
