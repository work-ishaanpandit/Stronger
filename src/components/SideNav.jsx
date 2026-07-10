import { useState } from 'react';
import { format } from 'date-fns';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Sun, Moon, LayoutDashboard, Calendar as CalendarIcon, LogOut } from 'lucide-react';
import CalendarLinkPanel from './CalendarLinkPanel';

const TABS = [
  { id: 'dawn',      icon: Sun,             label: 'Dawn Alignment',  desc: 'Plan your day' },
  { id: 'dusk',      icon: Moon,            label: 'Dusk Synthesis',   desc: 'Review & reflect' },
  { id: 'chronicle', icon: LayoutDashboard, label: 'Chronicle',        desc: 'Track your arc' },
];

const PROJECT_REF = 'gqfejgicasfexwsaokin';

export default function SideNav({ session, isMobileOpen, onCloseMobile }) {
  const activeTab    = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const today        = format(new Date(), 'EEE, MMM d');
  const [showCalPanel, setShowCalPanel] = useState(false);

  const user = session?.user;
  const avatarUrl   = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div className="side-nav-mobile-overlay" onClick={onCloseMobile} />
      )}

      <aside className={`side-nav ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="nav-brand">
        <img src="/logo.png" alt="Stronger Logo" className="nav-brand-logo-img" />
        <span>Stronger</span>
      </div>

      {/* Navigation */}
      <nav className="nav-links">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobileOpen) onCloseMobile();
              }}
            >
              <div className="nav-item-icon"><Icon size={18} /></div>
              <div className="nav-item-text">
                <div className="nav-item-label">{tab.label}</div>
                <div className="nav-item-desc">{tab.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="nav-footer">
        <div className="nav-date-chip">
          <Sun size={12} />
          {today}
        </div>

        {/* F1: Calendar Link Panel toggle */}
        {user && (
          <div style={{ marginBottom: 'var(--sp-2)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowCalPanel((v) => !v)}
              style={{ width: '100%', justifyContent: 'flex-start', gap: 8, fontSize: 12 }}
            >
              <CalendarIcon size={13} />
              {showCalPanel ? 'Hide Calendar Link' : 'Calendar Subscription'}
            </button>
            {showCalPanel && (
              <div style={{ marginTop: 'var(--sp-2)' }}>
                <CalendarLinkPanel />
              </div>
            )}
          </div>
        )}

        {/* User Profile + Sign Out */}
        {user && (
          <div className="nav-user">
            <div className="nav-user-info">
              {avatarUrl
                ? <img src={avatarUrl} alt={displayName} className="nav-avatar" />
                : <div className="nav-avatar nav-avatar-placeholder">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
              }
              <div className="nav-user-name" title={user.email}>{displayName.split(' ')[0]}</div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                className="btn btn-sm btn-ghost btn-icon"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
