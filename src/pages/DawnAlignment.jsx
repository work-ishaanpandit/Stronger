import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Zap, Rocket, Skull, Leaf, RefreshCw, X, Plus, Target, CheckCircle, Activity, XCircle, FastForward, Calendar, Layers, AlertTriangle, Clock } from 'lucide-react';
import useStore from '../store/useStore';
import TaskCreationSheet from '../components/TaskCreationSheet';
import DisciplineCreationSheet from '../components/DisciplineCreationSheet';
import { isTaskOverdue, isTaskDueSoon, getEisenhowerQuadrant } from '../utils/eisenhower';
import { getCurrencySymbol } from '../utils/currency';

const TODAY = format(new Date(), 'yyyy-MM-dd');

const TYPE_COLORS = { normal: 'var(--blue)', power: 'var(--purple)', kickass: 'var(--red)', uncritical: 'var(--text-tertiary)' };

export default function DawnAlignment() {
  const dailyLogs = useStore((s) => s.dailyLogs);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);
  const updateDailyLog = useStore((s) => s.updateDailyLog);
  const getTasksForDate = useStore((s) => s.getTasksForDate);
  const getTaskBasket = useStore((s) => s.getTaskBasket);
  const assignTaskToToday = useStore((s) => s.assignTaskToToday);
  const deleteTask = useStore((s) => s.deleteTask);
  const initDay = useStore((s) => s.initDay);
  const coreDisciplines = useStore((s) => s.coreDisciplines);
  const deleteCoreDiscipline = useStore((s) => s.deleteCoreDiscipline);
  const updateTask = useStore((s) => s.updateTask);
  const earnings = useStore((s) => s.earnings);
  const settings = useStore((s) => s.settings);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const [showSheet, setShowSheet] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showDisciplineSheet, setShowDisciplineSheet] = useState(false);

  useEffect(() => { initDay(TODAY); }, [coreDisciplines]);

  const log = dailyLogs[TODAY] ?? {};
  const tasks = getTasksForDate(TODAY);
  const todayEarnings = earnings[TODAY];
  const currencySymbol = getCurrencySymbol(todayEarnings?.currency || settings?.currency);

  const highlight = log.highlight ?? '';
  const charCount = highlight.length;

  const handleHighlightChange = (e) => {
    updateDailyLog(TODAY, { highlight: e.target.value });
  };

  // Task Basket review items suitable for morning alignment
  const allBasketTasks = getTaskBasket();
  const basketSuggestions = useMemo(() => {
    const uncommitted = allBasketTasks.filter((t) => t.logDate !== TODAY && t.plannedDate !== TODAY);
    
    const overdue = uncommitted.filter((t) => isTaskOverdue(t));
    const impUrg = uncommitted.filter(
      (t) => (t.importance || 'Medium').toLowerCase() === 'high' && (t.urgency || 'Medium').toLowerCase() === 'high' && !overdue.some((o) => o.id === t.id)
    );
    const dueSoon = uncommitted.filter(
      (t) => isTaskDueSoon(t, 7) && !overdue.some((o) => o.id === t.id) && !impUrg.some((i) => i.id === t.id)
    );

    return { overdue, impUrg, dueSoon, totalAvailable: uncommitted.length };
  }, [allBasketTasks]);

  return (
    <main className="page anim-fade">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <h1 className="page-title">Dawn Alignment</h1>
            <button
              className="btn btn-ghost btn-sm btn-icon"
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
        {/* LEFT COLUMN: Highlight, Basket Review, Core Disciplines, Dynamic Targets */}
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

          {/* 🗂 Task Basket Morning Review */}
          {basketSuggestions.totalAvailable > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(191,90,242,0.06) 0%, rgba(10,132,255,0.04) 100%)',
              border: '1px solid rgba(191,90,242,0.2)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--sp-4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={18} className="text-purple" />
                  <span className="font-semibold text-sm">Task Basket Morning Review</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveTab('basket')}
                  style={{ fontSize: 11, padding: '2px 8px' }}
                >
                  Open Basket →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {/* Overdue Section */}
                {basketSuggestions.overdue.map((task) => (
                  <BasketReviewRow
                    key={task.id}
                    task={task}
                    badge="⚠️ OVERDUE"
                    badgeColor="var(--red)"
                    onAdd={() => assignTaskToToday(task.id, TODAY)}
                    currencySymbol={currencySymbol}
                  />
                ))}

                {/* Important + Urgent Section */}
                {basketSuggestions.impUrg.map((task) => (
                  <BasketReviewRow
                    key={task.id}
                    task={task}
                    badge="🔴 DO NOW"
                    badgeColor="var(--red)"
                    onAdd={() => assignTaskToToday(task.id, TODAY)}
                    currencySymbol={currencySymbol}
                  />
                ))}

                {/* Due Soon Section */}
                {basketSuggestions.dueSoon.map((task) => (
                  <BasketReviewRow
                    key={task.id}
                    task={task}
                    badge="📅 DUE SOON"
                    badgeColor="var(--orange)"
                    onAdd={() => assignTaskToToday(task.id, TODAY)}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            </div>
          )}

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
                          {tType === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: {currencySymbol}{d.damage}</span>}
                          {tType === 'power' && <span style={{ color: 'var(--purple)' }}>Multiplier</span>}
                        </div>
                      </div>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'transparent', color: 'var(--text-quaternary)', padding: '4px 8px' }}
                        onClick={() => deleteCoreDiscipline(d.id)}
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

          {/* Today's Scope (Dynamic Targets) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Dynamic Targets ({tasks.length})</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setEditTask(null); setShowSheet(true); }}
              >
                <Plus size={14} /> Add Target
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="card text-center" style={{ padding: 'var(--sp-6)' }}>
                <div className="text-sm text-tertiary">No tasks set for today yet.</div>
                <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>
                  Add a new target or select tasks from your Task Basket above.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onEdit={() => { setEditTask(task); setShowSheet(true); }}
                    onDelete={() => deleteTask(TODAY, task.id)}
                    currencySymbol={currencySymbol}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Earnings Forecast */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <EarningsBreakdown earnings={todayEarnings} currencySymbol={currencySymbol} />
        </div>
      </div>

      {/* Slide-over Sheets */}
      {showSheet && (
        <TaskCreationSheet
          date={TODAY}
          task={editTask}
          onClose={() => { setShowSheet(false); setEditTask(null); }}
        />
      )}

      {showDisciplineSheet && (
        <DisciplineCreationSheet onClose={() => setShowDisciplineSheet(false)} />
      )}
    </main>
  );
}

