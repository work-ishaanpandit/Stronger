import { DollarSign, ShieldAlert, LogOut, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PRICING_CONFIG, getEffectivePrice } from '../config/pricing';

export default function SubscriptionGateScreen({ user, profile }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const monthlyPrice = getEffectivePrice('monthly', profile);
  const yearlyPrice = getEffectivePrice('yearly', profile);

  return (
    <div className="auth-gate">
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />

      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-logo-wrap" style={{ background: 'rgba(10, 132, 255, 0.15)', borderColor: 'rgba(10, 132, 255, 0.3)' }}>
          <CreditCard size={28} className="text-blue" />
        </div>

        <h1 className="auth-title">Subscription Required</h1>
        <p className="auth-subtitle">
          Your account is active, but requires a valid subscription to access Stronger.
        </p>

        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--sp-3)',
          margin: 'var(--sp-4) 0'
        }}>
          <div style={{
            background: 'var(--elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--sp-4)',
            textAlign: 'center'
          }}>
            <div className="text-xs text-tertiary font-semibold uppercase">Monthly</div>
            <div className="text-xl font-bold text-blue" style={{ marginTop: 4 }}>
              {PRICING_CONFIG.currencySymbol}{monthlyPrice}
              <span className="text-xs text-tertiary font-normal">/mo</span>
            </div>
          </div>

          <div style={{
            background: 'var(--elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--sp-4)',
            textAlign: 'center'
          }}>
            <div className="text-xs text-tertiary font-semibold uppercase">Yearly</div>
            <div className="text-xl font-bold text-green" style={{ marginTop: 4 }}>
              {PRICING_CONFIG.currencySymbol}{yearlyPrice}
              <span className="text-xs text-tertiary font-normal">/yr</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--sp-4)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          textAlign: 'left',
          marginBottom: 'var(--sp-4)',
          lineHeight: 1.5
        }}>
          <div className="font-semibold text-primary" style={{ marginBottom: 4 }}>How to subscribe or renew:</div>
          Please contact the administrator to record your payment and activate your subscription. Your data and history remain completely safe.
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={handleSignOut}
          style={{ width: '100%', color: 'var(--text-tertiary)' }}
        >
          <LogOut size={14} /> Sign out ({user?.email})
        </button>
      </div>
    </div>
  );
}
