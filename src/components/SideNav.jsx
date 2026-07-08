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

const ICS_URL = 'webcal://localhost:3001/calendar.ics';

export default function SideNav({ session }) {
  const activeTab    = useStore((s) => s.activeTab);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const today        = format(new Date(), 'EEE, MMM d');
  const [appleCopied, setAppleCopied] = useState(false);

  const user = session?.user;
  const avatarUrl   = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';

  const handleAppleCal = () => {
    window.open(ICS_URL, '_blank');
    navigator.clipboard?.writeText(ICS_URL).then(() => {
      setAppleCopied(true);
      setTimeout(() => setAppleCopied(false), 2500);
    }).catch(() => {});
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <aside className="side-nav">
      {/* Brand */}
      <div className="nav-brand">
        <div className="nav-logo"><Flame size={16} /></div>
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
              onClick={() => setActiveTab(tab.id)}
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

        {/* Apple Calendar */}
        <button
          className="btn btn-sm btn-ghost"
          style={{
            width: '100%', justifyContent: 'flex-start', fontSize: 12,
            padding: 'var(--sp-2) var(--sp-3)',
            color: appleCopied ? 'var(--green)' : undefined,
            transition: 'color 0.3s',
          }}
          onClick={handleAppleCal}
          title={ICS_URL}
        >
          {appleCopied
            ? <Check size={14} style={{ marginRight: 6 }} />
            : <Link size={14} style={{ marginRight: 6 }} />
          }
          {appleCopied ? 'URL Copied!' : 'Subscribe Apple Cal'}
        </button>

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
            <button
              className="btn btn-sm btn-ghost btn-icon"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