function BasketReviewRow({ task, badge, badgeColor, onAdd, currencySymbol }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: 'var(--sp-2) var(--sp-3)',
      fontSize: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="badge" style={{ fontSize: 10, background: 'transparent', color: badgeColor, border: `1px solid ${badgeColor}`, padding: '1px 6px' }}>
          {badge}
        </span>
        <span className="font-medium text-sm">{task.name || task.title}</span>
        {task.tag && <span className="badge badge-purple" style={{ fontSize: 10 }}>#{task.tag}</span>}
      </div>

      <button
        className="btn btn-sm btn-primary"
        onClick={onAdd}
        style={{ fontSize: 11, padding: '2px 8px', height: 26 }}
      >
        <Plus size={12} /> Add to Today
      </button>
    </div>
  );
}

function TaskItem({ task, onEdit, onDelete, currencySymbol }) {
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
          cursor: 'default',
          background: task.status === 'finished' ? 'var(--green)22' : 'transparent'
        }}
      >
        {task.status === 'finished' ? (
          <CheckCircle size={14} style={{ color: 'var(--green)' }} />
        ) : (
          <Icon size={14} style={{ color: typeColor }} />
        )}
      </div>
      <div className="task-info">
        <div className="task-name">{task.name || task.title}</div>
        <div className="task-meta">
          {task.tag && <span>#{task.tag}</span>}
          {task.type === 'normal' && <span>Weight: {task.weight}</span>}
          {task.type === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: {currencySymbol}{task.damage}</span>}
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

function EarningsBreakdown({ earnings, currencySymbol }) {
  if (!earnings || (earnings.E_base === 0 && earnings.D_tot === 0 && earnings.M_pow === 1)) {
    return (
      <div>
        <div className="section-label">Projected Earnings</div>
        <div className="earnings-card" style={{ textAlign: 'center', padding: 'var(--sp-6)' }}>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text-tertiary)', lineHeight: 1 }}>{currencySymbol}0</div>
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
            {currencySymbol}{earnings.R_calc.toFixed(2)}
          </span>
          <span className="text-sm text-tertiary">today</span>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: earnings.debtCarryover > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
          gap: 'var(--sp-3)' 
        }}>
          <div className="stat-pill">
            <span className="stat-pill-value text-blue">{currencySymbol}{earnings.E_base.toFixed(0)}</span>
            <span className="stat-pill-label">Base</span>
          </div>
          {earnings.debtCarryover > 0 && (
            <div className="stat-pill">
              <span className="stat-pill-value text-red">-{currencySymbol}{earnings.debtCarryover.toFixed(0)}</span>
              <span className="stat-pill-label">Debt Carry</span>
            </div>
          )}
          <div className="stat-pill">
            <span className="stat-pill-value text-red">-{currencySymbol}{earnings.D_tot.toFixed(0)}</span>
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
