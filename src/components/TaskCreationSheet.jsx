import { useState } from 'react';
import { Zap, Rocket, Skull, Leaf, X, Calendar, Clock } from 'lucide-react';
import useStore from '../store/useStore';

const TASK_TYPES = [
  { id: 'normal',     icon: Zap,    name: 'Normal',     desc: 'Weighted task',    color: 'normal' },
  { id: 'power',      icon: Rocket, name: 'Power',      desc: '2× multiplier',    color: 'power' },
  { id: 'kickass',    icon: Skull,  name: 'Kickass',    desc: 'Damage penalty',   color: 'kickass' },
  { id: 'uncritical', icon: Leaf,   name: 'Uncritical', desc: 'Qualitative only', color: 'uncritical' },
];

const RECURRENCE = ['none', 'daily', 'weekly', 'monthly'];

const DEFAULT_TASK = {
  name: '',
  tag: '',
  type: 'normal',
  weight: 1,
  damage: 50,
  recurrence: 'none',
  // Two-step calendar sync
  calendarSync: false,
  timeBlockEnabled: false,
  timeBlockStart: '09:00',
  timeBlockEnd: '10:00',
};

export default function TaskCreationSheet({ date, task = null, onClose }) {
  const addTask    = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);

  const isEdit = !!task;
  const [form, setForm] = useState(isEdit ? {
    name:             task.name ?? '',
    tag:              task.tag ?? '',
    type:             task.type ?? 'normal',
    weight:           task.weight ?? 1,
    damage:           task.damage ?? 50,
    recurrence:       task.recurrence ?? 'none',
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
      addTask(date, { ...payload, id: crypto.randomUUID(), logDate: date });
    }
    onClose();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit Task' : 'New Task'}>
        <div className="sheet-handle" />

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
            <label htmlFor="task-damage">Damage Penalty (₹)</label>
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
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="divider" />

        {/* ── Calendar Sync (Step 1) ── */}
        <div style={{ marginBottom: 'var(--sp-3)' }}>
          <div
            className="toggle-wrap"
            onClick={() => {
              const next = !form.calendarSync;
              set('calendarSync', next);
              // If turning sync off, also disable time block
              if (!next) set('timeBlockEnabled', false);
            }}
            role="switch"
            aria-checked={form.calendarSync}
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && set('calendarSync', !form.calendarSync)}
          >
            <div className={`toggle ${form.calendarSync ? 'on' : ''}`} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} className={form.calendarSync ? 'text-blue' : 'text-tertiary'} />
                <span className="text-sm font-medium">Sync to Calendar</span>
              </div>
              <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
                Adds task as an all-day event in Apple Calendar
              </div>
            </div>
          </div>
        </div>

        {/* ── Block Time (Step 2 — only visible when sync is ON) ── */}
        {form.calendarSync && (
          <div
            style={{
              marginLeft: 'var(--sp-5)',
              borderLeft: '2px solid var(--border)',
              paddingLeft: 'var(--sp-4)',
              marginBottom: 'var(--sp-3)',
            }}
          >
            {/* Block Time checkbox */}
            <div
              className="toggle-wrap"
              style={{ marginBottom: form.timeBlockEnabled ? 'var(--sp-3)' : 0 }}
              onClick={() => set('timeBlockEnabled', !form.timeBlockEnabled)}
              role="switch"
              aria-checked={form.timeBlockEnabled}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && set('timeBlockEnabled', !form.timeBlockEnabled)}
            >
              <div className={`toggle toggle-sm ${form.timeBlockEnabled ? 'on' : ''}`} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} className={form.timeBlockEnabled ? 'text-orange' : 'text-tertiary'} />
                  <span className="text-sm">Block Time</span>
                </div>
                <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
                  Reserve a specific time slot on the calendar
                </div>
              </div>
            </div>

            {/* Time pickers — only when block time is ON */}
            {form.timeBlockEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                <div>
                  <label htmlFor="task-start">Start</label>
                  <input
                    id="task-start"
                    type="time"
                    className="input input-sm"
                    value={form.timeBlockStart}
                    onChange={(e) => set('timeBlockStart', e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="task-end">End</label>
                  <input
                    id="task-end"
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

        <div className="divider" />

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={!form.name.trim()}
        >
          {isEdit ? 'Save Changes' : 'Add Task'}
        </button>
      </div>
    </div>
  );
}
