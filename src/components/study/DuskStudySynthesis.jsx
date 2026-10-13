import { useState } from 'react';
import { BookOpen, CheckCircle, Clock, Star, AlertCircle, ArrowRight, Bookmark } from 'lucide-react';
import useStore from '../../store/useStore';
import { calculatePhaseTiming, formatDuration } from '../../engine/studyTimer';

export default function DuskStudySynthesis({ date }) {
  const studySessions = useStore((s) => s.studySessions);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const studyPhases = useStore((s) => s.studyPhases);
  const setActiveTab = useStore((s) => s.setActiveTab);

  // Filter sessions matching this date
  const daySessions = Object.values(studySessions).filter((s) => s.date === date);

  if (daySessions.length === 0) {
    return (
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <BookOpen size={20} className="text-blue" />
          <h3 className="text-base font-semibold">Study Mode Synthesis</h3>
        </div>
        <div className="text-xs text-tertiary">
          No Study Mode sessions were recorded on this day.
        </div>
      </div>
    );
  }

  const sessionIds = new Set(daySessions.map((s) => s.id));
  const dayBlocks = Object.values(studyBlocks)
    .filter((b) => sessionIds.has(b.sessionId))
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  let configuredWorkSec = 0;
  let activeWorkSec = 0;
  let overtimeSec = 0;
  let focusTotal = 0;
  let ratedCount = 0;

  dayBlocks.forEach((b) => {
    const phases = Object.values(studyPhases).filter((p) => p.blockId === b.id);
    const workPhase = phases.find((p) => p.phaseType === 'work');
    if (workPhase) {
      const timing = calculatePhaseTiming(workPhase);
      configuredWorkSec += workPhase.targetDuration || 1500;
      activeWorkSec += timing.activeElapsedSeconds;
      overtimeSec += timing.overtimeSeconds;
    }
    if (b.focusRating != null) {
      focusTotal += Number(b.focusRating);
      ratedCount += 1;
    }
  });

  const completedBlocks = dayBlocks.filter((b) => b.status === 'completed');
  const incompleteBlocks = dayBlocks.filter((b) => b.status !== 'completed' && b.status !== 'planned');
  const avgFocus = ratedCount > 0 ? (focusTotal / ratedCount).toFixed(1) : null;

  // Extract distinct courses & topics
  const courses = [...new Set(dayBlocks.map((b) => b.course).filter(Boolean))];
  const topics = [...new Set(dayBlocks.map((b) => b.topic).filter(Boolean))];

  return (
    <div className="card" style={{ padding: 'var(--sp-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <BookOpen size={20} className="text-blue" />
          <h3 className="text-base font-semibold">Study Mode Synthesis</h3>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setActiveTab('chronicle')}
          style={{ fontSize: 11, padding: '4px 8px' }}
        >
          View in Chronicle
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <div className="card-elevated" style={{ padding: 'var(--sp-3)', textAlign: 'center' }}>
          <div className="text-xs text-tertiary">Completed</div>
          <div className="text-lg font-bold text-green" style={{ marginTop: 2 }}>
            {completedBlocks.length}
            {incompleteBlocks.length > 0 && (
              <span className="text-xs text-orange" style={{ fontWeight: 400, marginLeft: 4 }}>
                ({incompleteBlocks.length} inc)
              </span>
            )}
          </div>
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-3)', textAlign: 'center' }}>
          <div className="text-xs text-tertiary">Active Work</div>
          <div className="text-lg font-bold text-blue" style={{ marginTop: 2 }}>
            {formatDuration(activeWorkSec)}
          </div>
          {overtimeSec > 0 && (
            <div className="text-xs text-orange">+{formatDuration(overtimeSec)} OT</div>
          )}
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-3)', textAlign: 'center' }}>
          <div className="text-xs text-tertiary">Avg Focus</div>
          <div className="text-lg font-bold text-purple" style={{ marginTop: 2 }}>
            {avgFocus ? `${avgFocus} / 5` : '—'}
          </div>
        </div>
      </div>

      {/* Topics / Courses Tag Cloud */}
      {(courses.length > 0 || topics.length > 0) && (
        <div style={{ marginBottom: 'var(--sp-4)', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {courses.map((c) => (
            <span key={c} className="badge badge-blue" style={{ fontSize: 11 }}>
              {c}
            </span>
          ))}
          {topics.map((t) => (
            <span key={t} className="badge badge-gray" style={{ fontSize: 11 }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Main Outcomes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <div className="text-xs font-semibold text-tertiary uppercase">Outcomes & Next Actions</div>
        {dayBlocks.map((b) => (
          <div
            key={b.id}
            style={{
              padding: '8px 10px',
              background: 'var(--elevated)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Block #{b.sequenceNumber} {b.course ? `— ${b.course}` : ''}
              </span>
              <span className={`badge ${b.status === 'completed' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 10 }}>
                {b.status}
              </span>
            </div>

            {b.actualOutcome ? (
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                <strong>Learned:</strong> {b.actualOutcome}
              </div>
            ) : (
              <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Outcome not recorded
              </div>
            )}

            {b.nextAction && (
              <div style={{ color: 'var(--blue)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ArrowRight size={11} /> <strong>Next:</strong> {b.nextAction}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
