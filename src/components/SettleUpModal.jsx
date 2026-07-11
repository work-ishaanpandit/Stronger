import { useState, useMemo } from 'react';
import { X, CheckCircle, IndianRupee } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import useStore from '../store/useStore';

export default function SettleUpModal({ onClose }) {
  const getPendingRemuneration = useStore((s) => s.getPendingRemuneration);
  const settleUp = useStore((s) => s.settleUp);
  const { totalPending, pendingDays } = getPendingRemuneration();

  const [actualAmount, setActualAmount] = useState(totalPending.toFixed(2));
  const [submitting, setSubmitting] = useState(false);

  // Live preview: how the entered amount distributes oldest-first
  const preview = useMemo(() => {
    const entered = parseFloat(actualAmount) || 0;
    let remaining = entered;
    return pendingDays.map(([date, data]) => {
      const pendingForDay = (data.R_calc || 0) - (data.amount_received || 0);
      const applied = Math.min(pendingForDay, Math.max(0, remaining));
      remaining -= applied;
      return { date, pendingForDay, applied, fullySettled: applied >= pendingForDay };
    });
  }, [actualAmount, pendingDays]);

  const leftOver = Math.max(0, totalPending - (parseFloat(actualAmount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const amount = parseFloat(actualAmount);
    if (isNaN(amount) || amount < 0) { alert('Please enter a valid amount.'); return; }
    setSubmitting(true);
    await settleUp(amount);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={20} style={{ color: 'var(--green)' }} />
            Settle Up Remuneration
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="text-sm text-secondary" style={{ marginBottom: 'var(--sp-4)' }}>
            <strong>{pendingDays.length}</strong> days pending · Total outstanding:{' '}
            <strong style={{ color: 'var(--green)' }}>₹{totalPending.toFixed(2)}</strong>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: 'var(--sp-4)' }}>
              <label className="input-label">Amount Received (₹)</label>
              <div style={{ position: 'relative' }}>
                <IndianRupee size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="number"
                  className="input"
                  style={{ paddingLeft: '36px', fontSize: '1.2rem', fontWeight: 600 }}
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Live day-by-day allocation preview */}
            {pendingDays.length > 0 && (
              <div style={{
                background: 'var(--elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-3)',
                marginBottom: 'var(--sp-4)',
                maxHeight: 180,
                overflowY: 'auto',
              }}>
                <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--sp-2)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Allocation Preview (Oldest First)
                </div>
                {preview.map(({ date, pendingForDay, applied, fullySettled }) => (
                  <div key={date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span className="text-tertiary">{format(parseISO(date), 'MMM d, yyyy')}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Due ₹{pendingForDay.toFixed(2)}</span>
                    <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right', color: fullySettled ? 'var(--green)' : applied > 0 ? 'var(--orange)' : 'var(--text-quaternary)' }}>
                      {applied > 0 ? `−₹${applied.toFixed(2)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Remaining balance summary */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--sp-3)', marginBottom: 'var(--sp-4)',
              borderRadius: 'var(--radius-md)',
              background: leftOver > 0 ? 'rgba(255,159,10,0.08)' : 'rgba(48,209,88,0.08)',
              border: `1px solid ${leftOver > 0 ? 'rgba(255,159,10,0.3)' : 'rgba(48,209,88,0.3)'}`,
            }}>
              <span className="text-sm font-medium">
                {leftOver > 0 ? 'Still pending after this settlement' : '✓ Fully settled'}
              </span>
              {leftOver > 0 && (
                <span style={{ fontWeight: 700, color: 'var(--orange)', fontSize: 16 }}>
                  ₹{leftOver.toFixed(2)}
                </span>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Settling...' : 'Confirm Received'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
