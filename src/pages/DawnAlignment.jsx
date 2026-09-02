import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Zap, Rocket, Skull, Leaf, RefreshCw, X, Plus, Target, CheckCircle, Activity, ChevronDown, ChevronUp, Layers, Clock, TrendingUp, DollarSign, Award, ShieldAlert } from 'lucide-react';
import useStore from '../store/useStore';
import TaskCreationSheet from '../components/TaskCreationSheet';
import DisciplineCreationSheet from '../components/DisciplineCreationSheet';
import { isTaskOverdue, isTaskDueSoon } from '../utils/eisenhower';
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
  const earnings = useStore((s) => s.earnings);
  const settings = useStore((s) => s.settings);
  const setActiveTab = useStore((s) => s.setActiveTab);

  const [showSheet, setShowSheet] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showDisciplineSheet, setShowDisciplineSheet] = useState(false);
  const [isDisciplinesOpen, setIsDisciplinesOpen] = useState(false); // Collapsed by default

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

  // Completion metrics
  const completedCount = tasks.filter((t) => t.status === 'finished').length;
  const completionRatio = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Task Basket review items
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
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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
            {format(new Date(), 'EEE, MMM d, yyyy')}
          </span>
        </div>
        <div className="page-subtitle">Plan today's targets and commit to your core disciplines</div>
      </div>

      <div className="spatial-grid">
        {/* LEFT COLUMN: Focus, Core Disciplines, Today's Targets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Today's Highlight Card */}
          <div className="card" style={{ padding: 'var(--sp-5)' }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={14} className="text-blue" />
              Today's Highlight
            </div>
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

          {/* Core Disciplines Card (Collapsible, collapsed by default) */}
          <div className="card" style={{ padding: 'var(--sp-4) var(--sp-5)' }}>
            <div
              onClick={() => setIsDisciplinesOpen((v) => !v)}
              style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={16} className="text-purple" />
                <span className="font-semibold text-sm">Core Disciplines ({coreDisciplines.length})</span>
                <span className="badge badge-purple" style={{ fontSize: 10 }}>Daily</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); setShowDisciplineSheet(true); }}
                  style={{ fontSize: 12, padding: '2px 8px' }}
                >
                  <Plus size={13} /> Add
                </button>
                <div style={{ color: 'var(--text-tertiary)', padding: 4 }}>
                  {isDisciplinesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </div>

            {/* Collapsed view summary */}
            {!isDisciplinesOpen && (
              <div className="text-xs text-tertiary" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{coreDisciplines.length} recurring daily habits configured</span>
                <span>• Click to expand & manage</span>
              </div>
            )}

            {/* Expanded items */}
            {isDisciplinesOpen && (
              <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {coreDisciplines.length === 0 ? (
                  <div className="text-xs text-tertiary" style={{ textAlign: 'center', padding: 'var(--sp-4) 0' }}>
                    No daily core disciplines created yet.
                  </div>
                ) : (
                  coreDisciplines.map((d) => {
                    const tType = d.type ?? 'normal';
                    const typeColor = TYPE_COLORS[tType] ?? 'var(--blue)';
                    const Icon = tType === 'normal' ? Zap :
                                 tType === 'power' ? Rocket :
                                 tType === 'kickass' ? Skull : Leaf;
                    
                    return (
                      <div key={d.id} className={`task-item type-${tType}`} style={{ padding: 'var(--sp-2) var(--sp-3)' }}>
                        <div className="task-check" style={{ borderColor: typeColor, cursor: 'default' }}>
                          <RefreshCw size={12} style={{ color: typeColor }} />
                        </div>
                        <div className="task-info">
                          <div className="task-name" style={{ fontSize: 13 }}>{d.name}</div>
                          <div className="task-meta" style={{ fontSize: 11 }}>
                            <span>Daily</span>
                            {tType === 'normal' && <span>Weight: {d.weight}</span>}
                            {tType === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: {currencySymbol}{d.damage}</span>}
                            {tType === 'power' && <span style={{ color: 'var(--purple)' }}>Multiplier</span>}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm"
                          style={{ background: 'transparent', color: 'var(--text-quaternary)', padding: '4px 8px' }}
                          onClick={(e) => { e.stopPropagation(); deleteCoreDiscipline(d.id); }}
                          aria-label={`Delete ${d.name}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Today's Targets Card (Renamed from Dynamic Targets) */}
          <div className="card" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
              <div>
                <div className="section-label" style={{ marginBottom: 0 }}>Today's Targets ({tasks.length})</div>
                <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>Specific task commitments for today</div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setEditTask(null); setShowSheet(true); }}
              >
                <Plus size={14} /> Add Target
              </button>
            </div>

            {tasks.length === 0 ? (
              <div style={{ padding: 'var(--sp-6)', textAlign: 'center', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div className="text-sm text-tertiary">No target tasks set for today yet.</div>
                <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>
                  Add a target or select items from your Task Basket.
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

        {/* RIGHT COLUMN: Earnings, Focus Metrics & Task Basket Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Projected Earnings Card */}
          <EarningsBreakdown earnings={todayEarnings} currencySymbol={currencySymbol} maxCap={settings?.maxDailyRemuneration ?? 1000} />

          {/* Day Focus & Progress Stats Card */}
          <div className="card" style={{ padding: 'var(--sp-5)' }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={14} className="text-green" />
              Focus & Alignment Stats
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
              <div>
                <div className="text-xs text-tertiary">Target Completion</div>
                <div className="text-lg font-bold" style={{ color: completionRatio === 100 ? 'var(--green)' : 'var(--text-primary)' }}>
                  {completedCount} of {tasks.length} Completed
                </div>
              </div>
              <span className={`badge ${completionRatio === 100 ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: 12 }}>
                {Math.round(completionRatio)}%
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--elevated)', borderRadius: 'var(--radius-pill)', overflow: 'hidden', marginBottom: 'var(--sp-4)' }}>
              <div style={{ width: `${completionRatio}%`, height: '100%', background: 'var(--green)', transition: 'width 0.3s ease' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)' }}>
              <div style={{ background: 'var(--bg)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="text-xs text-tertiary">Active Disciplines</div>
                <div className="text-base font-semibold">{coreDisciplines.length} Daily</div>
              </div>
              <div style={{ background: 'var(--bg)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="text-xs text-tertiary">Target Tasks</div>
                <div className="text-base font-semibold">{tasks.length} Planned</div>
              </div>
            </div>
          </div>

          {/* Task Basket Morning Review Widget */}
          {basketSuggestions.totalAvailable > 0 && (
            <div className="card" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} className="text-purple" />
                  <span className="font-semibold text-sm">Task Basket Review</span>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveTab('basket')}
                  style={{ fontSize: 11, padding: '2px 8px' }}
                >
                  Basket →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {basketSuggestions.overdue.map((task) => (
                  <BasketReviewRow
                    key={task.id}
                    task={task}
                    badge="⚠️ OVERDUE"
                    badgeColor="var(--red)"
                    onAdd={() => assignTaskToToday(task.id, TODAY)}
                  />
                ))}

                {basketSuggestions.impUrg.map((task) => (
                  <BasketReviewRow
                    key={task.id}
                    task={task}
                    badge="🔴 DO NOW"
                    badgeColor="var(--red)"
                    onAdd={() => assignTaskToToday(task.id, TODAY)}
                  />
                ))}

                {basketSuggestions.dueSoon.map((task) => (
                  <BasketReviewRow
                    key={task.id}
                    task={task}
                    badge="📅 DUE SOON"
                    badgeColor="var(--orange)"
                    onAdd={() => assignTaskToToday(task.id, TODAY)}
                  />
                ))}
              </div>
            </div>
          )}
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

function BasketReviewRow({ task, badge, badgeColor, onAdd }) {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="badge" style={{ fontSize: 9, background: 'transparent', color: badgeColor, border: `1px solid ${badgeColor}`, padding: '1px 5px' }}>
          {badge}
        </span>
        <span className="font-medium text-xs text-primary">{task.name || task.title}</span>
      </div>

      <button
        className="btn btn-sm btn-ghost"
        onClick={onAdd}
        style={{ fontSize: 11, padding: '2px 6px', height: 24, color: 'var(--blue)' }}
      >
        <Plus size={12} /> Add
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

function EarningsBreakdown({ earnings, currencySymbol, maxCap = 1000 }) {
  if (!earnings) return null;

  const currentRemuneration = earnings.R_calc ?? 0;
  const isNegative = currentRemuneration < 0;

  return (
    <div className="card" style={{ padding: 'var(--sp-5)' }}>
      <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <DollarSign size={14} className="text-orange" />
        Projected Daily Remuneration
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <span className={`earnings-amount ${isNegative ? 'negative' : currentRemuneration < maxCap ? 'partial' : ''}`} style={{ fontSize: '2.2rem', fontWeight: 700 }}>
          {currencySymbol}{currentRemuneration.toFixed(2)}
        </span>
        <span className="text-xs text-tertiary">/ {currencySymbol}{maxCap} max cap</span>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: earnings.debtCarryover > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', 
        gap: 'var(--sp-3)' 
      }}>
        <div className="stat-pill">
          <span className="stat-pill-value text-blue">{currencySymbol}{(earnings.E_base ?? 0).toFixed(0)}</span>
          <span className="stat-pill-label">Base</span>
        </div>
        {earnings.debtCarryover > 0 && (
          <div className="stat-pill">
            <span className="stat-pill-value text-red">-{currencySymbol}{earnings.debtCarryover.toFixed(0)}</span>
            <span className="stat-pill-label">Debt Carry</span>
          </div>
        )}
        <div className="stat-pill">
          <span className="stat-pill-value text-red">-{currencySymbol}{(earnings.D_tot ?? 0).toFixed(0)}</span>
          <span className="stat-pill-label">Damage</span>
        </div>
        <div className="stat-pill">
          <span className="stat-pill-value text-orange">{(earnings.M_pow ?? 1).toFixed(1)}×</span>
          <span className="stat-pill-label">Multiplier</span>
        </div>
      </div>
    </div>
  );
}
