import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Bell, Search, Settings, LogOut, ChevronDown, X, Moon, Sun, MessageSquare, Menu } from 'lucide-react'
import { useSidebar } from './SidebarContext'

const routeTitles = {
  '/dashboard':         { title: 'Dashboard',        sub: 'Your health at a glance' },
  '/breath-analysis':   { title: 'Breath Analysis',  sub: 'AI-powered spirometry' },
  '/risk-analysis':     { title: 'Risk Analysis',    sub: 'Predictive health insights' },
  '/air-quality':       { title: 'Air Quality',      sub: 'Real-time environmental data' },
  '/air-quality-map':   { title: 'AQI Map',          sub: 'Interactive air quality map' },
  '/assessment':        { title: 'Health Assessment', sub: 'Comprehensive health check' },
  '/doctors':           { title: 'Find Doctors',     sub: 'Specialist recommendations' },
  '/health-history':    { title: 'Health History',   sub: 'Your medical timeline' },
  '/reports':           { title: 'Reports',          sub: 'Clinical summaries & exports' },
  '/alerts':            { title: 'Alerts',           sub: 'Health notifications' },
  '/settings':          { title: 'Settings',         sub: 'Account & preferences' },
}

function getInitials(name) {
  if (!name || name.trim() === '') return 'U'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0][0].toUpperCase()
}

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pageInfo = routeTitles[location.pathname] || { title: 'Health Intelligence', sub: 'Clinical Respiratory Monitoring' }
  const { toggle } = useSidebar()

  const [userData, setUserData] = useState({ name: '', role: '' })
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [theme, setTheme] = useState(
    () => document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light'
  )
  const [chatOpen, setChatOpen] = useState(false)
  const profileRef = useRef(null)
  const searchRef = useRef(null)

  // Keep theme state in sync with any external changes (e.g. doctor topbar)
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute('data-theme') || 'light')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  // Sync data-theme attribute and persist whenever theme state changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user_data')
      if (stored && stored !== 'undefined') {
        const parsed = JSON.parse(stored)
        const metaRole = parsed.user_metadata?.role
        const topRole = parsed.role
        const role = metaRole || topRole || 'Patient'
        setUserData({
          name: parsed.user_metadata?.full_name || parsed.first_name || parsed.email?.split('@')[0] || 'User',
          role: role.toLowerCase() === 'doctor' ? 'Doctor' : (role.toLowerCase() === 'admin' ? 'Admin' : 'Patient')
        })
      }
    } catch (e) {
      console.error('Topbar user parse error:', e)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    ['user_data', 'access_token', 'refresh_token', 'supabase_token'].forEach(k => {
      localStorage.removeItem(k)
      sessionStorage.removeItem(k)
    })
    navigate('/login')
  }

  function handleSearch(e) {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/air-quality?city=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchFocused(false)
      searchRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setSearchQuery('')
      setSearchFocused(false)
      searchRef.current?.blur()
    }
  }

  const initials = getInitials(userData.name)
  const isDark = theme === 'dark'

  const topbarStyle = isDark
    ? {
        background: 'rgba(11, 17, 32, 0.95)',
        borderBottomColor: 'rgba(255,255,255,0.07)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }
    : {
        background: 'rgba(255,255,255,0.72)',
        borderBottomColor: 'rgba(226,232,240,0.5)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      }

  return (
    <header className="tb" style={topbarStyle}>
      {/* Gradient bottom border — AI feel */}
      <div className="tb-gradient-border" aria-hidden="true" />

      {/* Hamburger — only visible on mobile/tablet */}
      <button
        id="tb-hamburger"
        className="tb-hamburger"
        onClick={toggle}
        aria-label="Open navigation menu"
      >
        <Menu size={20} strokeWidth={2} />
      </button>

      {/* Left: Page title */}
      <div className="tb-left">
        <div className="tb-title">{pageInfo.title}</div>
        {pageInfo.sub && <div className="tb-subtitle">{pageInfo.sub}</div>}
      </div>

      {/* Right: Actions */}
      <div className="tb-right">
        {/* Search */}
        <div className={`tb-search${searchFocused ? ' tb-search--focused' : ''}`}>
          <Search size={13} className="tb-search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search city..."
            className="tb-search-input"
            aria-label="Search city"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery && (
            <button
              className="tb-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className={`tb-icon-btn tb-theme-btn${isDark ? ' tb-theme-btn--dark' : ''}`}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={toggleTheme}
        >
          {isDark
            ? <Sun size={16} strokeWidth={2} />
            : <Moon size={16} strokeWidth={2} />
          }
        </button>

        {/* Hava AI Chatbot Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            className={`tb-icon-btn`}
            aria-label="Chat with Hava AI"
            title="Chat with Hava AI"
            onClick={() => navigate('/hava')}
          >
            <MessageSquare size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Notifications */}
        <button
          className="tb-icon-btn"
          aria-label="Notifications"
          onClick={() => navigate('/alerts')}
          title="Alerts"
        >
          <Bell size={16} strokeWidth={2} />
          <span className="tb-notif-dot tb-notif-dot-active" aria-hidden="true" />
        </button>

        {/* Profile */}
        <div className="tb-profile-wrap" ref={profileRef}>
          <button
            className={`tb-profile${profileOpen ? ' tb-profile--open' : ''}`}
            onClick={() => setProfileOpen(o => !o)}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            <div className="tb-avatar tb-avatar-glow" aria-hidden="true">
              {initials}
            </div>
            <div className="tb-profile-info">
              <div className="tb-profile-name">{userData.name || 'User'}</div>
              <div className="tb-profile-role">{userData.role}</div>
            </div>
            <ChevronDown
              size={12}
              className="tb-chevron"
              style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="tb-dropdown" role="menu">
              <div className="tb-dropdown-header">
                <div className="tb-dropdown-avatar">{initials}</div>
                <div>
                  <div className="tb-dropdown-name">{userData.name}</div>
                  <div className="tb-dropdown-role">{userData.role}</div>
                </div>
              </div>
              <div className="tb-dropdown-divider" />
              <button
                className="tb-dropdown-item"
                role="menuitem"
                onClick={() => { setProfileOpen(false); navigate('/settings') }}
              >
                <Settings size={13} strokeWidth={2} />
                Settings
              </button>
              <div className="tb-dropdown-divider" />
              <button
                className="tb-dropdown-item tb-dropdown-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <LogOut size={13} strokeWidth={2} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ─── Topbar ────────────────────────────────────────────────────────────
           On desktop (≥1024px) it starts after the sidebar.
           On mobile/tablet (<1024px) it spans the full width.
        ─────────────────────────────────────────────────────────────────────── */
        .tb {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--topbar-height);
          /* Background controlled via React inline style for reliability */
          background: rgba(255, 255, 255, 0.72);
          border-bottom: 1px solid rgba(226, 232, 240, 0.5);
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          z-index: 999;
          gap: 12px;
          transition: background 0.4s cubic-bezier(0.4,0,0.2,1),
                      border-color 0.4s cubic-bezier(0.4,0,0.2,1),
                      box-shadow 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        /* On desktop, offset the topbar to sit to the right of the fixed sidebar */
        @media (min-width: 1024px) {
          .tb { left: var(--sidebar-width); padding: 0 28px; }
        }
        /* Hamburger — visible only on mobile/tablet */
        .tb-hamburger {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          background: var(--color-bg);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-muted);
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .tb-hamburger:hover {
          background: var(--color-surface);
          color: var(--color-primary);
          border-color: var(--color-primary-muted);
        }
        @media (min-width: 1024px) {
          .tb-hamburger { display: none; }
        }
        /* Fallback CSS selector (React inline style takes precedence) */
        [data-theme='dark'] .tb {
          background: rgba(11, 17, 32, 0.95) !important;
          border-bottom-color: rgba(255, 255, 255, 0.07) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.28) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        /* Left */
        .tb-left {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .tb-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-text);
          letter-spacing: -0.25px;
          line-height: 1.2;
        }
        .tb-subtitle {
          font-size: 11px;
          color: var(--color-subtle);
          font-weight: 400;
          letter-spacing: 0.1px;
        }

        /* Right */
        .tb-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Search */
        .tb-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-bg);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 6px 14px;
          transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
        }
        .tb-search--focused {
          border-color: var(--color-primary);
          background: var(--color-surface);
          box-shadow: 0 0 0 3px var(--color-primary-faded);
        }
        .tb-search-icon {
          color: var(--color-subtle);
          flex-shrink: 0;
          transition: color 0.15s;
        }
        .tb-search--focused .tb-search-icon {
          color: var(--color-primary);
        }
        .tb-search-input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--color-text);
          width: 148px;
          transition: width 0.2s ease;
        }
        .tb-search--focused .tb-search-input {
          width: 180px;
        }
        .tb-search-input::placeholder {
          color: var(--color-subtle);
          font-weight: 400;
        }
        .tb-search-clear {
          display: flex;
          align-items: center;
          background: none;
          border: none;
          color: var(--color-subtle);
          cursor: pointer;
          padding: 2px;
          border-radius: 50%;
          transition: all 0.12s;
        }
        .tb-search-clear:hover {
          color: var(--color-text);
          background: var(--color-border);
        }

        /* Icon button */
        .tb-icon-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px; height: 36px;
          background: var(--color-bg);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-sm);
          color: var(--color-muted);
          cursor: pointer;
          will-change: transform;
          transition: transform 0.16s cubic-bezier(0.4,0,0.2,1),
                      background-color 0.16s cubic-bezier(0.4,0,0.2,1),
                      border-color 0.16s cubic-bezier(0.4,0,0.2,1),
                      box-shadow 0.16s cubic-bezier(0.4,0,0.2,1),
                      color 0.16s cubic-bezier(0.4,0,0.2,1);
        }
        .tb-icon-btn:hover {
          background: var(--color-surface);
          color: var(--color-text);
          border-color: var(--color-border-2);
          transform: translateY(-1px);
          box-shadow: var(--shadow-sm);
        }
        .tb-icon-btn:active {
          transform: translateY(0) scale(0.94);
          transition: transform 0.07s cubic-bezier(0.4, 0, 1, 1) !important;
        }

        /* Theme toggle */
        .tb-theme-btn:hover { color: var(--color-primary); border-color: var(--color-primary-muted); }
        .tb-theme-btn--dark { color: #FBBF24; }
        .tb-theme-btn--dark:hover { color: #F59E0B; border-color: rgba(251,191,36,0.35) !important; background: rgba(251,191,36,0.08) !important; }
        .tb-notif-dot {
          position: absolute;
          top: 8px; right: 8px;
          width: 6px; height: 6px;
          background: var(--color-danger);
          border-radius: 50%;
          border: 1.5px solid var(--color-surface);
        }

        /* Profile */
        .tb-profile-wrap {
          position: relative;
        }
        .tb-profile {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 5px 10px 5px 6px;
          border-radius: 40px;
          cursor: pointer;
          transition: all 0.15s ease;
          background: transparent;
          border: 1.5px solid transparent;
        }
        .tb-profile:hover {
          background: var(--color-bg);
          border-color: var(--color-border);
        }
        .tb-profile--open {
          background: var(--color-bg);
          border-color: var(--color-border);
        }

        /* Avatar */
        .tb-avatar {
          width: 32px; height: 32px;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 11.5px;
          font-weight: 700;
          flex-shrink: 0;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
        }

        .tb-profile-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--color-text);
          line-height: 1.2;
          max-width: 110px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .tb-profile-role {
          font-size: 10.5px;
          color: var(--color-subtle);
          line-height: 1.2;
          font-weight: 500;
        }
        .tb-chevron {
          color: var(--color-subtle);
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
        }

        /* Dropdown — originates from top-right corner of trigger */
        .tb-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 210px;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 8px rgba(15,23,42,0.04), 0 16px 40px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.9);
          z-index: 200;
          overflow: hidden;
          transform-origin: top right;
          animation: tbDropIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        [data-theme='dark'] .tb-dropdown {
          background: rgba(26,31,43,0.92);
          border-color: rgba(255,255,255,0.09);
          box-shadow: 0 4px 8px rgba(0,0,0,0.25), 0 16px 40px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        @keyframes tbDropIn {
          from { opacity: 0; transform: scale(0.94) translateY(-6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .tb-dropdown-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
        }
        .tb-dropdown-avatar {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.22);
        }
        .tb-dropdown-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
          line-height: 1.3;
        }
        .tb-dropdown-role {
          font-size: 11px;
          color: var(--color-subtle);
          margin-top: 1px;
          font-weight: 500;
        }
        .tb-dropdown-divider {
          height: 1px;
          background: var(--color-border);
        }
        .tb-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-2);
          cursor: pointer;
          transition: background 0.12s;
          text-align: left;
          font-family: var(--font-family);
        }
        .tb-dropdown-item:hover {
          background: var(--color-bg);
          color: var(--color-text);
        }
        .tb-dropdown-item--danger {
          color: var(--color-danger);
        }
        .tb-dropdown-item--danger:hover {
          background: var(--color-danger-light);
          color: var(--color-danger);
        }
      `}</style>
    </header>
  )
}
