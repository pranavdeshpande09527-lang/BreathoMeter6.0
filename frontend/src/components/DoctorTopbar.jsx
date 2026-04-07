import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, Search, ChevronDown, Settings, LogOut, X, Moon, Sun } from 'lucide-react'

const routeTitles = {
  '/doctor/dashboard':     { title: 'Clinical Dashboard', sub: 'Patient health overview' },
  '/doctor/patients':      { title: 'Patients',           sub: 'Manage patient records' },
  '/doctor/reports':       { title: 'Clinical Reports',   sub: 'Summaries & analytics' },
  '/doctor/alerts':        { title: 'Clinical Alerts',    sub: 'Urgent notifications' },
  '/doctor/settings':      { title: 'Settings',           sub: 'Account & preferences' },
}

function getInitials(name) {
  if (!name) return 'Dr'
  const parts = name.replace(/^dr\.?\s*/i, '').trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0]?.slice(0, 2).toUpperCase() || 'Dr'
}

export default function DoctorTopbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pageInfo = routeTitles[location.pathname] || { title: 'Doctor Portal', sub: '' }

  const [userData, setUserData] = useState({ name: '', role: 'Doctor' })
  const [profileOpen, setProfileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const profileRef = useRef(null)
  const searchRef = useRef(null)

  // Sync data-theme attribute whenever theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user_data')
      if (stored && stored !== 'undefined') {
        const parsed = JSON.parse(stored)
        const metaRole = parsed.user_metadata?.role
        const topRole = parsed.role
        const role = metaRole || topRole || 'Doctor'
        setUserData({
          name: parsed.user_metadata?.full_name || parsed.first_name || 'Doctor',
          role: role.toLowerCase() === 'doctor' ? 'Doctor' : (role.toLowerCase() === 'admin' ? 'Admin' : 'Patient')
        })
      }
    } catch (e) {
      console.error('DoctorTopbar parse error:', e)
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

  function toggleTheme() {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const initials = getInitials(userData.name)

  return (
    <header className="dtb">
      <div className="dtb-left">
        <div className="dtb-title">{pageInfo.title}</div>
        {pageInfo.sub && <div className="dtb-subtitle">{pageInfo.sub}</div>}
      </div>

      <div className="dtb-right">
        {/* Search */}
        <div className={`dtb-search${searchFocused ? ' dtb-search--focused' : ''}`}>
          <Search size={13} className="dtb-search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search patients..."
            className="dtb-search-input"
            aria-label="Search patients"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={e => e.key === 'Escape' && (setSearchQuery(''), searchRef.current?.blur())}
          />
          {searchQuery && (
            <button className="dtb-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="dtb-icon-btn dtb-theme-btn"
          aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          onClick={toggleTheme}
        >
          {theme === 'light' ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
        </button>

        {/* Alerts */}
        <button className="dtb-icon-btn" aria-label="Alerts" onClick={() => navigate('/doctor/alerts')} title="Alerts">
          <Bell size={16} strokeWidth={2} />
          <span className="dtb-notif-dot" aria-hidden="true" />
        </button>

        {/* Profile */}
        <div className="dtb-profile-wrap" ref={profileRef}>
          <button
            className={`dtb-profile${profileOpen ? ' dtb-profile--open' : ''}`}
            onClick={() => setProfileOpen(o => !o)}
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            <div className="dtb-avatar">{initials}</div>
            <div className="dtb-profile-info">
              <div className="dtb-profile-name">{userData.name}</div>
              <div className="dtb-profile-role">{userData.role}</div>
            </div>
            <ChevronDown
              size={12}
              className="dtb-chevron"
              style={{ transform: profileOpen ? 'rotate(180deg)' : 'rotate(0)' }}
            />
          </button>

          {profileOpen && (
            <div className="dtb-dropdown anim-pop-in" role="menu">
              <div className="dtb-dropdown-header">
                <div className="dtb-dropdown-avatar">{initials}</div>
                <div>
                  <div className="dtb-dropdown-name">{userData.name}</div>
                  <div className="dtb-dropdown-role">{userData.role}</div>
                </div>
              </div>
              <div className="dtb-dropdown-divider" />
              <button
                className="dtb-dropdown-item"
                onClick={() => { setProfileOpen(false); navigate('/doctor/settings') }}
              >
                <Settings size={13} strokeWidth={2} /> Settings
              </button>
              <div className="dtb-dropdown-divider" />
              <button className="dtb-dropdown-item dtb-dropdown-item--danger" onClick={handleLogout}>
                <LogOut size={13} strokeWidth={2} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .dtb {
          position: fixed;
          top: 0; left: var(--sidebar-width); right: 0;
          height: var(--topbar-height);
          background: rgba(255, 255, 255, 0.65);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(226, 232, 240, 0.4);
          box-shadow: 0 4px 16px rgba(0,0,0,0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          z-index: 99;
          transition: background 0.5s ease, border-color 0.5s ease;
        }
        [data-theme='dark'] .dtb {
          background: rgba(11, 17, 32, 0.88);
          border-bottom-color: rgba(255, 255, 255, 0.07);
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        }

        .dtb-left { display:flex; flex-direction:column; gap:1px; }
        .dtb-title { font-size:15px; font-weight:700; color:var(--color-text); letter-spacing:-0.25px; line-height:1.2; }
        .dtb-subtitle { font-size:11px; color:var(--color-subtle); font-weight:400; }
        .dtb-right { display:flex; align-items:center; gap:10px; }

        .dtb-search { display:flex; align-items:center; gap:8px; background:var(--color-bg); border:1.5px solid var(--color-border); border-radius:var(--radius-full); padding:6px 14px; transition:all 0.24s cubic-bezier(0.4,0,0.2,1); }
        .dtb-search--focused { border-color:var(--color-safe); background:var(--color-surface); box-shadow:0 0 0 3px var(--color-safe-glow); }
        .dtb-search-icon { color:var(--color-subtle); flex-shrink:0; transition:color 0.18s cubic-bezier(0.4,0,0.2,1); }
        .dtb-search--focused .dtb-search-icon { color:var(--color-safe); }
        .dtb-search-input { border:none; background:transparent; outline:none; font-size:12.5px; font-weight:500; color:var(--color-text); width:148px; transition:width 0.24s cubic-bezier(0.4,0,0.2,1); font-family:var(--font-family); }
        .dtb-search--focused .dtb-search-input { width:180px; }
        .dtb-search-input::placeholder { color:var(--color-subtle); font-weight:400; }
        .dtb-search-clear { display:flex; align-items:center; background:none; border:none; color:var(--color-subtle); cursor:pointer; padding:2px; border-radius:50%; transition:all 0.18s cubic-bezier(0.4,0,0.2,1); }
        .dtb-search-clear:hover { color:var(--color-text); background:var(--color-border); }

        .dtb-icon-btn { position:relative; display:flex; align-items:center; justify-content:center; width:36px; height:36px; background:var(--color-bg); border:1.5px solid var(--color-border); border-radius:var(--radius-sm); color:var(--color-muted); cursor:pointer; transition:all 0.15s; }
        .dtb-icon-btn:hover { background:var(--color-surface); color:var(--color-text); transform:translateY(-1px); box-shadow:var(--shadow-sm); }
        .dtb-icon-btn:active { transform:scale(0.95); }

        /* Theme toggle — blue moon in light, gold sun in dark */
        .dtb-theme-btn:hover { color:var(--color-primary); border-color:var(--color-primary-muted); }
        [data-theme='dark'] .dtb-theme-btn { color:#FBBF24; }
        [data-theme='dark'] .dtb-theme-btn:hover { border-color:rgba(251,191,36,0.35); background:rgba(251,191,36,0.08); }

        .dtb-notif-dot { position:absolute; top:8px; right:8px; width:6px; height:6px; background:var(--color-danger); border-radius:50%; border:1.5px solid var(--color-surface); }

        .dtb-profile-wrap { position:relative; }
        .dtb-profile { display:flex; align-items:center; gap:9px; padding:5px 10px 5px 6px; border-radius:40px; cursor:pointer; transition:all 0.15s; background:transparent; border:1.5px solid transparent; font-family:var(--font-family); }
        .dtb-profile:hover, .dtb-profile--open { background:var(--color-bg); border-color:var(--color-border); }
        .dtb-avatar { width:32px; height:32px; background:linear-gradient(135deg, var(--color-safe) 0%, #15803D 100%); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:11.5px; font-weight:700; flex-shrink:0; letter-spacing:0.5px; box-shadow:0 2px 8px rgba(22,163,74,0.25); }
        .dtb-profile-name { font-size:12.5px; font-weight:600; color:var(--color-text); line-height:1.2; max-width:110px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .dtb-profile-role { font-size:10.5px; color:var(--color-safe); font-weight:600; }
        .dtb-chevron { color:var(--color-subtle); transition:transform 0.24s cubic-bezier(0.4,0,0.2,1); flex-shrink:0; }

        .dtb-dropdown { position:absolute; top:calc(100% + 8px); right:0; min-width:210px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-md); box-shadow:var(--shadow-xl); z-index:200; overflow:hidden; animation:dtbDropIn 0.18s cubic-bezier(0.4,0,0.2,1) both; }
        [data-theme='dark'] .dtb-dropdown { background:rgba(26,31,43,0.95); border-color:rgba(255,255,255,0.09); box-shadow:0 4px 8px rgba(0,0,0,0.3), 0 16px 40px rgba(0,0,0,0.45); }
        @keyframes dtbDropIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        .dtb-dropdown-header { display:flex; align-items:center; gap:10px; padding:14px 16px; }
        .dtb-dropdown-avatar { width:34px; height:34px; background:linear-gradient(135deg, var(--color-safe) 0%, #15803D 100%); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px; font-weight:700; flex-shrink:0; box-shadow:0 2px 8px rgba(22,163,74,0.22); }
        .dtb-dropdown-name { font-size:13px; font-weight:600; color:var(--color-text); line-height:1.3; }
        .dtb-dropdown-role { font-size:11px; color:var(--color-safe); margin-top:1px; font-weight:600; }
        .dtb-dropdown-divider { height:1px; background:var(--color-border); }
        .dtb-dropdown-item { display:flex; align-items:center; gap:10px; width:100%; padding:10px 16px; background:none; border:none; font-size:13px; font-weight:500; color:var(--color-text-2); cursor:pointer; transition:background 0.12s; text-align:left; font-family:var(--font-family); }
        .dtb-dropdown-item:hover { background:var(--color-bg); color:var(--color-text); }
        .dtb-dropdown-item--danger { color:var(--color-danger); }
        .dtb-dropdown-item--danger:hover { background:var(--color-danger-light); }
      `}</style>
    </header>
  )
}
