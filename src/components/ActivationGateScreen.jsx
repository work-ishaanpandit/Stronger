import { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ActivationGateScreen({ user, profile, onActivated }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setError(null);
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setError('Please enter your activation code.');
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch activation code for current user
      const { data: codeData, error: codeErr } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('user_id', user.id)
        .maybeSingle();

      if (codeErr || !codeData) {
        setError('Invalid activation code or code does not belong to your account.');
        setLoading(false);
        return;
      }

      if (codeData.is_used) {
        setError('This activation code has already been used.');
        setLoading(false);
        return;
      }

      if (new Date(codeData.expires_at) < new Date()) {
        setError('This activation code has expired. Please request a new code from the administrator.');
        setLoading(false);
        return;
      }

      // 2. Mark code as used
      await supabase
        .from('activation_codes')
        .update({ is_used: true, used_at: new Date().toISOString() })
        .eq('id', codeData.id);

      // 3. Update user profile account_status to ACTIVE
      await supabase
        .from('profiles')
        .update({ account_status: 'ACTIVE' })
        .eq('id', user.id);

      setSuccessMsg(true);
      setLoading(false);
      setTimeout(() => {
        if (onActivated) onActivated();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Activation failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-gate">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card" style={{ maxWidth: '440px' }}>
        <div className="auth-logo-wrap" style={{ background: 'rgba(255, 159, 10, 0.15)', borderColor: 'rgba(255, 159, 10, 0.3)' }}>
          <KeyRound size={28} className="text-orange" />
        </div>

        <h1 className="auth-title">Account Pending Activation</h1>
        <p className="auth-subtitle">
          Your account has been created successfully but hasn't been activated yet. Please enter your activation code below or contact the administrator.
        </p>

        <form onSubmit={handleActivate} style={{ width: '100%', marginTop: 'var(--sp-4)' }}>
          <div className="input-group" style={{ marginBottom: 'var(--sp-4)' }}>
            <label className="input-label" htmlFor="activation-code">Activation Code</label>
            <input
              id="activation-code"
              type="text"
              className="input text-center font-bold tracking-widest uppercase"
              style={{ fontSize: '1.2rem', letterSpacing: '0.2em' }}
              placeholder="e.g. HB7K-92PX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading || successMsg}
              required
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255, 69, 58, 0.1)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              color: 'var(--red)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--sp-3)',
              fontSize: 13,
              marginBottom: 'var(--sp-4)',
              textAlign: 'left'
            }}>
              {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(48, 209, 88, 0.1)',
              border: '1px solid rgba(48, 209, 88, 0.3)',
              color: 'var(--green)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--sp-3)',
              fontSize: 13,
              marginBottom: 'var(--sp-4)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: 8
            }}>
              <CheckCircle size={16} /> Account Activated! Loading application...
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 'var(--sp-3)' }}
            disabled={loading || successMsg}
          >
            {loading ? 'Activating...' : 'Activate Account'}
          </button>
        </form>

        <button
          className="btn btn-ghost btn-sm"
          onClick={handleSignOut}
          style={{ width: '100%', marginTop: 'var(--sp-2)', color: 'var(--text-tertiary)' }}
        >
          <LogOut size={14} /> Sign out ({user?.email})
        </button>
      </div>
    </div>
  );
}
