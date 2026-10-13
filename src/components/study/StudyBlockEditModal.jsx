import { useState } from 'react';
import { X, Save, Edit3, History, AlertCircle, CheckCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { validateFocusRating } from '../../engine/studyTimer';

const FOCUS_OPTIONS = [
  { val: 1, label: '1 - Low' },
  { val: 2, label: '2 - Fair' },
  { val: 3, label: '3 - Good' },
  { val: 4, label: '4 - Strong' },
  { val: 5, label: '5 - Deep' },
];

export default function StudyBlockEditModal({ block, onClose }) {
  const editHistoricalBlock = useStore((s) => s.editHistoricalBlock);
  const studyRevisions = useStore((s) => s.studyRevisions);

  const [course, setCourse] = useState(block.course || '');
  const [topic, setTopic] = useState(block.topic || '');
  const [plannedOutcome, setPlannedOutcome] = useState(block.plannedOutcome || '');
  const [actualOutcome, setActualOutcome] = useState(block.actualOutcome || '');
  const [nextAction, setNextAction] = useState(block.nextAction || '');
  const [focusRating, setFocusRating] = useState(block.focusRating != null ? String(block.focusRating) : '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const blockRevisions = studyRevisions[block.id] || [];

  const handleSave = async (e) => {
    e.preventDefault();
    if (!plannedOutcome.trim()) {
      setError('Planned outcome cannot be empty');
      return;
    }

    const validatedFocus = focusRating ? validateFocusRating(focusRating) : null;
    if (focusRating && validatedFocus === null) {
      setError('Focus rating must be between 1 and 5');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await editHistoricalBlock(block.id, {
        course,
        topic,
        plannedOutcome,
        actualOutcome,
        nextAction,
        focusRating: validatedFocus,
      });
      setSavedSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Failed to save edits');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay modal-center" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box anim-scale" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 className="text-lg font-bold">Edit Study Block #{block.sequenceNumber}</h3>
            <span className={`badge ${block.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>
              {block.status}
            </span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
            <div>
              <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
                Course
              </label>
              <input
                type="text"
                className="input input-sm"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="Course name"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
                Topic
              </label>
              <input
                type="text"
                className="input input-sm"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Topic name"
              />
            </div>
          </div>

          <div style={{ marginBottom: 'var(--sp-3)' }}>
            <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Planned Outcome <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              className="input"
              rows={3}
              value={plannedOutcome}
              onChange={(e) => setPlannedOutcome(e.target.value)}
              placeholder="Planned outcome"
            />
          </div>

          <div style={{ marginBottom: 'var(--sp-3)' }}>
            <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Actual Outcome / Accomplished
            </label>
            <textarea
              className="input"
              rows={3}
              value={actualOutcome}
              onChange={(e) => setActualOutcome(e.target.value)}
              placeholder="What was actually completed or learned"
            />
          </div>

          <div style={{ marginBottom: 'var(--sp-3)' }}>
            <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Next Action
            </label>
            <textarea
              className="input"
              rows={2}
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Next action for future session"
            />
          </div>

          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Focus Rating (1 to 5)
            </label>
            <select
              className="input input-sm"
              value={focusRating}
              onChange={(e) => setFocusRating(e.target.value)}
            >
              <option value="">No rating</option>
              {FOCUS_OPTIONS.map((o) => (
                <option key={o.val} value={o.val}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-5)' }}>
            <span className="text-xs text-tertiary">
              * Phase timing and timestamps are immutable and preserved.
            </span>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {savedSuccess ? (
                  <>
                    <CheckCircle size={14} /> Saved!
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Audit History / Revisions */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--sp-3)' }}>
            <History size={15} className="text-blue" />
            <h4 className="text-sm font-semibold">Audit History ({blockRevisions.length})</h4>
          </div>

          {blockRevisions.length === 0 ? (
            <div className="text-xs text-tertiary" style={{ fontStyle: 'italic' }}>
              No edits recorded yet. Original records preserved.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
              {blockRevisions.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    padding: '8px 10px',
                    background: 'var(--elevated)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Field: {rev.fieldName}</span>
                    <span>{new Date(rev.editedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <div style={{ color: 'var(--red)', textDecoration: 'line-through' }}>
                    Prev: {rev.previousValue || '(empty)'}
                  </div>
                  <div style={{ color: 'var(--green)' }}>
                    New: {rev.newValue || '(empty)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
