import { useState } from 'react';
import { Target, ArrowRight, XCircle, BookOpen, AlertCircle, Bookmark } from 'lucide-react';
import useStore from '../../store/useStore';

export default function PlanScreen({ onEndSessionRequest }) {
  const activeStudyBlockId = useStore((s) => s.activeStudyBlockId);
  const activeStudySessionId = useStore((s) => s.activeStudySessionId);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const studyDrafts = useStore((s) => s.studyDrafts);
  const setPlanDraft = useStore((s) => s.setPlanDraft);
  const startWorkBlock = useStore((s) => s.startWorkBlock);
  const isTransitioning = useStore((s) => s.isTransitioning);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentBlock = activeStudyBlockId ? studyBlocks[activeStudyBlockId] : null;

  // Retrieve previous block's next action as read-only context
  const previousBlock = Object.values(studyBlocks)
    .filter((b) => b.sessionId === activeStudySessionId && b.sequenceNumber < (currentBlock?.sequenceNumber || 1))
    .sort((a, b) => b.sequenceNumber - a.sequenceNumber)[0] || null;

  const handleStartWork = async (e) => {
    e.preventDefault();
    if (!studyDrafts.plan.plannedOutcome || !studyDrafts.plan.plannedOutcome.trim()) {
      setError('Planned outcome is required before starting the Work block.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await startWorkBlock(studyDrafts.plan);
    } catch (err) {
      setError(err.message || 'Failed to start Work block.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card anim-scale" style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--sp-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--blue-dim)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="text-xl font-bold">Plan Work Block</h2>
              <span className="badge badge-blue">Block #{currentBlock?.sequenceNumber || 1}</span>
            </div>
            <div className="text-xs text-tertiary">Define a specific observable outcome for this 25-minute sprint</div>
          </div>
        </div>

        <button
          className="btn btn-ghost btn-sm"
          onClick={onEndSessionRequest}
          style={{ color: 'var(--text-tertiary)' }}
          title="End Study Mode"
        >
          <XCircle size={15} /> End Study Mode
        </button>
      </div>

      {/* Read-Only Context: Previous Block's Next Action */}
      {previousBlock?.nextAction && (
        <div
          style={{
            padding: 'var(--sp-3) var(--sp-4)',
            background: 'var(--elevated)',
            borderLeft: '3px solid var(--purple)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--sp-5)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--purple)', fontWeight: 600, marginBottom: 2 }}>
            <Bookmark size={12} />
            <span>PREVIOUS BLOCK'S PLANNED NEXT ACTION (FOR REFERENCE)</span>
          </div>
          <div className="text-sm text-secondary" style={{ fontStyle: 'italic' }}>
            "{previousBlock.nextAction}"
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleStartWork}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
          <div>
            <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 6 }}>
              Course (optional free-text)
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Distributed Systems, Organic Chem…"
              value={studyDrafts.plan.course}
              onChange={(e) => setPlanDraft({ course: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 6 }}>
              Topic (optional free-text)
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Paxos Consensus, Reaction Mechanisms…"
              value={studyDrafts.plan.topic}
              onChange={(e) => setPlanDraft({ topic: e.target.value })}
            />
          </div>
        </div>

        <div style={{ marginBottom: 'var(--sp-5)' }}>
          <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 6 }}>
            Planned Outcome <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <textarea
            className="input"
            rows={4}
            placeholder="Specifically what will you derive, solve, explain from memory, or finish by the end of 25 minutes?"
            value={studyDrafts.plan.plannedOutcome}
            onChange={(e) => {
              setPlanDraft({ plannedOutcome: e.target.value });
              if (error) setError('');
            }}
            style={{ resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--red)',
              fontSize: 13,
              marginBottom: 'var(--sp-4)',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || isTransitioning}
            style={{ minWidth: 240 }}
          >
            <ArrowRight size={16} /> Start 25-Minute Work Block
          </button>
        </div>
      </form>
    </div>
  );
}
