import { useState, useEffect } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock, Inbox, CheckCircle, Activity, XCircle, FastForward, Calendar, Zap, Rocket, Skull, Leaf, RefreshCw, ArrowUpDown, Star } from 'lucide-react';
import useStore from '../store/useStore';
import TaskAuditModal from '../components/TaskAuditModal';
import ReflectionPanel from '../components/ReflectionPanel';
import { isDateEditable } from '../engine/rollover';

const TODAY = format(new Date(), 'yyyy-MM-dd');
const YESTERDAY = format(subDays(new Date(TODAY + 'T00:00:00'), 1), 'yyyy-MM-dd');

const STATUS_ICONS = {
  finished: { icon: CheckCircle, color: 'var(--green)', label: 'Done' },
  partly_done: { icon: Activity, color: 'var(--orange)', label: 'Partial' },
  missed: { icon: XCircle, color: 'var(--red)', label: 'Missed' },
  postponed_tomorrow: { icon: FastForward, color: 'var(--blue)', label: 'Tomorrow' },
  postponed_later: { icon: Calendar, color: 'var(--blue)', label: 'Later' },
};

const TYPE_ICONS = {
  normal: Zap,
  power: Rocket,
  kickass: Skull,
  uncritical: Leaf,
};

// F2: Sort order definitions
const SORT_MODES = [
  { key: 'default',  label: 'Default',  order: ['normal', 'power', 'kickass', 'uncritical'] },
  { key: 'impact',   label: 'Impact',   order: ['kickass', 'power', 'normal', 'uncritical'] },
  { key: 'time',     label: 'Oldest → Newest', order: null },
];

