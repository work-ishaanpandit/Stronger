import { useState, useEffect } from 'react';
import { Brain, Coffee, ArrowRight, XCircle, Play, Pause, Clock, Star } from 'lucide-react';
import useStore from '../../store/useStore';
import { calculatePhaseTiming, formatTimerDisplay } from '../../engine/studyTimer';
import { useStudyTimerAlert } from './useStudyTimerAlert';
import StudySpeakerButton from './StudySpeakerButton';

const FOCUS_LABELS = [
  { val: 1, label: '1 - Low', desc: 'Distracted / Frequent interruptions' },
  { val: 2, label: '2 - Fair', desc: 'Mild focus with drift' },
  { val: 3, label: '3 - Good', desc: 'Steady work' },
  { val: 4, label: '4 - Strong', desc: 'High concentration' },
  { val: 5, label: '5 - Deep', desc: 'Flow state / Zero friction' },
];

export default function RecallScreen({ onEndSessionRequest }) {
  const activeStudyPhaseId = useStore((s) => s.activeStudyPhaseId);
  const activeStudyBlockId = useStore((s) => s.activeStudyBlockId);
  const studyPhases = useStore((s) => s.studyPhases);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const studyDrafts = useStore((s) => s.studyDrafts);
  const setRecallDraft = useStore((s) => s.setRecallDraft);
  const pauseActivePhase = useStore((s) => s.pauseActivePhase);
  const resumeActivePhase = useStore((s) => s.resumeActivePhase);
  const saveRecallAndStartBreak = useStore((s) => s.saveRecallAndStartBreak);
  const isTransitioning = useStore((s) => s.isTransitioning);

  const [, setTick] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const currentPhase = activeStudyPhaseId ? studyPhases[activeStudyPhaseId] : null;
  const currentBlock = activeStudyBlockId ? studyBlocks[activeStudyBlockId] : null;

  const timing = calculatePhaseTiming(currentPhase);
  const timerText = formatTimerDisplay(timing);

  const { isBuzzing, stopBuzzing } = useStudyTimerAlert(currentPhase, timing);

  const handleTogglePause = () => {
    stopBuzzing();
    if (timing.isPaused) {
      resumeActivePhase();
    } else {
      pauseActivePhase();
    }
  };

  const handleSaveAndBreak = async (e) => {
    e?.preventDefault();
    if (submitting || isTransitioning) return;
    stopBuzzing();
    setSubmitting(true);
    try {
      await saveRecallAndStartBreak(studyDrafts.recall);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card anim-scale" style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--sp-6)' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-md)',
              background: 'var(--purple-dim)',
              color: 'var(--purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Brain size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="text-xl font-bold">Active Recall Phase</h2>
              <span className="badge badge-purple">Block #{currentBlock?.sequenceNumber || 1}</span>
            </div>
            <div className="text-xs text-tertiary">Quickly solidify learning and set next action (Target: 60s)</div>
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

      {/* Timer Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--elevated)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--sp-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: timing.isOvertime ? 'var(--orange)' : 'var(--text-primary)',
            }}
          >
            {timerText}
          </span>
          {timing.isPaused && <span className="badge badge-yellow">Paused</span>}
          {timing.isOvertime && <span className="badge badge-orange">Overtime</span>}
          <StudySpeakerButton
            isBuzzing={isBuzzing}
            onStopBuzzing={stopBuzzing}
            themeColor="var(--purple)"
            size="sm"
          />
        </div>

        <button className="btn btn-ghost btn-sm" onClick={handleTogglePause}>
          {timing.isPaused ? <Play size={14} /> : <Pause size={14} />}
          <span>{timing.isPaused ? 'Resume' : 'Pause'}</span>
        </button>
      </div>

      {/* Recall Form */}
      <form onSubmit={handleSaveAndBreak}>
        {/* Field 1: Accomplished / Learned */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 6 }}>
            What did I accomplish or learn?
          </label>
          <textarea
            className="input"
            rows={3}
            placeholder="Key derivation, problem solved, concept grasped, or summary from memory…"
            value={studyDrafts.recall.done}
            onChange={(e) => setRecallDraft({ done: e.target.value })}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Field 2: Next Action */}
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 6 }}>
            What is my next action?
          </label>
          <textarea
            className="input"
            rows={2}
            placeholder="What exact step to take next time you sit down for this topic…"
            value={studyDrafts.recall.next}
            onChange={(e) => setRecallDraft({ next: e.target.value })}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Field 3: Focus Rating */}
        <div style={{ marginBottom: 'var(--sp-6)' }}>
          <label className="text-xs font-semibold text-tertiary" style={{ display: 'block', marginBottom: 8 }}>
            How focused was I? (1 - 5)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--sp-2)' }}>
            {FOCUS_LABELS.map((item) => {
              const isSelected = studyDrafts.recall.focus === item.val;
              return (
                <button
                  type="button"
                  key={item.val}
                  onClick={() => setRecallDraft({ focus: isSelected ? null : item.val })}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '2px solid var(--blue)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--blue-dim)' : 'var(--elevated)',
                    color: isSelected ? 'var(--blue)' : 'var(--text-secondary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease',
                  }}
                  title={item.desc}
                >
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{item.val}</span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>{item.label.split(' - ')[1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || isTransitioning}
            style={{ minWidth: 240 }}
          >
            <Coffee size={16} /> Save Recall & Start Break
          </button>
        </div>
      </form>
    </div>
  );
}
