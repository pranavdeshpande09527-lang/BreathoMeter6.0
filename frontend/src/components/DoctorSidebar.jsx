import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FileText, Bell, Settings,
  LogOut, Stethoscope, Moon, Sun, X
} from 'lucide-react'
import Logo from './Logo'
import { useSidebar } from './SidebarContext'

const navGroups = [
  {
    label: 'Clinical',
    items: [
      { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/doctor/patients',  icon: Users,           label: 'Patients' },
    ]
  },
  {
    label: 'Records',
    items: [
      { to: '/doctor/reports', icon: FileText, label: 'Reports' },
      { to: '/doctor/alerts',  icon: Bell,     label: 'Alerts' },
    ]
  },
  {
    label: 'Account',
    items: [
      { to: '/doctor/settings', icon: Settings, label: 'Settings' },
    ]
  }
]

export default function DoctorSidebar() {
  const { isOpen, close } = useSidebar()
  const navigate = useNavigate()
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  )

  // Watch for data-theme attribute changes on <html>
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
    <aside className={`dsb${isOpen ? ' dsb--open' : ''}`} style={sidebarStyle}>
      <div className="dsb-logo">
        <div className="dsb-logo-inner">
          <Logo size={36} className="dsb-brand-logo" />
        </div>
        <button
          className="dsb-close-btn"
          onClick={close}
          aria-label="Close navigation"
        >
          <X size={18} strokeWidth={2} />
        </button>
      </div>


      {/* Nav */}
      <nav className="dsb-nav">
        {navGroups.map(group => (
          <div key={group.label} className="dsb-group">
            <div className="dsb-group-label">{group.label}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={close}
                className={({ isActive }) => `dsb-item${isActive ? ' dsb-item--active' : ''}`}
              >
                <span className="dsb-item-icon">
                  <item.icon size={15} strokeWidth={2} />
                </span>
                <span className="dsb-item-label">{item.label}</span>
                <span className="dsb-item-active-dot" aria-hidden="true" />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="dsb-footer">
        <button className="dsb-logout" onClick={() => navigate('/')} aria-label="Logout">
          <LogOut size={14} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>

      <style>{`
        .dsb {
          position: fixed;
          top: 0; left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: rgba(255, 255, 255, 0.65);
          -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(200%);
          backdrop-filter: blur(var(--glass-blur)) saturate(200%);
          border-right: 1px solid rgba(226, 232, 240, 0.4);
          box-shadow: 1px 0 0 rgba(15,23,42,0.04), 4px 0 16px rgba(15,23,42,0.04);
          display: flex;
          flex-direction: column;
          z-index: 1100;
          overflow: hidden;
          transform: translateX(-100%);
          transition:
            transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
            background 0.5s ease-in-out,
            border-color 0.5s ease-in-out,
            box-shadow 0.5s ease-in-out;
        }
        .dsb--open { transform: translateX(0) !important; }
        @media (min-width: 1024px) {
          .dsb { transform: translateX(0); }
        }

        [data-theme='dark'] .dsb {
          background: rgba(11, 17, 32, 0.88);
          border-right-color: rgba(255, 255, 255, 0.07);
          box-shadow: 1px 0 0 rgba(0,0,0,0.5), 8px 0 32px rgba(0,0,0,0.35);
        }

        .dsb-logo {
          display: flex;
          align-items: center;
          padding: 18px 20px;
          border-bottom: 1px solid var(--color-border);
          flex-shrink: 0;
          background: transparent;
          justify-content: space-between;
          width: 100%;
          position: relative;
        }
        .dsb-close-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border-radius: var(--radius-sm);
          background: var(--color-surface);
          border: 1.5px solid var(--color-border);
          color: var(--color-muted);
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .dsb-close-btn:hover {
          background: var(--color-danger-light);
          color: var(--color-danger);
          border-color: var(--color-danger-muted);
        }
        @media (max-width: 1023px) {
          .dsb-close-btn { display: flex; }
        }
        .dsb-logo::after {
          content: '';
          position: absolute;
          bottom: 0; left: 16px; right: 16px;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(37,99,235,0.18), transparent);
        }

        .dsb-logo-inner {
          display: flex;
          align-items: center;
          transition: transform 0.25s ease, filter 0.25s ease;
          cursor: pointer;
          opacity: 0.95;
        }

        .dsb-logo-inner:hover {
          transform: scale(1.02);
          opacity: 1;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.05));
        }

        .dsb-brand-logo {
          /* Additional logo specific styling if needed */
        }

        .dsb-nav {
          flex: 1;
          padding: 14px 10px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: none;
        }
        .dsb-nav::-webkit-scrollbar { display: none; }

        .dsb-group { margin-bottom: 22px; }
        .dsb-group-label {
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          color: var(--color-subtle);
          padding: 0 10px;
          margin-bottom: 5px;
        }

        .dsb-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-muted);
          text-decoration: none;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          margin-bottom: 1px;
          user-select: none;
        }
        .dsb-item:hover {
          background: var(--color-bg);
          color: var(--color-text-2);
          transform: translateX(2px);
          text-decoration: none;
          box-shadow: inset 0 1px 0 var(--glass-border);
        }
        .dsb-item:hover .dsb-item-icon {
          color: var(--color-safe);
          transform: scale(1.12);
        }
        .dsb-item--active {
          background: var(--color-safe-light);
          color: var(--color-safe);
          font-weight: 600;
        }
        .dsb-item--active .dsb-item-icon { color: var(--color-safe); }
        .dsb-item--active:hover {
          background: var(--color-safe-light);
          color: var(--color-safe);
          transform: translateX(0);
        }

        .dsb-item-active-dot {
          display: none;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--color-safe);
          margin-left: auto;
          flex-shrink: 0;
          box-shadow: 0 0 6px var(--color-safe-glow);
        }
        .dsb-item--active .dsb-item-active-dot { display: block; }

        .dsb-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px; height: 20px;
          flex-shrink: 0;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--color-subtle);
        }
        .dsb-item-label {
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dsb-footer {
          padding: 12px 10px 16px;
          border-top: 1px solid var(--color-border);
          flex-shrink: 0;
        }
        .dsb-logout {
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
          transition: all 0.15s ease;
          font-family: var(--font-family);
        }
        .dsb-logout:hover {
          background: var(--color-danger-light);
          color: var(--color-danger);
          transform: translateX(2px);
        }
        .dsb-logout:active { transform: scale(0.97); }

        /* Theme toggle button in sidebar footer */
        .dsb-theme-btn {
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
          font-family: var(--font-family);
        }
        .dsb-theme-btn:hover {
          background: var(--color-primary-faded);
          color: var(--color-primary);
          transform: translateX(2px);
        }
        .dsb-theme-btn:active { transform: scale(0.97); }
        .dsb-theme-btn--dark { color: #FBBF24; }
        .dsb-theme-btn--dark:hover {
          background: rgba(251, 191, 36, 0.1);
          color: #F59E0B;
        }
      `}</style>
    </aside>
  )
}
