import { useState } from 'react'
import { ChevronDown, ChevronRight, Shield, Brain, Activity, Wind, Cloud, Stethoscope, BookOpen, HelpCircle, Download, HeartPulse } from 'lucide-react'

const sections = [
  {
    id: 'getting-started',
    icon: BookOpen,
    title: 'Getting Started',
    steps: [
      { title: 'Privacy Consent', desc: 'On your first visit, accept the privacy notice. We use session storage only — no tracking cookies.' },
      { title: 'Landing Page', desc: 'Click "Get Started →" to create your account, or "Install App" to add Breathometer to your device.' },
      { title: 'Create Account', desc: 'Fill in your name, username, date of birth, gender, and password. Select "Patient" or "Doctor" role.' },
      { title: 'Sign In', desc: 'Enter your username and password. Notice the HIPAA compliant · 256-bit encrypted badge — your data is secure.' },
      { title: 'Health Profile', desc: 'Complete your age, height, weight, activity level, smoking history, and existing conditions. This personalizes your AI results.' },
    ]
  },
  {
    id: 'dashboard',
    icon: Activity,
    title: 'Your Dashboard',
    steps: [
      { title: 'Status Banner', desc: 'Red alert at the top warns you if your respiratory risk is elevated.' },
      { title: 'Health Score', desc: 'Shows your latest Overall Health Score, or prompts you to run your first assessment.' },
      { title: 'Start Analysis', desc: 'Tap the blue "Start New Analysis →" button at the bottom to begin the 9-step assessment.' },
      { title: 'Navigation', desc: 'Use ☰ for sidebar menu, 🌙 for dark mode, 💬 for Hava AI, 🔔 for notifications.' },
    ]
  },
  {
    id: 'assessment',
    icon: HeartPulse,
    title: 'Health Assessment (9 Steps)',
    steps: [
      { title: 'Step 1 — Personal Metrics', desc: 'Enter age, gender, height, weight, heart rate, temperature, blood pressure, and SpO₂. BMI is calculated automatically.' },
      { title: 'Step 2 — Respiratory Condition', desc: 'Answer questions about shortness of breath, cough duration & type, wheezing, and chest tightness.' },
      { title: 'Step 3 — Breathing Test', desc: 'Exhale fully, then press and hold the green button while inhaling deeply. Target: 4–6 seconds. This is optional but improves accuracy.' },
      { title: 'Step 4 — Symptom Severity', desc: 'Rate symptoms (chest pain, fatigue, fever, night cough, etc.) on a 0–5 scale using sliders.' },
      { title: 'Step 5 — Medical History', desc: 'Check any pre-existing conditions: Asthma, COPD, Bronchitis, Pneumonia, Diabetes, and more.' },
      { title: 'Step 6 — Lifestyle Factors', desc: 'Provide smoking status, alcohol consumption, physical activity level, and sleep duration.' },
      { title: 'Step 7 — Environment', desc: 'Describe your living/working environment, pollution exposure, and ventilation quality.' },
      { title: 'Step 8 — Medication', desc: 'Simple Yes/No toggles for inhaler use, respiratory medication, recent antibiotics, and oxygen therapy.' },
      { title: 'Step 9 — Daily Tracking', desc: 'Optional snapshot: daily SpO₂, temperature, breathing difficulty, and current symptoms. Then tap "Submit Assessment".' },
    ]
  },
  {
    id: 'results',
    icon: Activity,
    title: 'Understanding Your Results',
    steps: [
      { title: 'Health Score Gauges', desc: 'Each metric appears as a visual gauge (0–100). Respiratory Risk (lower = better), Lung Function (higher = better), Environmental Risk.' },
      { title: 'Score Ranges', desc: '🟢 0–25: Low Risk / Good Health | 🟡 26–50: Moderate | 🟠 51–75: Elevated | 🔴 76–100: Critical' },
      { title: 'Risk Analysis', desc: 'Detailed breakdown with AI-detected conditions and confidence levels. Always includes a medical disclaimer.' },
      { title: 'Export PDF', desc: 'Tap "Download PDF Report" to generate a professional document you can share with your doctor.' },
    ]
  },
  {
    id: 'air-quality',
    icon: Cloud,
    title: 'Air Quality Monitoring',
    steps: [
      { title: 'Search a City', desc: 'Open Air Quality from the sidebar. Type a city name and tap the search button for real-time AQI data.' },
      { title: 'Read the AQI', desc: '0–50: Good | 51–100: Satisfactory | 101–200: Moderate | 201–300: Poor | 301+: Hazardous' },
      { title: 'Send Report', desc: 'Tap "Send Report" to email the AQI data to yourself or your doctor.' },
    ]
  },
  {
    id: 'trust',
    icon: Shield,
    title: 'Why You Can Trust Us',
    steps: [
      { title: 'Encryption', desc: 'TLS 1.3 in transit, AES-256 at rest, Row-Level Security (RLS) so only you see your data, JWT with silent refresh.' },
      { title: 'AI Transparency', desc: 'Three ML models (XGBoost + LightGBM + CatBoost) work together as an ensemble, then Gemini AI generates plain-language explanations.' },
      { title: 'Confidence Tiers', desc: '🟢 High (85–100%): Strong model agreement | 🟡 Moderate (60–84%): Some uncertainty | 🔴 Low (<60%): Consult a professional.' },
      { title: 'Compliance', desc: 'HIPAA-aligned data handling, no third-party data sharing, you own your data (export or delete anytime), continuous security monitoring.' },
    ]
  },
]


