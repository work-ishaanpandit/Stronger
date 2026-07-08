import { useState } from 'react';
import { Brain, PenTool, Zap, Plus, X } from 'lucide-react';
import useStore from '../store/useStore';

export default function ReflectionPanel({ date, locked }) {
  const dailyLogs = useStore((s) => s.dailyLogs);
  const updateDailyLog = useStore((s) => s.updateDailyLog);

  const log = dailyLogs[date] ?? {};

  // Support array of learnings or fallback to migrating old data
  const learnings = log.learnings || [{ text: log.learnedNotes || '', url: log.learnedSourceUrl || '' }];

  const update = (field, value) => {
    if (locked) return;
    updateDailyLog(date, { [field]: value });
  };

  const updateLearning = (index, field, value) => {
    if (locked) return;
    const newLearnings = [...learnings];
    newLearnings[index] = { ...newLearnings[index], [field]: value };
    update('learnings', newLearnings);
  };

  const addLearning = () => {
    if (locked) return;
    update('learnings', [...learnings, { text: '', url: '' }]);
  };

  const removeLearning = (index) => {
    if (locked) return;
    const newLearnings = learnings.filter((_, i) => i !== index);
    if (newLearnings.length === 0) newLearnings.push({ text: '', url: '' }); // Always keep at least one
    update('learnings', newLearnings);
  };

  const [epiphanyVisible, setEpiphanyVisible] = useState(log.isEpiphanyVisible ?? false);

  const toggleEpiphany = () => {
    if (locked) return;
    const next = !epiphanyVisible;
    setEpiphanyVisible(next);
    updateDailyLog(date, { isEpiphanyVisible: next });
  };

  // "Add New" only appears when the last learning has text filled
  const lastLearning = learnings[learnings.length - 1];
  const canAddNew = !locked && lastLearning?.text?.trim().length > 0;

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      {/* Knowledge Sink */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Brain size={22} className="text-blue" />
            <h3 className="text-lg font-semibold">What did I learn today?</h3>
          </div>
          {canAddNew && (
            <button className="btn btn-ghost btn-sm" onClick={addLearning}>
              <Plus size={16} /> Add New
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          {learnings.map((item, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              {!locked && learnings.length > 1 && (
                <button 
                  className="btn-icon" 
                  onClick={() => removeLearning(idx)}
                  style={{ position: 'absolute', top: -10, right: -10, width: 24, height: 24, background: 'var(--red)', color: '#fff', border: '2px solid var(--card)' }}
                  aria-label="Remove learning"
                >
                  <X size={14} />
                </button>
              )}
              
              <textarea
                className="input"
                placeholder="Key insight, lesson, or concept you absorbed today…"
                rows={3}
                value={item.text}
                onChange={(e) => updateLearning(idx, 'text', e.target.value)}
                disabled={locked}
                style={{ marginBottom: item.text.trim() ? 'var(--sp-2)' : 0 }}
              />

              {/* URL field only appears once the text has content */}
              {item.text.trim() && (
                <div>
                  <input
                    type="url"
                    className="input input-sm"
                    placeholder="Source URL (optional)"
                    value={item.url}
                    onChange={(e) => updateLearning(idx, 'url', e.target.value)}
                    disabled={locked}
                  />
                </div>
              )}

              {idx < learnings.length - 1 && <div className="divider" style={{ marginTop: 'var(--sp-4)', marginBottom: '-var(--sp-1)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Daily Reflection */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
          <PenTool size={22} className="text-orange" />
          <h3 className="text-lg font-semibold">Daily Reflection</h3>
        </div>

        <textarea
          className="input"
          placeholder="How did today go? What drove you? What would you do differently? Let it flow…"
          rows={6}
          value={log.reflection ?? ''}
          onChange={(e) => update('reflection', e.target.value)}
          disabled={locked}
          style={{ lineHeight: 1.7 }}
        />
      </div>

      {/* The Epiphany */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <div
          className="toggle-wrap"
          onClick={toggleEpiphany}
          role="switch"
          aria-checked={epiphanyVisible}
          tabIndex={locked ? -1 : 0}
          onKeyDown={(e) => e.key === 'Enter' && toggleEpiphany()}
          style={{ marginBottom: epiphanyVisible ? 'var(--sp-4)' : 0 }}
        >
          <div className={`toggle ${epiphanyVisible ? 'on' : ''}`} />
          <div>
            <div className="text-base font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={18} className="text-purple" />
              Expose Breakthrough
            </div>
            <div className="text-sm text-tertiary">Record a major insight or revelation</div>
          </div>
        </div>

        {epiphanyVisible && (
          <div className="epiphany-container">
            <div className="epiphany-title">
              <Zap size={16} />
              The Epiphany
            </div>
            <textarea
              className="input"
              placeholder="What breakthrough did you have today? The insight that changes everything…"
              rows={4}
              value={log.epiphany ?? ''}
              onChange={(e) => update('epiphany', e.target.value)}
              disabled={locked}
              style={{
                background: 'transparent',
                border: '1px solid rgba(191, 90, 242, 0.3)',
                lineHeight: 1.7,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