function sortTasks(tasks, mode) {
  if (mode === 'time') {
    return [...tasks].sort((a, b) => {
      const aDate = a.originalDate || a.logDate || '';
      const bDate = b.originalDate || b.logDate || '';
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
    });
  }
  const order = SORT_MODES.find(s => s.key === mode)?.order ?? SORT_MODES[0].order;
  return [...tasks].sort((a, b) => {
    const ai = order.indexOf(a.type ?? 'normal');
    const bi = order.indexOf(b.type ?? 'normal');
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export default function DuskSynthesis() {
  const duskDate = useStore((s) => s.duskDate);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);
  const setDuskDate = useStore((s) => s.setDuskDate);
  const getTasksForDate = useStore((s) => s.getTasksForDate);
  const dailyLogs = useStore((s) => s.dailyLogs);
  const earnings = useStore((s) => s.earnings);
  const processRollovers = useStore((s) => s.processRollovers);

  const initDay = useStore((s) => s.initDay);

  const [auditTask, setAuditTask] = useState(null);
  const [sortModeIdx, setSortModeIdx] = useState(0); // F2: sort mode index
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // When navigating to a future date, trigger initDay so postponed tasks appear
  useEffect(() => { initDay(duskDate); }, [duskDate]);

  const tasks = getTasksForDate(duskDate);
  const log = dailyLogs[duskDate] ?? {};
  const todayEarnings = earnings[duskDate];
  const locked = !isDateEditable(duskDate);
  const sortMode = SORT_MODES[sortModeIdx]; // F2
  const sortedTasks = sortTasks(tasks, sortMode.key); // F2

  const goBack = () => {
    const prev = format(subDays(parseISO(duskDate), 1), 'yyyy-MM-dd');
    setDuskDate(prev);
  };

  const goForward = () => {
    const next = format(addDays(parseISO(duskDate), 1), 'yyyy-MM-dd');
    if (next <= TODAY) setDuskDate(next);
  };

  const handleSubmitDay = () => {
    if (submitting || success) return;
    setSubmitting(true);
    // Add visual delay for button animation
    setTimeout(() => {
      processRollovers(duskDate);
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }, 600);
  };

  const dateLabel = duskDate === TODAY
    ? `Today, ${format(parseISO(duskDate), 'MMMM d')}`
    : format(parseISO(duskDate), 'EEEE, MMMM d');

  return (
    <main className="page anim-fade">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Dusk Synthesis</h1>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => fetchFromSupabase()}
              title="Force Refresh Data"
              style={{ padding: '6px' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <span className={`badge ${locked ? 'badge-gray' : 'badge-blue'}`} style={{ fontSize: 12 }}>
            {locked ? 'Read-only' : 'Editable'}
          </span>
        </div>
        <div className="page-subtitle">Audit tasks, log reflections, and close the day</div>

        {/* F3: Today's Highlight — read-only chip in header */}
        {log.highlight && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginTop: '12px',
            padding: '10px 14px',
            background: 'var(--elevated)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--blue)',
            borderRadius: 'var(--radius-md)',
          }}>
            <Star size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
              {log.highlight}
            </span>
          </div>
        )}
      </div>

      <div className="spatial-grid">
        {/* LEFT COLUMN: Navigation & Task Audit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Date Slider */}
          <div className="card" style={{ padding: 'var(--sp-2) var(--sp-4)' }}>
            <div className="date-slider">
              <button className="date-nav-btn" onClick={goBack} aria-label="Previous day">
                <ChevronLeft size={20} />
              </button>
              <span className="date-slider-label">{dateLabel}</span>
              <button
                className="date-nav-btn"
                onClick={goForward}
                disabled={duskDate >= TODAY}
                aria-label="Next day"
                style={{ opacity: duskDate >= TODAY ? 0.3 : 1 }}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Locked Banner */}
          {locked && (
            <div className="locked-banner">
              <Lock size={16} /> This log is read-only — older than T-1 (yesterday)
            </div>
          )}

          {/* F3: Highlight Preview card REMOVED — now shown in page header */}

          {/* Tasks Audit */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Task Audit</div>
              {/* F2: Sort mode cycle button */}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSortModeIdx((i) => (i + 1) % SORT_MODES.length)}
                title={`Sort: ${sortMode.label}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ArrowUpDown size={13} />
                <span style={{ fontSize: 11 }}>{sortMode.label}</span>
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-3)' }}>
                  <Inbox size={32} />
                </div>
                <div className="text-sm">No tasks were planned for this day.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {sortedTasks.map((task) => {
                  const s = STATUS_ICONS[task.status] ?? STATUS_ICONS.missed;
                  const StatusIcon = s.icon;
                  const TypeIcon = TYPE_ICONS[task.type] ?? Zap;

                  return (
                    <div
                      key={task.id}
                      className={`task-item type-${task.type} ${locked ? 'locked' : ''}`}
                      onClick={() => !locked && setAuditTask(task)}
                      role={locked ? undefined : 'button'}
                      tabIndex={locked ? -1 : 0}
                      onKeyDown={(e) => !locked && e.key === 'Enter' && setAuditTask(task)}
                    >
                      <div className="task-check" style={{ borderColor: s.color, background: `${s.color}22` }}>
                        <StatusIcon size={14} color={s.color} />
                      </div>
                      <div className="task-info">
                        <div className="task-name">{task.name}</div>
                        <div className="task-meta">
                          {task.tag && <span>#{task.tag}</span>}
                          {task.type === 'normal' && <span>Weight: {task.weight}</span>}
                          {task.type === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: ₹{task.damage}</span>}
                          {task.type === 'power' && <span style={{ color: 'var(--purple)' }}><Rocket size={12} style={{display:'inline', verticalAlign:'middle', marginRight:2}}/> Multiplier</span>}
                          {task.status === 'partly_done' && (
                            <span style={{ color: 'var(--orange)' }}>{Math.round(task.completionPercentage * 100)}%</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: s.color, fontWeight: 600, flexShrink: 0 }}>
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Earnings, Reflection, Submit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Earnings Summary */}
          {todayEarnings && (
            <div>
              <div className="section-label">Remuneration Output</div>
              <div className="earnings-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                  <div>
                    <div className={`earnings-amount ${todayEarnings.R_calc === 0 ? 'negative' : todayEarnings.R_calc < 500 ? 'partial' : ''}`}>
                      ₹{todayEarnings.R_calc.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.8 }}>
                    <div>Base ₹{todayEarnings.E_base.toFixed(0)}</div>
                    <div>Damage -₹{todayEarnings.D_tot.toFixed(0)}</div>
                    {todayEarnings.debtCarryover > 0 && (
                      <div style={{ color: 'var(--red)' }}>Debt Carryover -₹{todayEarnings.debtCarryover.toFixed(0)}</div>
                    )}
                    <div>Power {todayEarnings.M_pow.toFixed(2)}×</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="progress-bar-wrap">
                  <div
                    className={`progress-bar-fill ${todayEarnings.completionRatio >= 0.8 ? 'green' : todayEarnings.completionRatio >= 0.5 ? 'orange' : 'red'}`}
                    style={{ width: `${Math.min(100, todayEarnings.completionRatio * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-tertiary" style={{ marginTop: 6, textAlign: 'right' }}>
                  {Math.round(todayEarnings.completionRatio * 100)}% completion
                </div>
              </div>
            </div>
          )}

          {/* Reflection */}
          <ReflectionPanel date={duskDate} locked={locked} />

          {/* Submit Day (process rollovers) */}
          {!locked && (
            <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', marginTop: 'auto' }}>
              <div className="text-sm text-tertiary" style={{ marginBottom: 'var(--sp-3)' }}>
                Finalise {duskDate === TODAY ? "today's" : "this day's"} log and carry tasks forward
              </div>
              <button 
                className={`btn ${success ? 'btn-success' : 'btn-primary'}`} 
                onClick={handleSubmitDay} 
                style={{ width: '100%', transition: 'all 0.3s ease' }}
                disabled={submitting}
              >
                {submitting ? (
                  <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                ) : success ? (
                  <><CheckCircle size={16} /> Day Submitted!</>
                ) : (
                  <><Zap size={16} /> Submit Day & Process Rollovers</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audit Modal */}
      {auditTask && (
        <TaskAuditModal
          task={auditTask}
          date={duskDate}
          locked={locked}
          onClose={() => setAuditTask(null)}
        />
      )}
    </main>
  );
}