function Section({ section, isOpen, toggle }) {
  const Icon = section.icon
  return (
    <div className="manual-section">
      <button className="manual-section-header" onClick={toggle} aria-expanded={isOpen}>
        <span className="manual-section-icon"><Icon size={18} strokeWidth={2} /></span>
        <span className="manual-section-title">{section.title}</span>
        <span className="manual-section-chevron">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>
      {isOpen && (
        <div className="manual-section-body">
          {section.steps.map((step, i) => (
            <div key={i} className="manual-step">
              <div className="manual-step-num">{i + 1}</div>
              <div className="manual-step-content">
                <div className="manual-step-title">{step.title}</div>
                <div className="manual-step-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function UserManual() {
  const [openId, setOpenId] = useState('getting-started')

  return (
    <div className="manual-page">
      <div className="manual-header">
        <HelpCircle size={28} strokeWidth={1.8} style={{ color: 'var(--color-primary)' }} />
        <div>
          <h1 className="manual-title">User Manual</h1>
          <p className="manual-subtitle">Everything you need to know about Breathometer</p>
        </div>
      </div>

      <div className="manual-quicknav">
        {sections.map(s => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              className={`manual-quicknav-btn${openId === s.id ? ' active' : ''}`}
              onClick={() => setOpenId(openId === s.id ? null : s.id)}
            >
              <Icon size={14} />
              <span>{s.title.replace(/ \(.*\)/, '')}</span>
            </button>
          )
        })}
      </div>

      <div className="manual-sections">
        {sections.map(s => (
          <Section
            key={s.id}
            section={s}
            isOpen={openId === s.id}
            toggle={() => setOpenId(openId === s.id ? null : s.id)}
          />
        ))}
      </div>

      <div className="manual-footer-card">
        <div className="manual-footer-icon">📧</div>
        <div>
          <strong>Need more help?</strong>
          <p>Email us at <a href="mailto:breathometer.team@gmail.com">breathometer.team@gmail.com</a> or ask <strong>Hava AI</strong> inside the app for instant answers.</p>
        </div>
      </div>

      <div className="manual-disclaimer">
        <strong>Disclaimer:</strong> Breathometer is a health screening tool. It is not a substitute for professional medical diagnosis or treatment. Always consult a qualified healthcare provider.
      </div>

      <style>{`
        .manual-page { max-width: 720px; margin: 0 auto; padding: 0 16px 40px; }
        .manual-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .manual-title { font-size: 22px; font-weight: 700; color: var(--color-text); margin: 0; }
        .manual-subtitle { font-size: 13px; color: var(--color-muted); margin: 2px 0 0; }

        .manual-quicknav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
        .manual-quicknav-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px; border: 1px solid var(--color-border);
          background: var(--color-surface); color: var(--color-muted);
          font-size: 12px; font-weight: 500; cursor: pointer;
          transition: all 0.2s ease;
        }
        .manual-quicknav-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
        .manual-quicknav-btn.active {
          background: var(--color-primary); color: #fff; border-color: var(--color-primary);
        }

        .manual-section {
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: 12px; margin-bottom: 10px; overflow: hidden;
          transition: box-shadow 0.2s ease;
        }
        .manual-section:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
        .manual-section-header {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 14px 16px; background: none; border: none; cursor: pointer;
          font-size: 15px; font-weight: 600; color: var(--color-text);
          text-align: left; transition: background 0.15s ease;
        }
        .manual-section-header:hover { background: var(--color-bg); }
        .manual-section-icon { display: flex; color: var(--color-primary); flex-shrink: 0; }
        .manual-section-title { flex: 1; }
        .manual-section-chevron { display: flex; color: var(--color-muted); flex-shrink: 0; }

        .manual-section-body { padding: 0 16px 16px; }
        .manual-step {
          display: flex; gap: 12px; padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }
        .manual-step:last-child { border-bottom: none; }
        .manual-step-num {
          width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
          background: var(--color-primary-light); color: var(--color-primary);
          font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          margin-top: 2px;
        }
        .manual-step-title { font-size: 13px; font-weight: 600; color: var(--color-text); margin-bottom: 3px; }
        .manual-step-desc { font-size: 12.5px; color: var(--color-muted); line-height: 1.5; }

        .manual-footer-card {
          display: flex; gap: 12px; align-items: flex-start;
          background: var(--color-primary-light); border: 1px solid var(--color-primary-muted, rgba(37,99,235,0.15));
          border-radius: 12px; padding: 16px; margin-top: 20px;
        }
        .manual-footer-icon { font-size: 22px; flex-shrink: 0; }
        .manual-footer-card strong { font-size: 13px; color: var(--color-text); }
        .manual-footer-card p { font-size: 12px; color: var(--color-muted); margin: 4px 0 0; }
        .manual-footer-card a { color: var(--color-primary); text-decoration: underline; }

        .manual-disclaimer {
          font-size: 11px; color: var(--color-subtle); text-align: center;
          margin-top: 16px; padding: 12px; line-height: 1.5;
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  )
}
