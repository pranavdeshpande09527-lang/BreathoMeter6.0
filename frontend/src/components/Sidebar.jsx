import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Wind, Activity, Cloud, Map,
  Clock, FileText, Bell, Settings, LogOut, HeartPulse, Stethoscope, Moon, Sun
} from 'lucide-react'
import Logo from './Logo'
import { getTopPages } from '../utils/livingUI'

const navGroups = [
  {
    label: 'Patient',
    items: [
      { to: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/breath-analysis', icon: Wind,            label: 'Breath Analysis' },
      { to: '/risk-analysis',   icon: Activity,        label: 'Risk Analysis' },
      { to: '/air-quality',     icon: Cloud,           label: 'Air Quality' },
      { to: '/air-quality-map', icon: Map,             label: 'AQI Map' },
    ]
  },
  {
    label: 'Clinical',
    items: [
      { to: '/assessment', icon: HeartPulse,  label: 'Health Assessment' },
      { to: '/doctors',    icon: Stethoscope, label: 'Find Doctors' },
    ]
  },
  {
    label: 'History',
    items: [
      { to: '/health-history', icon: Clock,    label: 'Health History' },
      { to: '/reports',        icon: FileText, label: 'Reports' },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/alerts',   icon: Bell,     label: 'Alerts' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  }
]

export default function PatientSidebar() {
  const navigate = useNavigate()
  const [topPages, setTopPages] = useState([])
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  )

  useEffect(() => {
    setTopPages(getTopPages(2))
  }, [])

  // Watch for data-theme attribute changes on <html> and react immediately
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  const sidebarStyle = isDark
    ? {
        background: 'rgba(11, 17, 32, 0.97)',
        borderRightColor: 'rgba(255, 255, 255, 0.07)',
        boxShadow: '1px 0 0 rgba(0,0,0,0.5), 8px 0 32px rgba(0,0,0,0.35)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    : {
        background: 'rgba(255, 255, 255, 0.72)',
        borderRightColor: 'rgba(226, 232, 240, 0.5)',
        boxShadow: '1px 0 0 rgba(15,23,42,0.04), 4px 0 16px rgba(15,23,42,0.04)',
      }

  return (
    <aside className="sb" style={sidebarStyle}>
      {/* Logo Section */}
      <div className="sb-logo">
        <div className="sb-logo-inner">
          <Logo size={34} className="sb-brand-logo" />
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {navGroups.map(group => (
          <div key={group.label} className="sb-group">
            <div className="sb-group-label">{group.label}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sb-item${isActive ? ' sb-item--active' : ''}${
                    topPages.includes(item.to) && !isActive ? ' sb-item--priority' : ''
                  }`
                }
              >
                <span className="sb-item-glow-bar" aria-hidden="true" />
                <span className="sb-item-icon">
                  <item.icon size={15} strokeWidth={2} />
                </span>
                <span className="sb-item-label">{item.label}</span>
                <span className="sb-item-active-dot" aria-hidden="true" />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <button
          className="sb-logout"
          onClick={() => navigate('/')}
          aria-label="Logout"
        >
          <LogOut size={14} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .sb {
          position: fixed;
          top: 0; left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: rgba(255, 255, 255, 0.65);
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(200%);
          backdrop-filter: blur(var(--glass-blur)) saturate(200%);
          border-right: 1px solid var(--glass-border);
          box-shadow: 1px 0 0 rgba(15,23,42,0.04), 4px 0 16px rgba(15,23,42,0.04);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
          transition: background 0.5s ease-in-out, border-color 0.5s ease-in-out, box-shadow 0.5s ease-in-out;
        }
        /* Dark mode .sb background is controlled via React inline style + MutationObserver
           to avoid CSS caching / selector timing issues. This rule is a fallback only. */
        [data-theme='dark'] .sb {
          background: rgba(11, 17, 32, 0.97) !important;
          border-right-color: rgba(255, 255, 255, 0.07) !important;
          box-shadow: 1px 0 0 rgba(0,0,0,0.5), 8px 0 32px rgba(0,0,0,0.35) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* Logo */
        .sb-logo {
          display: flex;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          background: transparent;
          justify-content: flex-start;
          width: 100%;
          position: relative;
        }
        .sb-logo::after {
          content: '';
          position: absolute;
          bottom: 0; left: 16px; right: 16px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(37,99,235,0.18), transparent);
        }

        .sb-logo-inner {
          display: flex;
          align-items: center;
          transition: transform 0.25s ease, filter 0.25s ease;
          cursor: pointer;
          opacity: 0.95;
        }

        .sb-logo-inner:hover {
          transform: scale(1.02);
          opacity: 1;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.05));
        }

        .sb-brand-logo {
          /* Additional logo specific styling if needed */
        }

        /* Nav */
        .sb-nav {
          flex: 1;
          padding: 14px 10px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        .sb-nav::-webkit-scrollbar { display: none; }

        .sb-group {
          margin-bottom: 22px;
        }
        .sb-group-label {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--color-subtle);
          padding: 0 10px;
          margin-bottom: 5px;
        }

        /* Nav Item */
        .sb-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
          text-decoration: none;
          will-change: transform;
          transition: transform 0.22s cubic-bezier(0.34, 1.42, 0.64, 1),
                      background-color 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                      color 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          margin-bottom: 1px;
          user-select: none;
        }
        .sb-item:hover {
          background: var(--color-bg);
          color: var(--color-text-2);
          transform: translateX(2px);
          text-decoration: none;
          box-shadow: inset 0 1px 0 var(--glass-border);
        }
        .sb-item:hover .sb-item-icon {
          color: var(--color-primary);
          transform: scale(1.1) translateX(1px);
        }

        /* Active State */
        .sb-item--active {
          background: var(--color-primary-light);
          color: var(--color-primary);
          font-weight: 600;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .sb-item--active .sb-item-icon {
          color: var(--color-primary);
        }
        .sb-item--active:hover {
          background: var(--color-primary-light);
          color: var(--color-primary);
          transform: translateX(0);
        }

        /* Active indicator — smooth opacity transition, no display:none flicker */
        .sb-item-active-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--color-primary);
          margin-left: auto;
          flex-shrink: 0;
          box-shadow: 0 0 5px rgba(37, 99, 235, 0.5);
          opacity: 0;
          transform: scale(0.6);
          transition: opacity 0.18s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.18s cubic-bezier(0.34, 1.42, 0.64, 1);
        }
        .sb-item--active .sb-item-active-dot {
          opacity: 1;
          transform: scale(1);
        }

        .sb-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px; height: 20px;
          flex-shrink: 0;
          will-change: transform;
          transition: transform 0.16s cubic-bezier(0.4, 0, 0.2, 1),
                      color 0.16s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--color-subtle);
        }

        .sb-item-label {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Footer */
        .sb-footer {
          padding: 12px 10px 16px;
          border-top: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .sb-logout {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sb-logout:hover {
          background: var(--color-danger-light);
          color: var(--color-danger);
          transform: translateX(2px);
        }
        .sb-logout:active {
          transform: scale(0.97);
        }

        /* Theme toggle button in sidebar footer */
        .sb-theme-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 4px;
        }
        .sb-theme-btn:hover {
          background: var(--color-primary-faded);
          color: var(--color-primary);
          transform: translateX(2px);
        }
        .sb-theme-btn:active { transform: scale(0.97); }
        /* Gold sun in dark mode */
        .sb-theme-btn--dark { color: #FBBF24; }
        .sb-theme-btn--dark:hover {
          background: rgba(251, 191, 36, 0.1);
          color: #F59E0B;
        }
      `}</style>
    </aside>
  )
}
