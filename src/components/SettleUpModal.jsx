import { useState } from 'react';
import { X, CheckCircle, IndianRupee } from 'lucide-react';
import useStore from '../store/useStore';

export default function SettleUpModal({ onClose }) {
  const getPendingRemuneration = useStore((s) => s.getPendingRemuneration);
  const settleUp = useStore((s) => s.settleUp);
  const { totalPending, pendingDays } = getPendingRemuneration();

  const [actualAmount, setActualAmount] = useState(totalPending.toString());
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const amount = parseFloat(actualAmount);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid amount.");
      return;
    }

    setSubmitting(true);
    await settleUp(amount);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
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
            You have <strong>{pendingDays.length}</strong> unclaimed days totaling <strong>₹{totalPending}</strong>.
            Enter the actual amount you received to mark these days as claimed.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label">Actual Amount Received (₹)</label>
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

            <div className="modal-footer" style={{ marginTop: 'var(--sp-5)' }}>
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
