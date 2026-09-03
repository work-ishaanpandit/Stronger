import { useState } from 'react';
import { format } from 'date-fns';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';
import { Sun, Moon, LayoutDashboard, Calendar as CalendarIcon, LogOut, Settings as SettingsIcon, Layers, Shield } from 'lucide-react';
import CalendarLinkPanel from './CalendarLinkPanel';
import SettingsModal from './SettingsModal';

const TABS = [
  { id: 'dawn',      icon: Sun,             label: 'Dawn Alignment',  desc: 'Plan your day' },
  { id: 'basket',    icon: Layers,          label: 'Task Basket',     desc: 'Master repository' },
  { id: 'dusk',      icon: Moon,            label: 'Dusk Synthesis',   desc: 'Review & reflect' },
  { id: 'chronicle', icon: LayoutDashboard, label: 'Chronicle',        desc: 'Track your arc' },
];

const ADMIN_TAB = { id: 'admin', icon: Shield, label: 'Admin', desc: 'User & Subscriptions' };

export default function SideNav({ session, isMobileOpen, onCloseMobile }) {
  const activeTab    = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const userRole     = useStore((s) => s.userRole);
  const today        = format(new Date(), 'EEE, MMM d');
  const [showCalPanel, setShowCalPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const navTabs = userRole === 'admin' ? [...TABS, ADMIN_TAB] : TABS;

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
        {/* App Branding */}
        <div className="nav-brand">
          <img src="/logo.png" alt="Stronger Logo" className="nav-brand-logo-img" />
          <div className="nav-brand-text">
            <div className="nav-title">Stronger</div>
            <div className="nav-subtitle">Discipline Ledger</div>
          </div>
        </div>

        {/* Today Date Badge */}
        <div className="nav-date-chip" style={{ marginBottom: 'var(--sp-4)' }}>
          <Sun size={12} />
          <span>{today}</span>
        </div>

        {/* Navigation Links */}
        <nav className="nav-links">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (onCloseMobile) onCloseMobile();
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

        {/* Footer Tools & User Profile */}
        <div className="nav-footer">
          {/* Calendar subscription toggle */}
          {user && (
            <div style={{ marginBottom: 'var(--sp-2)' }}>
              <button
                className="btn btn-sm btn-ghost"
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
            <div className="nav-user" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--sp-2)', padding: '4px 0' }}>
              <div className="nav-user-info" style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} className="nav-avatar" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} />
                  : <div className="nav-avatar nav-avatar-placeholder" style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                }
                <div className="nav-user-name text-xs font-semibold" title={user.email} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayName.split(' ')[0]}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: '50%', flexShrink: 0 }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </aside>
    </>
  );
}
