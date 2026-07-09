import { useState } from 'react';
import { Target, X } from 'lucide-react';
import useStore from '../store/useStore';

export default function DisciplineCreationSheet({ onClose }) {
  const addCoreDiscipline = useStore((s) => s.addCoreDiscipline);

  const [form, setForm] = useState({
    name: '',
    weight: 1,
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    addCoreDiscipline({
      name: form.name.trim(),
      weight: parseFloat(form.weight) || 1,
      recurrence: 'daily',
      active: true,
    });
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

        <div className="divider" />

        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSave}
          disabled={!form.name.trim()}
        >
          Add Discipline
        </button>
      </div>
    </div>
  );
}
