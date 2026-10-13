import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Star,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Edit3,
  Calendar,
  AlertCircle,
  Flame,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { calculatePhaseTiming, formatDuration } from '../../engine/studyTimer';
import StudyBlockEditModal from './StudyBlockEditModal';

export default function ChronicleStudyHistory() {
  const studySessions = useStore((s) => s.studySessions);
  const studyBlocks = useStore((s) => s.studyBlocks);
  const studyPhases = useStore((s) => s.studyPhases);

  // Filters state
  const [courseFilter, setCourseFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [blockStatusFilter, setBlockStatusFilter] = useState('all');
  const [recallFilter, setRecallFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('30d'); // '7d' | '30d' | 'all'

  // Expanded sessions state for viewing brain dump
  const [expandedBrainDumps, setExpandedBrainDumps] = useState({});

  // Active editing block
  const [editingBlock, setEditingBlock] = useState(null);

  const toggleBrainDump = (sessionId) => {
    setExpandedBrainDumps((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  // 1. Date Range Filtering for Sessions
  const filteredSessions = useMemo(() => {
    let list = Object.values(studySessions);

    if (dateRangeFilter === '7d' || dateRangeFilter === '30d') {
      const days = dateRangeFilter === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split('T')[0];
      list = list.filter((s) => s.date >= cutoffStr);
    }

    if (sessionStatusFilter !== 'all') {
      list = list.filter((s) => s.status === sessionStatusFilter);
    }

    // Sort by startedAt DESC
    return list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [studySessions, dateRangeFilter, sessionStatusFilter]);

  const validSessionIds = useMemo(() => new Set(filteredSessions.map((s) => s.id)), [filteredSessions]);

  // 2. Filter Blocks
  const filteredBlocks = useMemo(() => {
    const normCourse = courseFilter.trim().toLowerCase();
    const normTopic = topicFilter.trim().toLowerCase();

    return Object.values(studyBlocks).filter((b) => {
      if (!validSessionIds.has(b.sessionId)) return false;

      if (normCourse && !(b.course || '').toLowerCase().includes(normCourse)) {
        return false;
      }
      if (normTopic && !(b.topic || '').toLowerCase().includes(normTopic)) {
        return false;
      }
      if (blockStatusFilter !== 'all' && b.status !== blockStatusFilter) {
        return false;
      }
      if (recallFilter !== 'all' && b.recallCompleteness !== recallFilter) {
        return false;
      }
      return true;
    });
  }, [studyBlocks, validSessionIds, courseFilter, topicFilter, blockStatusFilter, recallFilter]);

  // 3. Analytics Aggregations
  const analytics = useMemo(() => {
    let configuredWorkSec = 0;
    let actualWorkSec = 0;
    let overtimeSec = 0;
    let focusTotal = 0;
    let ratedCount = 0;
    let incompleteRecallCount = 0;

    const courseCounts = {};
    const courseFocusTotals = {};
    const courseFocusCounts = {};
    const statusCounts = { completed: 0, in_progress: 0, planned: 0, interrupted: 0 };

    filteredBlocks.forEach((b) => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;

      if (b.recallCompleteness === 'missing_fields' || b.recallCompleteness === 'not_recorded') {
        incompleteRecallCount += 1;
      }

      if (b.course) {
        const c = b.course.trim();
        courseCounts[c] = (courseCounts[c] || 0) + 1;
        if (b.focusRating != null) {
          courseFocusTotals[c] = (courseFocusTotals[c] || 0) + Number(b.focusRating);
          courseFocusCounts[c] = (courseFocusCounts[c] || 0) + 1;
        }
      }

      const phases = Object.values(studyPhases).filter((p) => p.blockId === b.id);
      const workPhase = phases.find((p) => p.phaseType === 'work');
      if (workPhase) {
        const timing = calculatePhaseTiming(workPhase);
        configuredWorkSec += workPhase.targetDuration || 1500;
        actualWorkSec += timing.activeElapsedSeconds;
        overtimeSec += timing.overtimeSeconds;
      }

      if (b.focusRating != null) {
        focusTotal += Number(b.focusRating);
        ratedCount += 1;
      }
    });

    const avgFocus = ratedCount > 0 ? (focusTotal / ratedCount).toFixed(1) : '—';

    return {
      sessionsStarted: filteredSessions.length,
      sessionsCompleted: filteredSessions.filter((s) => s.status === 'completed').length,
      blocksStarted: filteredBlocks.filter((b) => b.status !== 'planned').length,
      blocksCompleted: filteredBlocks.filter((b) => b.status === 'completed').length,
      configuredWorkSec,
      actualWorkSec,
      overtimeSec,
      avgFocus,
      ratedCount,
      incompleteRecallCount,
      courseCounts,
      courseFocusTotals,
      courseFocusCounts,
      statusCounts,
    };
  }, [filteredSessions, filteredBlocks, studyPhases]);

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
      {/* Analytics Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--sp-3)' }}>
        <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs text-tertiary uppercase font-semibold">Sessions</div>
          <div className="text-xl font-bold" style={{ marginTop: 4 }}>
            {analytics.sessionsCompleted}{' '}
            <span className="text-xs text-tertiary font-normal">/ {analytics.sessionsStarted}</span>
          </div>
          <div className="text-xs text-green" style={{ marginTop: 2 }}>
            Completed / Started
          </div>
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs text-tertiary uppercase font-semibold">Blocks</div>
          <div className="text-xl font-bold text-blue" style={{ marginTop: 4 }}>
            {analytics.blocksCompleted}{' '}
            <span className="text-xs text-tertiary font-normal">/ {analytics.blocksStarted}</span>
          </div>
          <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
            Fully Completed
          </div>
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs text-tertiary uppercase font-semibold">Active Work Time</div>
          <div className="text-xl font-bold text-green" style={{ marginTop: 4 }}>
            {formatDuration(analytics.actualWorkSec)}
          </div>
          <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
            Excludes paused time
          </div>
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs text-tertiary uppercase font-semibold">Overtime</div>
          <div className="text-xl font-bold text-orange" style={{ marginTop: 4 }}>
            +{formatDuration(analytics.overtimeSec)}
          </div>
          <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
            Target: {formatDuration(analytics.configuredWorkSec)}
          </div>
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs text-tertiary uppercase font-semibold">Avg Focus</div>
          <div className="text-xl font-bold text-purple" style={{ marginTop: 4 }}>
            {analytics.avgFocus} <span className="text-xs text-tertiary font-normal">/ 5</span>
          </div>
          <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
            Across {analytics.ratedCount} rated blocks
          </div>
        </div>

        <div className="card-elevated" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs text-tertiary uppercase font-semibold">Incomplete Recall</div>
          <div className="text-xl font-bold text-orange" style={{ marginTop: 4 }}>
            {analytics.incompleteRecallCount}
          </div>
          <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
            Missing outcome or next
          </div>
        </div>
      </div>

      {/* Courses Breakdown if any */}
      {Object.keys(analytics.courseCounts).length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-4)' }}>
          <div className="text-xs font-semibold text-tertiary uppercase" style={{ marginBottom: 8 }}>
            Blocks & Focus by Course
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(analytics.courseCounts).map(([course, count]) => {
              const fCount = analytics.courseFocusCounts[course] || 0;
              const fAvg = fCount > 0 ? (analytics.courseFocusTotals[course] / fCount).toFixed(1) : null;
              return (
                <div
                  key={course}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--elevated)',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{course}</span>
                  <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 6px' }}>
                    {count} {count === 1 ? 'block' : 'blocks'}
                  </span>
                  {fAvg && (
                    <span className="badge badge-purple" style={{ fontSize: 10, padding: '2px 6px' }}>
                      ★ {fAvg}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card" style={{ padding: 'var(--sp-4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-3)' }}>
          <div>
            <label className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Date Range
            </label>
            <select
              className="input input-sm"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Filter by Course
            </label>
            <input
              type="text"
              className="input input-sm"
              placeholder="Search course…"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Filter by Topic
            </label>
            <input
              type="text"
              className="input input-sm"
              placeholder="Search topic…"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Block Status
            </label>
            <select
              className="input input-sm"
              value={blockStatusFilter}
              onChange={(e) => setBlockStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="interrupted">Interrupted</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-tertiary" style={{ display: 'block', marginBottom: 4 }}>
              Recall Completeness
            </label>
            <select
              className="input input-sm"
              value={recallFilter}
              onChange={(e) => setRecallFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="complete">Complete</option>
              <option value="missing_fields">Missing Fields</option>
              <option value="not_recorded">Not Recorded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions and Blocks List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        {filteredSessions.length === 0 ? (
          <div className="card" style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
            No study sessions matched your criteria.
          </div>
        ) : (
          filteredSessions.map((session) => {
            const sessionBlocksList = filteredBlocks
              .filter((b) => b.sessionId === session.id)
              .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

            if (sessionBlocksList.length === 0 && (courseFilter || topicFilter || blockStatusFilter !== 'all')) {
              return null; // hide session if no blocks match the block filters
            }

            const isBrainDumpOpen = Boolean(expandedBrainDumps[session.id]);
            const startTimeStr = new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTimeStr = session.endedAt
              ? new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'In progress';

            return (
              <div key={session.id} className="card" style={{ padding: 'var(--sp-5)' }}>
                {/* Session Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-base font-bold">{session.date}</span>
                      <span className={`badge ${session.status === 'completed' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 10 }}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
                      {startTimeStr} – {endTimeStr} • {sessionBlocksList.length} blocks
                    </div>
                  </div>

                  {session.brainDump && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleBrainDump(session.id)}
                      style={{ fontSize: 11 }}
                    >
                      {isBrainDumpOpen ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{isBrainDumpOpen ? 'Hide Brain Dump' : 'View Brain Dump'}</span>
                    </button>
                  )}
                </div>

                {/* Collapsible Brain Dump */}
                {isBrainDumpOpen && session.brainDump && (
                  <div
                    style={{
                      padding: 'var(--sp-3) var(--sp-4)',
                      background: 'var(--elevated)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      marginBottom: 'var(--sp-4)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div className="text-xs text-tertiary uppercase font-semibold" style={{ marginBottom: 4 }}>
                      Pre-Study Thoughts:
                    </div>
                    {session.brainDump}
                  </div>
                )}

                {/* Blocks Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
                        <th style={{ padding: '6px 10px' }}>#</th>
                        <th style={{ padding: '6px 10px' }}>Course / Topic</th>
                        <th style={{ padding: '6px 10px' }}>Planned Outcome</th>
                        <th style={{ padding: '6px 10px' }}>Actual Outcome</th>
                        <th style={{ padding: '6px 10px' }}>Focus</th>
                        <th style={{ padding: '6px 10px' }}>Next Action</th>
                        <th style={{ padding: '6px 10px' }}>Status</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionBlocksList.map((block) => (
                        <tr
                          key={block.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            verticalAlign: 'top',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>#{block.sequenceNumber}</td>
                          <td style={{ padding: '8px 10px', minWidth: 120 }}>
                            <div style={{ fontWeight: 600 }}>{block.course || '—'}</div>
                            {block.topic && <div className="text-xs text-tertiary">{block.topic}</div>}
                          </td>
                          <td style={{ padding: '8px 10px', maxWidth: 180, lineHeight: 1.4 }}>
                            {block.plannedOutcome || '—'}
                          </td>
                          <td style={{ padding: '8px 10px', maxWidth: 180, lineHeight: 1.4 }}>
                            {block.actualOutcome || (
                              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            {block.focusRating ? (
                              <span className="badge badge-purple" style={{ fontSize: 10, fontWeight: 700 }}>
                                ★ {block.focusRating}/5
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', maxWidth: 160, lineHeight: 1.4 }}>
                            {block.nextAction || (
                              <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            <span
                              className={`badge ${
                                block.status === 'completed'
                                  ? 'badge-green'
                                  : block.status === 'in_progress'
                                  ? 'badge-blue'
                                  : 'badge-orange'
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {block.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditingBlock(block)}
                              style={{ padding: '4px 8px', fontSize: 11 }}
                              title="Edit block"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Historical Edit Modal */}
      {editingBlock && (
        <StudyBlockEditModal
          block={editingBlock}
          onClose={() => setEditingBlock(null)}
        />
      )}
    </div>
  );
}
