import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from "@sentry/react";
import './index.css'
import App from './App.jsx'

// ── Sentry: GDPR-gated initialisation ────────────────────────────────────────
// Sentry must only be active after the user accepts the consent banner.
// The CookieConsent component fires 'bm:consent' with { detail: { choice } }.
// On page reload after a prior 'accepted' decision, we check localStorage.

const SENTRY_CONFIG = {
  dsn: import.meta.env.VITE_SENTRY_DSN,
  // IMPORTANT: sendDefaultPii MUST remain false for HIPAA/GDPR compliance.
  // The Sentry wizard defaults this to true (auto IP collection etc.) — we override it.
  sendDefaultPii: false,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/breathometer6-0\.onrender\.com/],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  // Prevent Sentry from capturing PII in breadcrumbs
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'ui.input') return null;
    return breadcrumb;
  },
}

function initSentry() {
  if (Sentry.isInitialized()) return;           // guard against double-init
  if (!import.meta.env.VITE_SENTRY_DSN) return; // no DSN → skip silently
  Sentry.init(SENTRY_CONFIG);
}

// Init immediately if user already consented in a previous session
if (localStorage.getItem('bm_cookie_consent') === 'accepted') {
  initSentry();
}

// Listen for live consent decisions from the CookieConsent banner
window.addEventListener('bm:consent', (e) => {
  if (e.detail?.choice === 'accepted') {
    initSentry();
  }
});

// ── Scroll restoration ────────────────────────────────────────────────────────
// Disable browser scroll restoration — React Router handles this instead.
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}
window.scrollTo({ top: 0, left: 0, behavior: 'instant' })

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
