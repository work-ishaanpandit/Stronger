import { format, parseISO } from 'date-fns';
import { X, Calendar, Clock, AlertTriangle, CheckCircle, Zap, Rocket, Skull, Leaf, Tag, Edit3, Trash2, Plus, FastForward } from 'lucide-react';
import useStore from '../store/useStore';
import { getEisenhowerQuadrant, isTaskOverdue } from '../utils/eisenhower';
import { getCurrencySymbol } from '../utils/currency';

export default function TaskDetailModal({ task, onClose, onEdit }) {
  const assignTaskToToday = useStore((s) => s.assignTaskToToday);
  const deleteTask = useStore((s) => s.deleteTask);
  const settings = useStore((s) => s.settings);

  if (!task) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const isAssignedToToday = task.logDate === todayStr || task.plannedDate === todayStr;
  const overdue = isTaskOverdue(task);
  const quadrant = getEisenhowerQuadrant(task.importance, task.urgency);
  const currencySymbol = getCurrencySymbol(settings?.currency);

  const handleAddToToday = () => {
    assignTaskToToday(task.id, todayStr);
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${task.name || task.title}"?`)) {
      deleteTask(task.logDate, task.id);
      onClose();
    }
  };

  const formatDateLabel = (dStr) => {
    if (!dStr) return 'None';
    try {
      return format(new Date(dStr), 'MMM d, yyyy');
    } catch (e) {
      return dStr;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className="badge" style={{ background: quadrant.bg, color: quadrant.color, border: `1px solid ${quadrant.border}`, fontWeight: 600 }}>
                {quadrant.emoji} {quadrant.label}
              </span>
              {task.type === 'power' && <span className="badge badge-purple">Power 2×</span>}
              {task.type === 'kickass' && <span className="badge badge-red">Kickass Penalty</span>}
              {task.tag && <span className="badge badge-blue">#{task.tag}</span>}
              {overdue && <span className="badge badge-red">⚠️ OVERDUE</span>}
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>{task.name || task.title}</h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {/* Metadata Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--sp-3)',
            background: 'var(--elevated)',
            padding: 'var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            <div>
              <div className="text-xs text-tertiary">Importance</div>
              <div className="font-semibold text-sm">{task.importance || 'Medium'}</div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Urgency</div>
              <div className="font-semibold text-sm">{task.urgency || 'Medium'}</div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Priority</div>
              <div className="font-semibold text-sm">{task.priority || 'Medium'}</div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Estimated Duration</div>
              <div className="font-semibold text-sm">{task.estimatedDuration || task.duration || 'Unset'}</div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Deadline</div>
              <div className="font-semibold text-sm" style={{ color: overdue ? 'var(--red)' : 'inherit' }}>
                {formatDateLabel(task.deadline)}
              </div>
            </div>
            <div>
              <div className="text-xs text-tertiary">Planned Date</div>
              <div className="font-semibold text-sm">
                {isAssignedToToday ? 'Today' : formatDateLabel(task.plannedDate || task.logDate)}
              </div>
            </div>
            {task.type === 'normal' && (
              <div>
                <div className="text-xs text-tertiary">Base Weight</div>
                <div className="font-semibold text-sm">{task.weight ?? 1}</div>
              </div>
            )}
            {task.type === 'kickass' && (
              <div>
                <div className="text-xs text-tertiary">Damage Penalty</div>
                <div className="font-semibold text-sm text-red">{currencySymbol}{task.damage ?? 50}</div>
              </div>
            )}
          </div>

          {/* Notes / Description */}
          {(task.notes || task.auditNotes) && (
            <div>
              <div className="text-xs text-tertiary font-semibold uppercase tracking-wider" style={{ marginBottom: 4 }}>
                Notes & Context
              </div>
              <div style={{
                background: 'var(--elevated)',
                padding: 'var(--sp-3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {task.notes || task.auditNotes}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(task)}>
              <Edit3 size={14} /> Edit
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--red)' }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            {!isAssignedToToday ? (
              <button className="btn btn-primary" onClick={handleAddToToday}>
                <Plus size={16} /> Add to Today
              </button>
            ) : (
              <span className="badge badge-green" style={{ height: 36, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={14} /> Planned for Today
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
