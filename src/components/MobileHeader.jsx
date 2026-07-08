import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, LogOut, Check, Link } from 'lucide-react';

const PROJECT_REF = 'gqfejgicasfexwsaokin';

export default function MobileHeader({ session }) {
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
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
    }
  };

  if (!user) return null;

  return (
    <header className="mobile-header">
      <div className="mobile-header-brand">
        <img src="/logo.png" alt="Stronger Logo" className="mobile-header-logo" />
        <span>Stronger</span>
      </div>

      <div className="mobile-header-actions">
        <button 
          className="mobile-header-btn"
          onClick={handleAppleCal}
          title={icsUrl}
          style={{ color: appleCopied ? 'var(--green)' : 'var(--blue)' }}
        >
          {appleCopied ? <Check size={18} /> : <CalendarIcon size={18} />}
        </button>

        <button className="mobile-header-avatar-btn" onClick={handleSignOut} title="Sign Out">
          {avatarUrl 
            ? <img src={avatarUrl} alt={displayName} className="mobile-header-avatar" />
            : <div className="mobile-header-avatar placeholder">{displayName.charAt(0).toUpperCase()}</div>
          }
        </button>
      </div>
    </header>
  );
}
