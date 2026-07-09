import { useState } from 'react';
import { format } from 'date-fns';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Sun, Moon, LayoutDashboard, Flame, Link, Check, LogOut, Calendar as CalendarIcon } from 'lucide-react';

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
  const [appleCopied, setAppleCopied] = useState(false);

  const user = session?.user;
  const avatarUrl   = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';

  const icsUrl = user 
    ? `webcal://${PROJECT_REF}.supabase.co/functions/v1/calendar-sync?user_id=${user.id}&token=mock_oauth_token`
    : '';

  const handleAppleCal = () => {
    if (!icsUrl) return;
    window.open(icsUrl, '_blank');
    navigator.clipboard?.writeText(icsUrl).then(() => {
      setAppleCopied(true);
      setTimeout(() => setAppleCopied(false), 2500);
    }).catch(() => {});
  };

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
                onClick={handleAppleCal}
                title={appleCopied ? 'URL Copied!' : 'Subscribe to Apple Calendar'}
                aria-label="Subscribe to Apple Calendar"
                style={{ color: appleCopied ? 'var(--green)' : undefined }}
              >
                {appleCopied ? <Check size={14} /> : <CalendarIcon size={14} />}
              </button>
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
