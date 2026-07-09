import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Zap, Rocket, Skull, Leaf, RefreshCw, X, Plus, Target, CheckCircle, Activity, XCircle, FastForward, Calendar } from 'lucide-react';
import useStore from '../store/useStore';
import TaskCreationSheet from '../components/TaskCreationSheet';
import DisciplineCreationSheet from '../components/DisciplineCreationSheet';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const TYPE_COLORS = { normal: 'var(--blue)', power: 'var(--purple)', kickass: 'var(--red)', uncritical: 'var(--text-tertiary)' };

export default function DawnAlignment() {
  const dailyLogs = useStore((s) => s.dailyLogs);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);
  const updateDailyLog = useStore((s) => s.updateDailyLog);
  const getTasksForDate = useStore((s) => s.getTasksForDate);
  const deleteTask = useStore((s) => s.deleteTask);
  const initDay = useStore((s) => s.initDay);
  const coreDisciplines = useStore((s) => s.coreDisciplines);
  const deleteCoreDiscipline = useStore((s) => s.deleteCoreDiscipline);
  const updateTask = useStore((s) => s.updateTask);
  const earnings = useStore((s) => s.earnings);

  const [showSheet, setShowSheet] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showDisciplineSheet, setShowDisciplineSheet] = useState(false);

  useEffect(() => { initDay(TODAY); }, [coreDisciplines]);

  const log = dailyLogs[TODAY] ?? {};
  const tasks = getTasksForDate(TODAY);
  const todayEarnings = earnings[TODAY];

  const highlight = log.highlight ?? '';
  const charCount = highlight.length;

  const handleHighlightChange = (e) => {
    updateDailyLog(TODAY, { highlight: e.target.value });
  };

  return (
    <main className="page anim-fade">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="page-title">Dawn Alignment</h1>
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => fetchFromSupabase()}
              title="Force Refresh Data"
              style={{ padding: '6px' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <span className="badge badge-blue" style={{ fontSize: 12 }}>
            {format(new Date(), 'EEE, MMM d')}
          </span>
        </div>
        <div className="page-subtitle">Plan today's targets and commit to your core disciplines</div>
      </div>

      <div className="spatial-grid">
        {/* LEFT COLUMN: Highlight & Core Disciplines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Today's Highlight */}
          <div>
            <div className="section-label">Today's Highlight</div>
            <div className="highlight-field">
              <input
                id="todays-highlight"
                placeholder="What's the one thing that defines today?"
                value={highlight}
                onChange={handleHighlightChange}
                maxLength={120}
                autoComplete="off"
              />
              <div className={`char-count ${charCount > 100 ? 'warn' : ''} ${charCount >= 120 ? 'over' : ''}`}>
                {charCount}/120
              </div>
            </div>
          </div>

          {/* Core Disciplines */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Core Disciplines</div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDisciplineSheet(true)}
              >
                <Plus size={14} /> Add
              </button>
            </div>

            {coreDisciplines.length === 0 ? (
              <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-3)' }}>
                  <Target size={32} />
                </div>
                <div className="text-sm">No recurring disciplines yet.</div>
                <div className="text-xs" style={{ marginTop: 4 }}>Add habits you want to do every day.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {coreDisciplines.map((d) => {
                  const tType = d.type ?? 'normal';
                  const typeColor = TYPE_COLORS[tType] ?? 'var(--blue)';
                  const Icon = tType === 'normal' ? Zap :
                               tType === 'power' ? Rocket :
                               tType === 'kickass' ? Skull : Leaf;
                  
                  return (
                    <div key={d.id} className={`task-item type-${tType}`}>
                      <div className="task-check" style={{ borderColor: typeColor, cursor: 'default' }}>
                        <RefreshCw size={12} style={{ color: typeColor }} />
                      </div>
                      <div className="task-info">
                        <div className="task-name">{d.name}</div>
                        <div className="task-meta">
                          <span>Daily</span>
                          {tType === 'normal' && <span>Weight: {d.weight}</span>}
                          {tType === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: ₹{d.damage}</span>}
                          {tType === 'power' && <span style={{ color: 'var(--purple)' }}>Multiplier</span>}
                        </div>
                      </div>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'transparent', color: 'var(--text-tertiary)', padding: '4px 8px' }}
                      onClick={(e) => { e.stopPropagation(); deleteCoreDiscipline(d.id); }}
                      aria-label={`Delete ${d.name}`}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Earnings, Dynamic Targets, Habit Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Earnings Breakdown — always show */}
          <EarningsBreakdown earnings={todayEarnings} />

          {/* Dynamic Targets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Dynamic Targets</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setEditTask(null); setShowSheet(true); }}
              >
                <Plus size={14} /> Add Task
              </button>
            </div>

            {tasks.filter((t) => !t.isCoreDiscipline).length === 0 ? (
              <div className="card" style={{ padding: 'var(--sp-5)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--sp-3)' }}>
                  <Zap size={32} />
                </div>
                <div className="text-sm">No tasks planned yet.</div>
                <div className="text-xs" style={{ marginTop: 4 }}>Add today's specific goals.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {tasks.filter((t) => !t.isCoreDiscipline).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={() => { setEditTask(task); setShowSheet(true); }}
                    onDelete={() => deleteTask(TODAY, task.id)}
                    onToggle={() => {
                      updateTask(TODAY, task.id, { status: task.status === 'finished' ? 'missed' : 'finished', completionPercentage: task.status === 'finished' ? 0 : 1 });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Core discipline tasks for today */}
          {tasks.filter((t) => t.isCoreDiscipline).length > 0 && (
            <div>
              <div className="section-label">Today's Habit Tasks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {tasks.filter((t) => t.isCoreDiscipline).map((task) => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    onEdit={() => { setEditTask(task); setShowSheet(true); }} 
                    onToggle={() => {
                      updateTask(TODAY, task.id, { status: task.status === 'finished' ? 'missed' : 'finished', completionPercentage: task.status === 'finished' ? 0 : 1 });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Sheet */}
      {showSheet && (
        <TaskCreationSheet
          date={TODAY}
          task={editTask}
          onClose={() => { setShowSheet(false); setEditTask(null); }}
        />
      )}

      {/* Discipline Add Sheet */}
      {showDisciplineSheet && (
        <DisciplineCreationSheet onClose={() => setShowDisciplineSheet(false)} />
      )}
    </main>
  );
}

function TaskRow({ task, onEdit, onDelete, onToggle }) {
  const typeColor = TYPE_COLORS[task.type] ?? 'var(--blue)';
  
  const Icon = task.type === 'normal' ? Zap :
               task.type === 'power' ? Rocket :
               task.type === 'kickass' ? Skull : Leaf;

  return (
    <div className={`task-item type-${task.type}`} onClick={onEdit} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
      <div 
        className="task-check" 
        style={{ 
          borderColor: task.status === 'finished' ? 'var(--green)' : typeColor, 
          cursor: onToggle ? 'pointer' : 'default',
          background: task.status === 'finished' ? 'var(--green)22' : 'transparent'
        }}
        onClick={(e) => {
          if (onToggle) {
            e.stopPropagation();
            onToggle();
          }
        }}
      >
        {task.status === 'finished' ? (
          <CheckCircle size={14} style={{ color: 'var(--green)' }} />
        ) : (
          <Icon size={14} style={{ color: typeColor }} />
        )}
      </div>
      <div className="task-info">
        <div className="task-name">{task.name}</div>
        <div className="task-meta">
          {task.tag && <span>#{task.tag}</span>}
          {task.type === 'normal' && <span>Weight: {task.weight}</span>}
          {task.type === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: ₹{task.damage}</span>}
          {task.type === 'power' && <span style={{ color: 'var(--purple)' }}>Multiplier</span>}
          {task.rolloverBadge === 'yellow' && <span className="badge badge-yellow" style={{ fontSize: 10, padding: '1px 6px' }}>ROLLOVER</span>}
          {task.rolloverBadge === 'red' && <span className="badge badge-red" style={{ fontSize: 10, padding: '1px 6px' }}>DELAYED</span>}
          {task.calendarSync && <span style={{ color: 'var(--blue)' }}>{task.timeBlockStart}–{task.timeBlockEnd}</span>}
        </div>
      </div>
      {onDelete && (
        <button
          className="btn btn-sm"
          style={{ background: 'transparent', color: 'var(--text-quaternary)', padding: '4px 8px' }}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={`Delete ${task.name}`}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function EarningsBreakdown({ earnings }) {
  if (!earnings || (earnings.E_base === 0 && earnings.D_tot === 0 && earnings.M_pow === 1)) {
    return (
      <div>
        <div className="section-label">Projected Earnings</div>
        <div className="earnings-card" style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-tertiary)', lineHeight: 1 }}>₹0</div>
          <div className="text-sm text-tertiary" style={{ marginTop: 'var(--sp-2)' }}>Add tasks to see projected earnings</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-label">Projected Earnings</div>
      <div className="earnings-card">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
          <span className={`earnings-amount ${earnings.R_calc === 0 ? 'negative' : earnings.R_calc < 500 ? 'partial' : ''}`}>
            ₹{earnings.R_calc.toFixed(2)}
          </span>
          <span className="text-sm text-tertiary">today</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-3)' }}>
          <div className="stat-pill">
            <span className="stat-pill-value text-blue">₹{earnings.E_base.toFixed(0)}</span>
            <span className="stat-pill-label">Base</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value text-red">-₹{earnings.D_tot.toFixed(0)}</span>
            <span className="stat-pill-label">Damage</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-value text-orange">{earnings.M_pow.toFixed(1)}×</span>
            <span className="stat-pill-label">Multiplier</span>
          </div>
        </div>
      </div>
    </div>
  );
}
