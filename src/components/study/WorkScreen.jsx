import { useState, useEffect } from 'react';
import { Play, Pause, ArrowRight, XCircle, Clock, BookOpen, AlertCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { calculatePhaseTiming, formatTimerDisplay } from '../../engine/studyTimer';

export default function WorkScreen({ onEndSessionRequest }) {
  const activeStudyPhaseId = useStore((s) => s.activeStudyPhaseId);
  const activeStudyBlockId = useStore((s) => s.activeStudyBlockId);
  const studyPhases = useStore((s) => s.studyPhases);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const pauseActivePhase = useStore((s) => s.pauseActivePhase);
  const resumeActivePhase = useStore((s) => s.resumeActivePhase);
  const advanceToRecall = useStore((s) => s.advanceToRecall);
  const isTransitioning = useStore((s) => s.isTransitioning);

  // Tick state to update UI display smoothly
  const [, setTick] = useState(0);

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

  const handleTogglePause = () => {
    if (timing.isPaused) {
      resumeActivePhase();
    } else {
      pauseActivePhase();
    }
  };

  const handleNextRecall = () => {
    if (isTransitioning) return;
    advanceToRecall();
  };

  return (
    <div
      className="card anim-scale"
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 'var(--sp-8)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, var(--card) 0%, rgba(20,20,24,0.98) 100%)',
      }}
    >
      {/* Top Header / Context */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--sp-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-blue">Work Phase</span>
          <span className="text-xs text-tertiary">Block #{currentBlock?.sequenceNumber || 1}</span>
          {currentBlock?.course && (
            <span className="badge badge-gray" style={{ fontSize: 11 }}>
              {currentBlock.course}
            </span>
          )}
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

      {/* Prominent Planned Outcome (Read-Only) */}
      <div
        style={{
          padding: 'var(--sp-4) var(--sp-6)',
          background: 'var(--elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          marginBottom: 'var(--sp-8)',
          textAlign: 'left',
        }}
      >
        <div className="text-xs font-semibold text-tertiary uppercase tracking-wider" style={{ marginBottom: 4 }}>
          Planned Outcome
        </div>
        <div className="text-base text-primary font-medium" style={{ lineHeight: 1.5 }}>
          {currentBlock?.plannedOutcome || 'Focused study in progress…'}
        </div>
        {currentBlock?.topic && (
          <div className="text-xs text-blue" style={{ marginTop: 4 }}>
            Topic: {currentBlock.topic}
          </div>
        )}
      </div>

      {/* Hero Timer Display */}
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div
          style={{
            fontSize: 'clamp(54px, 10vw, 84px)',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            color: timing.isOvertime ? 'var(--orange)' : 'var(--text-primary)',
            transition: 'color 0.3s ease',
          }}
        >
          {timerText}
        </div>

        {/* Status Chip */}
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {timing.isPaused ? (
            <span className="badge badge-yellow" style={{ fontSize: 13, padding: '4px 12px' }}>
              ⏸ Paused
            </span>
          ) : timing.isOvertime ? (
            <span className="badge badge-orange" style={{ fontSize: 13, padding: '4px 12px' }}>
              Overtime (+{Math.floor(timing.overtimeSeconds / 60)}m {timing.overtimeSeconds % 60}s)
            </span>
          ) : (
            <span className="text-xs text-tertiary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} /> Target: 25 minutes
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-4)', marginTop: 'var(--sp-6)' }}>
        <button
          className={`btn ${timing.isPaused ? 'btn-primary' : 'btn-ghost'}`}
          onClick={handleTogglePause}
          style={{
            minWidth: 140,
            border: timing.isPaused ? 'none' : '1px solid var(--border)',
          }}
        >
          {timing.isPaused ? (
            <>
              <Play size={16} /> Resume
            </>
          ) : (
            <>
              <Pause size={16} /> Pause
            </>
          )}
        </button>

        <button
          className="btn btn-primary"
          onClick={handleNextRecall}
          disabled={isTransitioning}
          style={{ minWidth: 200, background: 'var(--green)', color: '#000' }}
        >
          <ArrowRight size={16} /> Next: Recall
        </button>
      </div>

      <div className="text-xs text-tertiary" style={{ marginTop: 'var(--sp-6)' }}>
        Take your time. When you are ready to capture what you learned, advance to Recall.
      </div>
    </div>
  );
}
