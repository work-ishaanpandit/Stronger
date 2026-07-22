import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Activity, XCircle, FastForward, Calendar, X, Lock } from 'lucide-react';
import useStore from '../store/useStore';

const STATUS_OPTIONS = [
  { value: 'finished',           label: 'Finished',          color: 'var(--green)', icon: CheckCircle },
  { value: 'partly_done',        label: 'Partly Done',       color: 'var(--orange)', icon: Activity },
  { value: 'missed',             label: 'Missed',             color: 'var(--red)', icon: XCircle },
  { value: 'postponed_tomorrow', label: 'Postponed Tomorrow', color: 'var(--blue)', icon: FastForward },
  { value: 'postponed_later',    label: 'Postponed Later',   color: 'var(--blue)', icon: Calendar },
];

export default function TaskAuditModal({ task, date, locked, onClose }) {
  const updateTask = useStore((s) => s.updateTask);

  const [status, setStatus] = useState(task.status ?? 'missed');
  const [completion, setCompletion] = useState(
    Math.round((task.completionPercentage ?? 0) * 100)
  );
  const [notes, setNotes] = useState(task.auditNotes ?? '');
  const [postponeDate, setPostponeDate] = useState(
    task.postponedToDate ?? format(new Date(), 'yyyy-MM-dd')
  );

  const handleSave = () => {
    updateTask(date, task.id, {
      status,
      completionPercentage: status === 'partly_done' ? completion / 100 : status === 'finished' ? 1 : 0,
      auditNotes: notes,
      postponedToDate: status === 'postponed_later' ? postponeDate : null,
    });
    onClose();
  };

  const typeColors = {
    normal: 'var(--blue)',
    power: 'var(--purple)',
    kickass: 'var(--red)',
    uncritical: 'var(--text-tertiary)',
  };

  return (
    <div className="overlay modal-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box anim-scale">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-4)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', marginBottom: 4 }}>
              <span
                className="badge"
                style={{ background: `${typeColors[task.type]}22`, color: typeColors[task.type] }}
              >
                {task.type?.toUpperCase()}
              </span>
              {task.rolloverBadge === 'yellow' && (
                <span className="badge badge-yellow">ROLLOVER</span>
              )}
              {task.rolloverBadge === 'red' && (
                <span className="badge badge-red">DELAYED</span>
              )}
            </div>
            <h3 className="text-lg font-semibold" style={{ lineHeight: 1.3 }}>{task.name}</h3>
            {task.tag && (
              <span className="text-sm text-tertiary">#{task.tag}</span>
            )}
          </div>
          <button className="btn-icon btn" onClick={onClose} aria-label="Close" style={{ flexShrink: 0, marginLeft: 'var(--sp-3)' }}>
            <X size={18} />
          </button>
        </div>

        {locked && (
          <div className="locked-banner" style={{ marginBottom: 'var(--sp-4)' }}>
            <Lock size={16} />
            This day is read-only (older than T-1)
          </div>
        )}

        {/* Status */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <label htmlFor="task-status">Status</label>
          <select
            id="task-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={locked}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Completion Slider (Partly Done only) */}
        {status === 'partly_done' && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label>Completion: {completion}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={completion}
              onChange={(e) => setCompletion(Number(e.target.value))}
              disabled={locked}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="text-xs text-tertiary">0%</span>
              <span className="text-xs text-tertiary">100%</span>
            </div>
          </div>
        )}

        {/* Date Picker (Postponed Later only) */}
        {status === 'postponed_later' && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label htmlFor="postpone-date">Postpone To</label>
            <input
              id="postpone-date"
              type="date"
              className="input input-sm"
              value={postponeDate}
              onChange={(e) => setPostponeDate(e.target.value)}
              disabled={locked}
            />
          </div>
        )}

        {/* Notes */}
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label htmlFor="audit-notes">Audit Notes</label>
          <textarea
            id="audit-notes"
            className="input"
            placeholder={locked ? "No notes recorded." : "Obstacles, context, lessons…"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={locked}
          />
        </div>

        {!locked && (
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} style={{ flex: 2 }}>Save</button>
          </div>
        )}

        {/* Task metadata */}
        {(task.weight > 0 || task.damage > 0 || task.delayCount > 0) && (
          <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            {task.type === 'normal' && (
              <span className="badge badge-blue">Weight: {task.weight}</span>
            )}
            {task.type === 'power' && (
              <span className="badge badge-purple">2× Multiplier</span>
            )}
            {task.type === 'kickass' && (
              <span className="badge badge-red">Damage: ₹{task.damage}</span>
            )}
            {task.delayCount > 0 && (
              <span className="badge badge-yellow">Delay ×{task.delayCount}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
