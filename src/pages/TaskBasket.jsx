import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Search, ArrowUpDown, RefreshCw, Layers, Clock, Grid, List as ListIcon, Zap, Rocket, Skull, Leaf, X, CheckCircle, Archive } from 'lucide-react';
import useStore from '../store/useStore';
import TaskCreationSheet from '../components/TaskCreationSheet';
import TaskDetailModal from '../components/TaskDetailModal';
import { getEisenhowerQuadrant, filterTasks, sortTasks, isTaskOverdue, isTaskDueSoon, QUADRANTS } from '../utils/eisenhower';
import { getCurrencySymbol } from '../utils/currency';

let globalIsDragging = false;

export default function TaskBasket() {
  const getTaskBasket = useStore((s) => s.getTaskBasket);
  const getArchivedTasks = useStore((s) => s.getArchivedTasks);
  const assignTaskToToday = useStore((s) => s.assignTaskToToday);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);
  const updateTask = useStore((s) => s.updateTask);
  const settings = useStore((s) => s.settings);

  const [activeTab, setActiveTab] = useState('basket'); // 'basket' or 'archive'
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix' or 'list'

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [commitTask, setCommitTask] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const allBasketTasks = getTaskBasket();
  const archivedTasks = getArchivedTasks();
  const currencySymbol = getCurrencySymbol(settings?.currency);

  // Extract unique categories/tags
  const categories = useMemo(() => {
    const set = new Set();
    allBasketTasks.forEach((t) => { if (t.tag) set.add(t.tag); });
    return Array.from(set);
  }, [allBasketTasks]);

  // Metrics computation
  const metrics = useMemo(() => {
    const total = allBasketTasks.length;
    const inbox = allBasketTasks.filter((t) => !t.logDate && !t.plannedDate).length;
    const overdue = allBasketTasks.filter((t) => isTaskOverdue(t)).length;
    const dueSoon = allBasketTasks.filter((t) => isTaskDueSoon(t, 7)).length;
    const important = allBasketTasks.filter((t) => (t.importance || 'Medium').toLowerCase() === 'high').length;
    const impUrg = allBasketTasks.filter(
      (t) => (t.importance || 'Medium').toLowerCase() === 'high' && (t.urgency || 'Medium').toLowerCase() === 'high'
    ).length;

    return { total, inbox, overdue, dueSoon, important, impUrg, archived: archivedTasks.length };
  }, [allBasketTasks, archivedTasks]);

  // Filtered & sorted task list
  const processedTasks = useMemo(() => {
    const filtered = filterTasks(allBasketTasks, {
      filter: activeFilter,
      category: categoryFilter,
      priority: priorityFilter,
      search,
    });
    return sortTasks(filtered, sortBy, sortAsc);
  }, [allBasketTasks, activeFilter, categoryFilter, priorityFilter, search, sortBy, sortAsc]);

  // Group tasks by Eisenhower Quadrant for Matrix view
  const matrixQuadrants = useMemo(() => {
    const groups = {
      do_now: [],
      schedule: [],
      delegate: [],
      someday: [],
    };
    processedTasks.forEach((task) => {
      const q = getEisenhowerQuadrant(task.importance, task.urgency);
      if (groups[q.key]) groups[q.key].push(task);
    });
    return groups;
  }, [processedTasks]);

  // Move task to a different quadrant (drag & drop handler / quick shift)
  const handleMoveToQuadrant = (task, targetKey) => {
    let newImp = 'Medium';
    let newUrg = 'Medium';

    if (targetKey === 'do_now') { newImp = 'High'; newUrg = 'High'; }
    else if (targetKey === 'schedule') { newImp = 'High'; newUrg = 'Low'; }
    else if (targetKey === 'delegate') { newImp = 'Low'; newUrg = 'High'; }
    else if (targetKey === 'someday') { newImp = 'Low'; newUrg = 'Low'; }

    updateTask(task.logDate, task.id, { importance: newImp, urgency: newUrg });
  };

  const handleCommitConfirm = (committedPct) => {
    if (commitTask) {
      assignTaskToToday(commitTask.id, todayStr, committedPct);
      setCommitTask(null);
    }
  };

  return (
    <main className="page anim-fade">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers className="text-purple" size={26} />
              Task Basket
            </h1>
            <div className="page-subtitle">Capture everything. Decide deliberately what deserves today.</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => fetchFromSupabase()}
              title="Force Refresh Data"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <RefreshCw size={14} />
            </button>

            <button
              className="btn btn-primary"
              onClick={() => { setEditTask(null); setShowCreateSheet(true); }}
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Toggle: Active Basket vs Archived Tasks */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-4)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--sp-2)' }}>
        <button
          className={`btn ${activeTab === 'basket' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('basket')}
          style={{ gap: 6 }}
        >
          <Layers size={15} /> Active Basket ({allBasketTasks.length})
        </button>
        <button
          className={`btn ${activeTab === 'archive' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('archive')}
          style={{ gap: 6 }}
        >
          <Archive size={15} /> Archived Tasks ({archivedTasks.length})
        </button>
      </div>

      {activeTab === 'basket' ? (
        <>
          {/* Metrics Summary Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 'var(--sp-3)',
            marginBottom: 'var(--sp-5)'
          }}>
            <MetricCard label="Total Tasks" count={metrics.total} active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} color="var(--text-primary)" />
            <MetricCard label="Inbox" count={metrics.inbox} active={activeFilter === 'inbox'} onClick={() => setActiveFilter('inbox')} color="var(--blue)" />
            <MetricCard label="Overdue" count={metrics.overdue} active={activeFilter === 'overdue'} onClick={() => setActiveFilter('overdue')} color="var(--red)" />
            <MetricCard label="Due Soon" count={metrics.dueSoon} active={activeFilter === 'due_week'} onClick={() => setActiveFilter('due_week')} color="var(--orange)" />
            <MetricCard label="Important" count={metrics.important} active={activeFilter === 'important'} onClick={() => setActiveFilter('important')} color="var(--yellow)" />
            <MetricCard label="Important + Urgent" count={metrics.impUrg} active={activeFilter === 'important_urgent'} onClick={() => setActiveFilter('important_urgent')} color="var(--red)" />
          </div>

          {/* Search & Filters Toolbar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--sp-3)',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-5)',
            background: 'var(--elevated)',
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}>
            {/* Left: Search input */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                className="input input-sm"
                style={{ paddingLeft: 34, width: '100%' }}
                placeholder="Search tasks, notes, tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Middle: Dropdown Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {categories.length > 0 && (
                <select
                  className="input input-sm"
                  style={{ width: 'auto' }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">Category: All</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>#{cat}</option>
                  ))}
                </select>
              )}

              <select
                className="input input-sm"
                style={{ width: 'auto' }}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">Priority: All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                className="input input-sm"
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created">Sort: Created</option>
                <option value="deadline">Sort: Deadline</option>
                <option value="importance">Sort: Importance</option>
                <option value="urgency">Sort: Urgency</option>
                <option value="priority">Sort: Priority</option>
                <option value="weight">Sort: Weight</option>
              </select>

              <button
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setSortAsc((v) => !v)}
                title={sortAsc ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown size={14} style={{ transform: sortAsc ? 'rotate(180deg)' : 'none' }} />
              </button>
            </div>

            {/* Right: View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: 2, border: '1px solid var(--border)' }}>
              <button
                className={`btn btn-sm ${viewMode === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('matrix')}
                style={{ padding: '4px 10px', height: 28, fontSize: 12, gap: 4 }}
              >
                <Grid size={13} /> Matrix
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setViewMode('list')}
                style={{ padding: '4px 10px', height: 28, fontSize: 12, gap: 4 }}
              >
                <ListIcon size={13} /> List ({processedTasks.length})
              </button>
            </div>
          </div>

          {/* Main View Area */}
          {viewMode === 'matrix' ? (
            <EisenhowerMatrixView
              quadrants={matrixQuadrants}
              onSelectTask={(task) => setSelectedTask(task)}
              onAddToToday={(task) => setCommitTask(task)}
              onMoveQuadrant={handleMoveToQuadrant}
              currencySymbol={currencySymbol}
              todayStr={todayStr}
            />
          ) : (
            <TaskListView
              tasks={processedTasks}
              onSelectTask={(task) => setSelectedTask(task)}
              onAddToToday={(task) => setCommitTask(task)}
              onMoveQuadrant={handleMoveToQuadrant}
              currencySymbol={currencySymbol}
              todayStr={todayStr}
            />
          )}
        </>
      ) : (
        /* Archived Tasks View */
        <ArchivedTasksView
          tasks={archivedTasks}
          onSelectTask={(task) => setSelectedTask(task)}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Commit Slider Modal */}
      {commitTask && (
        <CommitSliderModal
          task={commitTask}
          onClose={() => setCommitTask(null)}
          onConfirm={handleCommitConfirm}
          currencySymbol={currencySymbol}
        />
      )}

      {/* Slide-over Creation Sheet */}
      {showCreateSheet && (
        <TaskCreationSheet
          onClose={() => { setShowCreateSheet(false); setEditTask(null); }}
          task={editTask}
          date={null} // Default null = Task Basket inbox
        />
      )}

      {/* Task Inspector Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onEdit={(t) => {
            setSelectedTask(null);
            setEditTask(t);
            setShowCreateSheet(true);
          }}
        />
      )}
    </main>
  );
}

function CommitSliderModal({ task, onClose, onConfirm, currencySymbol }) {
  const [percentage, setPercentage] = useState(100);

  if (!task) return null;

  const weight = task.weight ?? 1;
  const committedWeight = (weight * (percentage / 100)).toFixed(2);
  const remainingWeight = (weight * (1 - percentage / 100)).toFixed(2);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Commit Task to Today</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={{ background: 'var(--elevated)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div className="font-semibold text-sm">{task.name || task.title}</div>
            <div className="text-xs text-tertiary" style={{ marginTop: 2 }}>
              Total Weight / Base Points: {weight}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">Committed Portion</label>
              <span className="badge badge-purple" style={{ fontSize: '1rem', padding: '2px 10px' }}>{percentage}%</span>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--purple)', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              <span>10% (Partial)</span>
              <span>50% (Half)</span>
              <span>100% (Full Task)</span>
            </div>
          </div>

          <div style={{ background: 'rgba(10, 132, 255, 0.08)', border: '1px solid rgba(10, 132, 255, 0.2)', padding: 'var(--sp-3)', borderRadius: 'var(--radius-md)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            <div><strong>Today's Allocation:</strong> {committedWeight} pts committed to today's Dawn Alignment.</div>
            {percentage < 100 && (
              <div style={{ marginTop: 4 }}><strong>Basket Balance:</strong> {remainingWeight} pts remain in the Task Basket for future days.</div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(percentage / 100)}>
            Confirm {percentage}% Commitment
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchivedTasksView({ tasks, onSelectTask, currencySymbol }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="card text-center" style={{ padding: 'var(--sp-8)' }}>
        <Archive size={32} className="text-tertiary" style={{ marginBottom: 8, margin: '0 auto' }} />
        <div className="text-sm font-semibold">No Archived Tasks</div>
        <div className="text-xs text-tertiary" style={{ marginTop: 4 }}>
          Tasks marked as completed or finished will appear here.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => onSelectTask(task)}
          className="card task-row-hover"
          style={{
            padding: 'var(--sp-3) var(--sp-4)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifySpace: 'space-between',
            gap: 'var(--sp-3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flex: 1 }}>
            <CheckCircle size={18} className="text-green" />
            <div>
              <div className="font-medium text-sm" style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                {task.name || task.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                {task.completedAt && <span>Completed: {format(new Date(task.completedAt), 'MMM d, yyyy')}</span>}
                {task.logDate && <span>Logged: {task.logDate}</span>}
                {task.weight && <span>Weight: {task.weight}</span>}
              </div>
            </div>
          </div>

          <span className="badge badge-green" style={{ fontSize: 11 }}>Finished 100%</span>
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, count, active, onClick, color }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? 'var(--elevated)' : 'var(--bg)',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-3) var(--sp-4)',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
    >
      <div className="text-xs text-tertiary" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: active ? color : 'var(--text-primary)', marginTop: 2 }}>
        {count}
      </div>
    </div>
  );
}

function EisenhowerMatrixView({ quadrants, onSelectTask, onAddToToday, onMoveQuadrant, currencySymbol, todayStr }) {
  const [activeDragTarget, setActiveDragTarget] = useState(null);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
      gap: 'var(--sp-4)',
      marginBottom: 'var(--sp-6)'
    }}>
      {Object.values(QUADRANTS).map((qInfo) => {
        const list = quadrants[qInfo.key] || [];
        const isHovered = activeDragTarget === qInfo.key;

        const handleDragOver = (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (activeDragTarget !== qInfo.key) setActiveDragTarget(qInfo.key);
        };

        const handleDragLeave = (e) => {
          if (e.currentTarget.contains(e.relatedTarget)) return;
          setActiveDragTarget(null);
        };

        const handleDrop = (e) => {
          e.preventDefault();
          setActiveDragTarget(null);
          const taskId = e.dataTransfer.getData('text/plain');
          if (taskId) {
            const allTasks = Object.values(quadrants).flat();
            const found = allTasks.find((t) => t.id === taskId);
            if (found) onMoveQuadrant(found, qInfo.key);
          }
        };

        return (
          <div
            key={qInfo.key}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              background: isHovered ? 'rgba(10, 132, 255, 0.08)' : qInfo.bg,
              border: isHovered ? `2px dashed ${qInfo.color}` : `1px solid ${qInfo.border}`,
              borderRadius: 'var(--radius-md)',
              padding: 'var(--sp-4)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '280px',
              transition: 'all 0.15s ease'
            }}
          >
            {/* Quadrant Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: qInfo.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{qInfo.emoji}</span>
                  {qInfo.label}
                </h3>
                <div className="text-xs text-tertiary">{qInfo.subtitle}</div>
              </div>
              <span className="badge" style={{ background: 'var(--bg)', color: qInfo.color }}>
                {list.length}
              </span>
            </div>

            {/* Quadrant Tasks List */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', overflowY: 'auto' }}>
              {list.length === 0 ? (
                <div className="text-xs text-tertiary" style={{ textAlign: 'center', padding: 'var(--sp-6) 0', fontStyle: 'italic' }}>
                  No tasks in {qInfo.label}
                </div>
              ) : (
                list.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onSelect={() => onSelectTask(task)}
                    onAddToToday={() => onAddToToday(task)}
                    onMoveQuadrant={(targetKey) => onMoveQuadrant(task, targetKey)}
                    currencySymbol={currencySymbol}
                    todayStr={todayStr}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskListView({ tasks, onSelectTask, onAddToToday, onMoveQuadrant, currencySymbol, todayStr }) {
  if (tasks.length === 0) {
    return (
      <div className="card text-center" style={{ padding: 'var(--sp-8)' }}>
        <div className="text-sm text-tertiary">No tasks match the active filters or search.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onSelect={() => onSelectTask(task)}
          onAddToToday={() => onAddToToday(task)}
          onMoveQuadrant={(targetKey) => onMoveQuadrant(task, targetKey)}
          currencySymbol={currencySymbol}
          todayStr={todayStr}
          isListView
        />
      ))}
    </div>
  );
}

function TaskCard({ task, onSelect, onAddToToday, onMoveQuadrant, currencySymbol, todayStr, isListView = false }) {
  const isAssignedToToday = task.logDate === todayStr || task.plannedDate === todayStr;
  const overdue = isTaskOverdue(task);
  const dueSoon = isTaskDueSoon(task, 7);
  const qInfo = getEisenhowerQuadrant(task.importance, task.urgency);

  const handleDragStart = (e) => {
    globalIsDragging = true;
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setTimeout(() => { globalIsDragging = false; }, 100);
  };

  const handleClick = (e) => {
    if (globalIsDragging) return;
    onSelect();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className="card task-row-hover"
      style={{
        padding: isListView ? 'var(--sp-3) var(--sp-4)' : 'var(--sp-3)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'grab',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: isListView ? 'row' : 'column',
        justifyContent: 'space-between',
        alignItems: isListView ? 'center' : 'stretch',
        gap: 'var(--sp-2)',
        transition: 'all 0.15s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', flex: 1 }}>
        <div style={{ marginTop: 2 }}>
          {task.type === 'power' && <Rocket size={15} className="text-purple" />}
          {task.type === 'kickass' && <Skull size={15} className="text-red" />}
          {task.type === 'uncritical' && <Leaf size={15} className="text-tertiary" />}
          {(!task.type || task.type === 'normal') && <Zap size={15} className="text-blue" />}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span className="font-medium text-sm" style={{ color: task.status === 'finished' ? 'var(--text-tertiary)' : 'var(--text-primary)', textDecoration: task.status === 'finished' ? 'line-through' : 'none' }}>
              {task.name || task.title}
            </span>
            {task.tag && <span className="badge badge-purple" style={{ fontSize: 10 }}>#{task.tag}</span>}
            {overdue && <span className="badge badge-red" style={{ fontSize: 10 }}>OVERDUE</span>}
            {dueSoon && !overdue && <span className="badge badge-yellow" style={{ fontSize: 10 }}>DUE SOON</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
            {task.deadline && (
              <span style={{ color: overdue ? 'var(--red)' : 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} /> {format(new Date(task.deadline), 'MMM d')}
              </span>
            )}
            {task.type === 'kickass' && <span style={{ color: 'var(--red)' }}>Damage: {currencySymbol}{task.damage}</span>}
            {task.type === 'normal' && <span>Weight: {task.weight}</span>}
            {task.estimatedDuration && <span>{task.estimatedDuration}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: isListView ? 'flex-end' : 'space-between', marginTop: isListView ? 0 : 4, flexWrap: 'wrap' }}>
        {/* Quick Quadrant Selector Dropdown */}
        <select
          value={qInfo.key}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            if (onMoveQuadrant) onMoveQuadrant(e.target.value);
          }}
          className="input input-sm"
          style={{
            fontSize: 10,
            padding: '1px 6px',
            height: 22,
            width: 'auto',
            background: qInfo.bg,
            color: qInfo.color,
            border: `1px solid ${qInfo.border}`,
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title="Change Eisenhower Quadrant"
        >
          {Object.values(QUADRANTS).map((q) => (
            <option key={q.key} value={q.key}>
              {q.emoji} {q.label}
            </option>
          ))}
        </select>

        {!isAssignedToToday ? (
          <button
            className="btn btn-sm btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              onAddToToday();
            }}
            style={{ fontSize: 11, padding: '2px 8px', color: 'var(--blue)', height: 26 }}
            title="Add to today's Dawn Alignment"
          >
            <Plus size={13} /> Add to Today
          </button>
        ) : (
          <span className="badge badge-green" style={{ fontSize: 10 }}>Planned Today</span>
        )}
      </div>
    </div>
  );
}
