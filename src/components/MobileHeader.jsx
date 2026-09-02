import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Menu, Settings as SettingsIcon } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function MobileHeader({ session, onMenuClick }) {
  const user = session?.user;
  const avatarUrl   = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const [showSettings, setShowSettings] = useState(false);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
    }
  };

  if (!user) return null;

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-header-left">
          <button className="mobile-header-btn" onClick={onMenuClick} aria-label="Open menu">
            <Menu size={24} />
          </button>
        </div>

        <div className="mobile-header-brand">
          <img src="/logo.png" alt="Stronger Logo" className="mobile-header-logo" />
          <span>Stronger</span>
        </div>

        <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="mobile-header-btn"
            onClick={() => setShowSettings(true)}
            title="Settings"
            aria-label="Settings"
          >
            <SettingsIcon size={20} />
          </button>
          <button className="mobile-header-avatar-btn" onClick={handleSignOut} title="Sign Out">
            {avatarUrl 
              ? <img src={avatarUrl} alt={displayName} className="mobile-header-avatar" />
              : <div className="mobile-header-avatar placeholder">{displayName.charAt(0).toUpperCase()}</div>
            }
          </button>
        </div>
      </header>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
