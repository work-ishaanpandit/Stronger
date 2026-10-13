import { useState } from 'react';
import { Brain, ArrowRight, Play, CloudCheck, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';

export default function SetupScreen({ onResumeSession }) {
  const activeStudySessionId = useStore((s) => s.activeStudySessionId);
  const studySessions = useStore((s) => s.studySessions);
  const studyDrafts = useStore((s) => s.studyDrafts);
  const setBrainDumpDraft = useStore((s) => s.setBrainDumpDraft);
  const startStudySession = useStore((s) => s.startStudySession);
  const studySyncStatus = useStore((s) => s.studySyncStatus);
  const isTransitioning = useStore((s) => s.isTransitioning);

  const [loading, setLoading] = useState(false);

  const activeSession = activeStudySessionId ? studySessions[activeStudySessionId] : null;

  const handleStart = async () => {
    if (loading || isTransitioning) return;
    setLoading(true);
    try {
      await startStudySession(studyDrafts.brainDump);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card anim-scale" style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--sp-6)' }}>
      {/* Existing Active Session Alert */}
      {activeSession && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sp-4)',
            background: 'var(--blue-dim)',
            border: '1px solid var(--blue)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--sp-6)',
          }}
        >
          <div>
            <div className="text-sm font-semibold text-blue">Active Study Session in Progress</div>
            <div className="text-xs text-tertiary">
              Started at {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onResumeSession}>
            <Play size={14} /> Resume Session
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
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
          <Brain size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold">What's on your mind?</h2>
          <div className="text-xs text-tertiary">Pre-study mental de-cluttering (one dump for the entire session)</div>
        </div>
      </div>

      <div className="text-sm text-secondary" style={{ lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
        Offload distracting thoughts, tasks, worries, or mental loops before entering focused work.
        You can leave this blank if your mind is already clear.
      </div>

      {/* Brain Dump Textarea */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <textarea
          className="input"
          placeholder="Jot down open loops, reminders, worries, or stray thoughts here…"
          rows={7}
          value={studyDrafts.brainDump}
          onChange={(e) => setBrainDumpDraft(e.target.value)}
          style={{ resize: 'vertical', minHeight: 140, lineHeight: 1.5 }}
        />
      </div>

      {/* Footer & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
          {studySyncStatus === 'local_only' ? (
            <span>Draft saved locally</span>
          ) : studySyncStatus === 'synced' ? (
            <span style={{ color: 'var(--green)' }}>✓ Synced</span>
          ) : null}
        </div>

        <button
          className="btn btn-primary"
          onClick={handleStart}
          disabled={loading || isTransitioning}
          style={{ minWidth: 180 }}
        >
          <ArrowRight size={16} /> Enter Study Mode
        </button>
      </div>
    </div>
  );
}
