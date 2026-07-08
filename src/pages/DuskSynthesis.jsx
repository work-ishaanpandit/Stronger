import { useState } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Lock, Inbox, CheckCircle, Activity, XCircle, FastForward, Calendar, Zap, Rocket, Skull, Leaf } from 'lucide-react';
import useStore from '../store/useStore';
import TaskAuditModal from '../components/TaskAuditModal';
import ReflectionPanel from '../components/ReflectionPanel';
import { isDateEditable } from '../engine/rollover';

const TODAY = format(new Date(), 'yyyy-MM-dd');

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

export default function DuskSynthesis() {
  const duskDate = useStore((s) => s.duskDate);
  const setDuskDate = useStore((s) => s.setDuskDate);
  const getTasksForDate = useStore((s) => s.getTasksForDate);
  const dailyLogs = useStore((s) => s.dailyLogs);
  const earnings = useStore((s) => s.earnings);
  const processRollovers = useStore((s) => s.processRollovers);

  const [auditTask, setAuditTask] = useState(null);

  const tasks = getTasksForDate(duskDate);
  const log = dailyLogs[duskDate] ?? {};
  const todayEarnings = earnings[duskDate];
  const locked = !isDateEditable(duskDate);

  const goBack = () => {
    const prev = format(subDays(parseISO(duskDate), 1), 'yyyy-MM-dd');
    setDuskDate(prev);
  };

  const goForward = () => {
    const next = format(addDays(parseISO(duskDate), 1), 'yyyy-MM-dd');
    if (next <= TODAY) setDuskDate(next);
  };

  const handleSubmitDay = () => {
    processRollovers(duskDate);
  };

  const dateLabel = duskDate === TODAY
    ? `Today, ${format(parseISO(duskDate), 'MMMM d')}`
    : format(parseISO(duskDate), 'EEEE, MMMM d');

  return (
    <main className="page anim-fade">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title">Dusk Synthesis</h1>
          <span className={`badge ${locked ? 'badge-gray' : 'badge-blue'}`} style={{ fontSize: 12 }}>
            {locked ? 'Read-only' : 'Editable'}
          </span>
        </div>
        <div className="page-subtitle">Audit tasks, log reflections, and close the day</div>
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

          {/* Highlight Preview */}
          {log.highlight && (
            <div className="card" style={{ padding: 'var(--sp-4)', borderLeft: '3px solid var(--blue)' }}>
              <div className="text-xs text-tertiary" style={{ marginBottom: 4 }}>Today's Highlight</div>
              <div className="text-base font-medium">{log.highlight}</div>
            </div>
          )}

          {/* Tasks Audit */}
          <div>
            <div className="section-label">Task Audit</div>

            {tasks.length === 0 ? (
              <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-3)' }}>
                  <Inbox size={32} />
                </div>
                <div className="text-sm">No tasks were planned for this day.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {tasks.map((task) => {
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
          {!locked && duskDate === TODAY && (
            <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', marginTop: 'auto' }}>
              <div className="text-sm text-tertiary" style={{ marginBottom: 'var(--sp-3)' }}>
                Finalise today's log and carry tasks forward
              </div>
              <button className="btn btn-primary" onClick={handleSubmitDay} style={{ width: '100%' }}>
                <Zap size={16} /> Submit Day & Process Rollovers
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
