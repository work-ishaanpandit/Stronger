import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings as SettingsIcon, Sliders, Check } from 'lucide-react';
import useStore from '../store/useStore';
import { CURRENCIES } from '../utils/currency';

export default function SettingsModal({ onClose }) {
  const settings = useStore((s) => s.settings) || { currency: 'INR', maxDailyRemuneration: 1000 };
  const updateSettings = useStore((s) => s.updateSettings);

  const [currency, setCurrency] = useState(settings.currency || 'INR');
  const [amount, setAmount] = useState(String(settings.maxDailyRemuneration ?? 1000));
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    const numVal = parseFloat(amount);
    if (isNaN(numVal) || numVal <= 0) {
      setError('Please enter a valid positive number for Maximum Daily Remuneration.');
      return;
    }

    setSubmitting(true);
    const res = await updateSettings({
      currency,
      maxDailyRemuneration: numVal,
    });
    setSubmitting(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setSuccessMsg(true);
      setTimeout(() => {
        onClose();
      }, 400);
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 999999 }}>
      <div className="modal-content" style={{ maxWidth: '480px', zIndex: 1000000 }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon size={20} className="text-blue" />
            Settings
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* General Section */}
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <div className="text-xs text-tertiary" style={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 'var(--sp-3)' }}>
                General
              </div>

              <div style={{
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-3)' }}>
                  <Sliders size={16} className="text-purple" />
                  <span className="font-semibold text-sm">Maximum Daily Remuneration</span>
                </div>
                <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--sp-4)', lineHeight: 1.4 }}>
                  Set the base cap and currency for daily task completion payout calculations.
                </div>

                <div className="input-group" style={{ marginBottom: 'var(--sp-4)' }}>
                  <label className="input-label" htmlFor="settings-currency">Currency</label>
                  <select
                    id="settings-currency"
                    className="input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label className="input-label" htmlFor="settings-amount">Amount</label>
                  <input
                    id="settings-amount"
                    type="number"
                    className="input"
                    style={{ fontSize: '1.1rem', fontWeight: 600 }}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (error) setError(null);
                    }}
                    min="1"
                    step="any"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,69,58,0.1)',
                border: '1px solid rgba(255,69,58,0.3)',
                color: 'var(--red)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-3)',
                fontSize: 13,
                marginBottom: 'var(--sp-4)'
              }}>
                {error}
              </div>
            )}

            {successMsg && (
              <div style={{
                background: 'rgba(48,209,88,0.1)',
                border: '1px solid rgba(48,209,88,0.3)',
                color: 'var(--green)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-3)',
                fontSize: 13,
                marginBottom: 'var(--sp-4)',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <Check size={16} /> Saved successfully!
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
