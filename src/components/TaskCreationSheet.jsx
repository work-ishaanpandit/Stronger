import { useState } from 'react';
import { Zap, Rocket, Skull, Leaf, X, Calendar, Clock, Sliders } from 'lucide-react';
import useStore from '../store/useStore';
import { getCurrencySymbol } from '../utils/currency';
import { getEisenhowerQuadrant } from '../utils/eisenhower';

const TASK_TYPES = [
  { id: 'normal',     icon: Zap,    name: 'Normal',     desc: 'Weighted task',    color: 'normal' },
  { id: 'power',      icon: Rocket, name: 'Power',      desc: '2× multiplier',    color: 'power' },
  { id: 'kickass',    icon: Skull,  name: 'Kickass',    desc: 'Damage penalty',   color: 'kickass' },
  { id: 'uncritical', icon: Leaf,   name: 'Uncritical', desc: 'Qualitative only', color: 'uncritical' },
];

const RECURRENCE = ['none', 'daily', 'weekdays', 'weekly', 'monthly'];

const DEFAULT_TASK = {
  name: '',
  tag: '',
  type: 'normal',
  weight: 1,
  damage: 50,
  recurrence: 'none',
  importance: 'Medium',
  urgency: 'Medium',
  priority: 'Medium',
  deadline: '',
  estimatedDuration: '',
  notes: '',
  calendarSync: false,
  timeBlockEnabled: false,
  timeBlockStart: '09:00',
  timeBlockEnd: '10:00',
};

