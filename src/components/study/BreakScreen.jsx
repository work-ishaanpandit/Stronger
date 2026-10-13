import { useState, useEffect } from 'react';
import { Coffee, ArrowRight, Play, Pause, XCircle, Clock, RotateCcw } from 'lucide-react';
import useStore from '../../store/useStore';
import { calculatePhaseTiming, formatTimerDisplay } from '../../engine/studyTimer';

export default function BreakScreen({ onEndSessionRequest }) {
  const activeStudyPhaseId = useStore((s) => s.activeStudyPhaseId);
  const activeStudyBlockId = useStore((s) => s.activeStudyBlockId);
  const studyPhases = useStore((s) => s.studyPhases);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const pauseActivePhase = useStore((s) => s.pauseActivePhase);
  const resumeActivePhase = useStore((s) => s.resumeActivePhase);
  const returnToPlan = useStore((s) => s.returnToPlan);
  const isTransitioning = useStore((s) => s.isTransitioning);

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

  const handleReturnToPlan = () => {
    if (isTransitioning) return;
    returnToPlan();
  };

  return (
    <div
      className="card anim-scale"
      style={{
        maxWidth: 680,
        margin: '0 auto',
        padding: 'var(--sp-8)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, var(--card) 0%, rgba(20,24,20,0.98) 100%)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--sp-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-green">Break Phase</span>
          <span className="text-xs text-tertiary">Completed Block #{currentBlock?.sequenceNumber || 1}</span>
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

      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--green-dim)',
            color: 'var(--green)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--sp-3)',
          }}
        >
          <Coffee size={28} />
        </div>
        <h2 className="text-2xl font-bold">Step Away & Rest</h2>
        <div className="text-xs text-tertiary">Hydrate, stretch, look into the distance, and let your brain integrate.</div>
      </div>

      {/* Hero Timer */}
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
              <Clock size={13} /> Target: 5 minutes
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
          onClick={handleReturnToPlan}
          disabled={isTransitioning}
          style={{ minWidth: 200 }}
        >
          <ArrowRight size={16} /> Return to Plan
        </button>
      </div>

      <div className="text-xs text-tertiary" style={{ marginTop: 'var(--sp-6)' }}>
        The break will not force you back automatically. When you are ready for the next sprint, click Return to Plan.
      </div>
    </div>
  );
}
