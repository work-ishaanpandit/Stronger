import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AccountSuspendedScreen({ user }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="auth-gate">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card" style={{ maxWidth: '420px' }}>
        <div className="auth-logo-wrap" style={{ background: 'rgba(255, 69, 58, 0.15)', borderColor: 'rgba(255, 69, 58, 0.3)' }}>
          <ShieldAlert size={28} className="text-red" />
        </div>

        <h1 className="auth-title" style={{ color: 'var(--red)' }}>Account Suspended</h1>
        <p className="auth-subtitle">
          Your account has been suspended by the administrator. Please contact support if you believe this is an error.
        </p>

        <button
          className="btn btn-ghost btn-sm"
          onClick={handleSignOut}
          style={{ width: '100%', marginTop: 'var(--sp-4)', color: 'var(--text-tertiary)' }}
        >
          <LogOut size={14} /> Sign out ({user?.email})
        </button>
      </div>
    </div>
  );
}