export default function TaskCreationSheet({ date, task = null, onClose }) {
  const addTask    = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const settings   = useStore((s) => s.settings);
  const symbol     = getCurrencySymbol(settings?.currency);

  const isEdit = !!task;
  const [form, setForm] = useState(isEdit ? {
    name:             task.name ?? '',
    tag:              task.tag ?? '',
    type:             task.type ?? 'normal',
    weight:           task.weight ?? 1,
    damage:           task.damage ?? 50,
    recurrence:       task.recurrence ?? 'none',
    importance:       task.importance ?? 'Medium',
    urgency:          task.urgency ?? 'Medium',
    priority:         task.priority ?? 'Medium',
    deadline:         task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
    estimatedDuration:task.estimatedDuration ?? '',
    notes:            task.notes ?? task.auditNotes ?? '',
    calendarSync:     task.calendarSync ?? false,
    timeBlockEnabled: task.timeBlockEnabled ?? false,
    timeBlockStart:   task.timeBlockStart ?? '09:00',
    timeBlockEnd:     task.timeBlockEnd ?? '10:00',
  } : { ...DEFAULT_TASK });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) return;

    // Two-step logic: timeBlock only active when calendarSync is also on
    const syncOn      = form.calendarSync;
    const blockOn     = syncOn && form.timeBlockEnabled;

    const payload = {
      name:             form.name.trim(),
      tag:              form.tag.trim() || null,
      type:             form.type,
      weight:           form.type === 'normal' ? parseFloat(form.weight) || 1 : 1,
      damage:           form.type === 'kickass' ? parseFloat(form.damage) || 50 : 0,
      recurrence:       form.recurrence,
      importance:       form.importance,
      urgency:          form.urgency,
      priority:         form.priority,
      deadline:         form.deadline ? new Date(form.deadline).toISOString() : null,
      estimatedDuration:form.estimatedDuration.trim() || null,
      notes:            form.notes.trim() || null,
      calendarSync:     syncOn,
      timeBlockEnabled: blockOn,
      timeBlockStart:   blockOn ? form.timeBlockStart : null,
      timeBlockEnd:     blockOn ? form.timeBlockEnd   : null,
      status:           isEdit ? task.status : 'missed',
      completionPercentage: isEdit ? task.completionPercentage : 0,
      hasBonus:         false,
      delayCount:       isEdit ? (task.delayCount ?? 0) : 0,
      originalDate:     isEdit ? task.originalDate : date,
      auditNotes:       isEdit ? (task.auditNotes ?? '') : '',
    };

    if (isEdit) {
      updateTask(date, task.id, payload);
    } else {
      addTask(date, payload);
    }
    onClose();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Task' : 'New Task'}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
          <h2 className="text-xl font-semibold">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn-icon btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Task Name */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <label htmlFor="task-name">Task Name</label>
          <input
            id="task-name"
            className="input"
            placeholder="What needs to be done?"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
            maxLength={100}
          />
        </div>

        {/* Tag */}
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label htmlFor="task-tag">Tag (optional)</label>
          <input
            id="task-tag"
            className="input input-sm"
            placeholder="e.g. work, health, learning"
            value={form.tag}
            onChange={(e) => set('tag', e.target.value)}
            maxLength={50}
          />
        </div>

        {/* Eisenhower Planning Fields */}
        <div style={{
          background: 'var(--elevated)',
          padding: 'var(--sp-4)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          marginBottom: 'var(--sp-5)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sliders size={14} className="text-purple" />
              Eisenhower Matrix
            </div>

            {/* Dynamic Quadrant Badge */}
            {(() => {
              const q = getEisenhowerQuadrant(form.importance, form.urgency);
              return (
                <span className="badge" style={{ background: q.bg, color: q.color, border: `1px solid ${q.border}`, fontSize: 11, fontWeight: 600 }}>
                  {q.emoji} {q.label}
                </span>
              );
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
            <div>
              <label htmlFor="task-importance" className="text-xs">Importance</label>
              <select
                id="task-importance"
                className="input input-sm"
                value={form.importance}
                onChange={(e) => set('importance', e.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label htmlFor="task-urgency" className="text-xs">Urgency</label>
              <select
                id="task-urgency"
                className="input input-sm"
                value={form.urgency}
                onChange={(e) => set('urgency', e.target.value)}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)' }}>
            <div>
              <label htmlFor="task-deadline" className="text-xs">Deadline (optional)</label>
              <input
                id="task-deadline"
                type="datetime-local"
                className="input input-sm"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="task-duration" className="text-xs">Estimated Duration</label>
              <input
                id="task-duration"
                type="text"
                className="input input-sm"
                placeholder="e.g. 30 min, 1 hr"
                value={form.estimatedDuration}
                onChange={(e) => set('estimatedDuration', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Task Type */}
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label>Task Type</label>
          <div className="type-selector">
            {TASK_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`type-option ${form.type === t.id ? `selected ${t.color}` : ''}`}
                  onClick={() => set('type', t.id)}
                >
                  <Icon className="type-icon" size={22} />
                  <div className="type-name">{t.name}</div>
                  <div className="type-desc">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weight (Normal only) */}
        {form.type === 'normal' && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label htmlFor="task-weight">Weight</label>
            <input
              id="task-weight"
              type="number" min="0.1" max="100" step="0.5"
              className="input input-sm"
              value={form.weight}
              onChange={(e) => set('weight', e.target.value)}
            />
          </div>
        )}

        {/* Damage (Kickass only) */}
        {form.type === 'kickass' && (
          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label htmlFor="task-damage">Damage Penalty ({symbol})</label>
            <input
              id="task-damage"
              type="number" min="0" step="10"
              className="input input-sm"
              value={form.damage}
              onChange={(e) => set('damage', e.target.value)}
            />
          </div>
        )}

        {/* Recurrence */}
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label htmlFor="task-recurrence">Repeat</label>
          <select
            id="task-recurrence"
            className="input input-sm"
            value={form.recurrence}
            onChange={(e) => set('recurrence', e.target.value)}
          >
            {RECURRENCE.map((r) => (
              <option key={r} value={r}>
                {r === 'none' ? 'No repeat' : r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label htmlFor="task-notes">Notes & Context (optional)</label>
          <textarea
            id="task-notes"
            className="input"
            style={{ height: 70, resize: 'vertical' }}
            placeholder="Add relevant instructions, links, or notes..."
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        {/* Two-Step Calendar Sync */}
        <div style={{ marginBottom: 'var(--sp-5)', background: 'var(--bg)', padding: 'var(--sp-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.calendarSync ? 'var(--sp-3)' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <Calendar size={16} className="text-blue" />
              <div>
                <div className="text-sm font-medium">Sync to External Calendar</div>
                <div className="text-xs text-tertiary">Include in your .ics feed for Google Calendar / Apple Calendar</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.calendarSync}
              onChange={(e) => set('calendarSync', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
          </div>

          {form.calendarSync && (
            <div style={{ paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.timeBlockEnabled ? 'var(--sp-3)' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Clock size={16} className="text-purple" />
                  <div>
                    <div className="text-sm font-medium">Set Time Block</div>
                    <div className="text-xs text-tertiary">Specify exact start/end times for calendar events</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.timeBlockEnabled}
                  onChange={(e) => set('timeBlockEnabled', e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              {form.timeBlockEnabled && (
                <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11 }}>Start Time</label>
                    <input
                      type="time"
                      className="input input-sm"
                      value={form.timeBlockStart}
                      onChange={(e) => set('timeBlockStart', e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11 }}>End Time</label>
                    <input
                      type="time"
                      className="input input-sm"
                      value={form.timeBlockEnd}
                      onChange={(e) => set('timeBlockEnd', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="divider" />

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={!form.name.trim()}
        >
          {isEdit ? 'Save Changes' : 'Create Task'}
        </button>
      </div>
    </div>
  );
}
