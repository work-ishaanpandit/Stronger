import { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Brain,
  Star,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { calculatePhaseTiming, formatDuration } from '../../engine/studyTimer';

export default function SessionSummary({ sessionId, onStartNewSession, onViewInChronicle }) {
  const studySessions = useStore((s) => s.studySessions);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const studyPhases = useStore((s) => s.studyPhases);

  const [showBrainDump, setShowBrainDump] = useState(false);

  // If no sessionId passed, find the most recently ended session
  const targetSession = sessionId
    ? studySessions[sessionId]
    : Object.values(studySessions).sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      )[0];

  if (!targetSession) {
    return (
      <div className="card" style={{ maxWidth: 680, margin: '0 auto', padding: 'var(--sp-6)', textAlign: 'center' }}>
        <h3 className="text-lg font-bold">No Study Session Record Found</h3>
        <button className="btn btn-primary" onClick={onStartNewSession} style={{ marginTop: 'var(--sp-4)' }}>
          Start Study Session
        </button>
      </div>
    );
  }

  // Get blocks for this session
  const sessionBlocks = Object.values(studyBlocks)
    .filter((b) => b.sessionId === targetSession.id)
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  // Calculate session-level timing metrics from actual work phases
  let configuredWorkSeconds = 0;
  let actualWorkSeconds = 0;
  let overtimeSeconds = 0;
  let ratedCount = 0;
  let focusTotal = 0;

  sessionBlocks.forEach((block) => {
    const blockPhases = Object.values(studyPhases).filter((p) => p.blockId === block.id);
    const workPhase = blockPhases.find((p) => p.phaseType === 'work');

    if (workPhase) {
      const timing = calculatePhaseTiming(workPhase);
      configuredWorkSeconds += workPhase.targetDuration || 1500;
      actualWorkSeconds += timing.activeElapsedSeconds;
      overtimeSeconds += timing.overtimeSeconds;
    }

    if (block.focusRating != null) {
      focusTotal += Number(block.focusRating);
      ratedCount += 1;
    }
  });

  const avgFocus = ratedCount > 0 ? (focusTotal / ratedCount).toFixed(1) : '—';
  const startedBlocksCount = sessionBlocks.filter((b) => b.status !== 'planned').length;
  const completedBlocksCount = sessionBlocks.filter((b) => b.status === 'completed').length;

  const startTimeStr = new Date(targetSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = targetSession.endedAt
    ? new Date(targetSession.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'In progress';

  return (
    <div className="anim-scale" style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* Session Overview Card */}
      <div className="card" style={{ padding: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 className="text-2xl font-bold">Study Session Summary</h1>
              <span className={`badge ${targetSession.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>
                {targetSession.status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>
              Session timeframe: {startTimeStr} – {endTimeStr}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-ghost btn-sm" onClick={onViewInChronicle}>
              View in Chronicle
            </button>
            <button className="btn btn-primary btn-sm" onClick={onStartNewSession}>
              Start New Session
            </button>
          </div>
        </div>

        {/* 4 Metrics Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
          <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
            <div className="text-xs text-tertiary uppercase font-semibold">Blocks</div>
            <div className="text-xl font-bold" style={{ marginTop: 4 }}>
              {completedBlocksCount} <span className="text-xs text-tertiary font-normal">/ {startedBlocksCount} started</span>
            </div>
          </div>

          <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
            <div className="text-xs text-tertiary uppercase font-semibold">Active Work Time</div>
            <div className="text-xl font-bold text-blue" style={{ marginTop: 4 }}>
              {formatDuration(actualWorkSeconds)}
            </div>
            <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
              Configured: {formatDuration(configuredWorkSeconds)}
            </div>
          </div>

          <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
            <div className="text-xs text-tertiary uppercase font-semibold">Overtime</div>
            <div className="text-xl font-bold text-orange" style={{ marginTop: 4 }}>
              +{formatDuration(overtimeSeconds)}
            </div>
            <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
              Beyond target
            </div>
          </div>

          <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
            <div className="text-xs text-tertiary uppercase font-semibold">Avg Focus</div>
            <div className="text-xl font-bold text-purple" style={{ marginTop: 4 }}>
              {avgFocus} <span className="text-xs text-tertiary font-normal">/ 5</span>
            </div>
            <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
              {ratedCount} blocks rated
            </div>
          </div>
        </div>

        {/* Brain Dump Drawer / Accordion */}
        {targetSession.brainDump && (
          <div style={{ marginTop: 'var(--sp-5)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowBrainDump((v) => !v)}
              style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {showBrainDump ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showBrainDump ? 'Hide Brain Dump' : 'View Pre-Study Brain Dump'}</span>
            </button>

            {showBrainDump && (
              <div
                className="anim-fade"
                style={{
                  marginTop: 'var(--sp-3)',
                  padding: 'var(--sp-4)',
                  background: 'var(--elevated)',
                  borderRadius: 'var(--radius-md)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {targetSession.brainDump}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Blocks Table Card */}
      <div className="card" style={{ padding: 'var(--sp-6)' }}>
        <h2 className="text-lg font-bold" style={{ marginBottom: 'var(--sp-4)' }}>
          Session Blocks Breakdown
        </h2>

        {sessionBlocks.length === 0 ? (
          <div className="text-sm text-tertiary" style={{ textAlign: 'center', padding: 'var(--sp-4)' }}>
            No work blocks were logged in this session.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
                  <th style={{ padding: '8px 12px' }}>Block</th>
                  <th style={{ padding: '8px 12px' }}>Course / Topic</th>
                  <th style={{ padding: '8px 12px' }}>Planned Outcome</th>
                  <th style={{ padding: '8px 12px' }}>Actual Outcome</th>
                  <th style={{ padding: '8px 12px' }}>Focus</th>
                  <th style={{ padding: '8px 12px' }}>Next Action</th>
                  <th style={{ padding: '8px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessionBlocks.map((block) => {
                  const statusBadge =
                    block.status === 'completed'
                      ? 'badge-green'
                      : block.status === 'in_progress'
                      ? 'badge-blue'
                      : 'badge-orange';

                  return (
                    <tr
                      key={block.id}
                      style={{ borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'top' }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600 }}>
                        #{block.sequenceNumber}
                      </td>
                      <td style={{ padding: '12px', minWidth: 140 }}>
                        <div style={{ fontWeight: 500 }}>{block.course || '—'}</div>
                        {block.topic && (
                          <div className="text-xs text-tertiary">{block.topic}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', maxWidth: 220, lineHeight: 1.4 }}>
                        {block.plannedOutcome || '—'}
                      </td>
                      <td style={{ padding: '12px', maxWidth: 220, lineHeight: 1.4 }}>
                        {block.actualOutcome ? (
                          block.actualOutcome
                        ) : (
                          <span className="text-xs text-tertiary font-italic">Missing</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        {block.focusRating ? (
                          <span className="badge badge-purple" style={{ fontWeight: 700 }}>
                            {block.focusRating} / 5
                          </span>
                        ) : (
                          <span className="text-xs text-tertiary">—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', maxWidth: 200, lineHeight: 1.4 }}>
                        {block.nextAction ? (
                          block.nextAction
                        ) : (
                          <span className="text-xs text-tertiary font-italic">—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                        <span className={`badge ${statusBadge}`} style={{ fontSize: 11 }}>
                          {block.status}
                        </span>
                        {block.recallCompleteness === 'missing_fields' && (
                          <div className="text-xs text-orange" style={{ marginTop: 2 }}>
                            Partial recall
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
