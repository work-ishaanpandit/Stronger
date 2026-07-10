import { useState } from 'react';
import { Target, X, Zap, Rocket, Skull, Leaf } from 'lucide-react';
import useStore from '../store/useStore';

const TASK_TYPES = [
  { id: 'normal',     icon: Zap,    name: 'Normal',     desc: 'Weighted task',    color: 'normal' },
  { id: 'power',      icon: Rocket, name: 'Power',      desc: '2× multiplier',    color: 'power' },
  { id: 'kickass',    icon: Skull,  name: 'Kickass',    desc: 'Damage penalty',   color: 'kickass' },
  { id: 'uncritical', icon: Leaf,   name: 'Uncritical', desc: 'Qualitative only', color: 'uncritical' },
];

export default function DisciplineCreationSheet({ onClose }) {
  const addCoreDiscipline = useStore((s) => s.addCoreDiscipline);

  const [form, setForm] = useState({
    name: '',
    tag: '',
    type: 'normal',
    weight: 1,
    damage: 50,
  });

  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    await addCoreDiscipline({
      name: form.name.trim(),
      tag: form.tag.trim() || null,
      type: form.type,
      weight: form.type === 'normal' ? parseFloat(form.weight) || 1 : 1,
      damage: form.type === 'kickass' ? parseFloat(form.damage) || 50 : 0,
      recurrence: 'daily',
      active: true,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="New Core Discipline">


        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
          <h2 className="text-xl font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Target size={22} className="text-blue" />
            New Core Discipline
          </h2>
          <button className="btn-icon btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <label htmlFor="disc-name">Discipline Name</label>
          <input
            id="disc-name"
            className="input"
            placeholder="e.g. Gym Session, Daily Reading"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
            maxLength={100}
          />
        </div>

        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label htmlFor="disc-tag">Tag (optional)</label>
          <input
            id="disc-tag"
            className="input input-sm"
            placeholder="e.g. work, health, learning"
            value={form.tag}
            onChange={(e) => set('tag', e.target.value)}
            maxLength={50}
          />
        </div>

        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label>Discipline Type</label>
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

        {form.type === 'normal' && (
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label htmlFor="disc-weight">Weight</label>
            <input
              id="disc-weight"
              type="number"
              min="0.1"
              max="100"
              step="0.5"
              className="input input-sm"
              value={form.weight}
              onChange={(e) => set('weight', e.target.value)}
            />
          </div>
        )}

        {form.type === 'kickass' && (
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <label htmlFor="disc-damage">Damage Penalty (₹)</label>
            <input
              id="disc-damage"
              type="number" min="0" step="10"
              className="input input-sm"
              value={form.damage}
              onChange={(e) => set('damage', e.target.value)}
            />
          </div>
        )}

        <div className="divider" />

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={!form.name.trim() || saving}
        >
          {saving ? 'Adding...' : 'Add Discipline'}
        </button>
      </div>
    </div>
  );
}
