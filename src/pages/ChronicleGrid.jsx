import { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, parseISO, addMonths, subMonths, isFuture, isToday,
} from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, BarChart2, Zap, LayoutDashboard, Calendar as CalendarIcon, ArrowRight, Search, Target, PieChart as PieChartIcon, Flame, IndianRupee } from 'lucide-react';
import useStore from '../store/useStore';
import SettleUpModal from '../components/SettleUpModal';
import AIInsightCard from '../components/AIInsightCard';

export default function ChronicleGrid() {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const getDayStatus = useStore((s) => s.getDayStatus);
  const searchEntries = useStore((s) => s.searchEntries);
  const searchResults = searchQuery.trim() ? searchEntries(searchQuery) : [];
  const dailyLogs = useStore((s) => s.dailyLogs);
  const earnings = useStore((s) => s.earnings);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setDuskDate = useStore((s) => s.setDuskDate);
  const getEarningsHistory = useStore((s) => s.getEarningsHistory);
  const getTasksHistory = useStore((s) => s.getTasksHistory);
  const coreDisciplines = useStore((s) => s.coreDisciplines);
  const getPendingRemuneration = useStore((s) => s.getPendingRemuneration);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const { totalPending, pendingDays } = getPendingRemuneration();

  const earningsHistory = getEarningsHistory(30);
  const tasksHistory = getTasksHistory(30);
  const totalEarned = earningsHistory.reduce((s, d) => s + d.R_calc, 0);

  // Build calendar grid
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const handleViewLog = () => {
    setDuskDate(selectedDate);
    setActiveTab('dusk');
  };

  const selectedLog = dailyLogs[selectedDate] ?? null;
  const selectedEarnings = earnings[selectedDate] ?? null;
  const selectedStatus = getDayStatus(selectedDate);

  const statusColors = { green: 'var(--green)', yellow: 'var(--orange)', red: 'var(--red)', empty: 'var(--text-quaternary)' };
  const statusLabels = { green: 'Complete', yellow: 'Partial', red: 'Missing', empty: 'Empty' };

  return (
    <main className="page anim-fade" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="page-title">Chronicle Ledger</h1>
          <span className="badge badge-green" style={{ fontSize: 12 }}>
            ₹{totalEarned.toFixed(0)} this month
          </span>
        </div>
        <div className="page-subtitle">Your discipline arc — calendar, earnings, and trend analytics</div>
      </div>

      <div className="spatial-grid">
        {/* LEFT COLUMN: Calendar & Daily Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', zIndex: 50 }}>
            <div className="input-wrap" style={{ display: 'flex', alignItems: 'center', background: 'var(--elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-2) var(--sp-3)' }}>
              <Search size={18} className="text-tertiary" style={{ marginRight: 8 }} />
              <input 
                className="input" 
                style={{ border: 'none', background: 'transparent', padding: 0, height: 'auto', width: '100%' }} 
                placeholder="Search Journal..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              />
            </div>
            {isSearchFocused && searchQuery.trim() && (
              <div className="card anim-scale" style={{ position: 'absolute', top: 'calc(100% + var(--sp-2))', left: 0, right: 0, maxHeight: 300, overflowY: 'auto', padding: 'var(--sp-2)', zIndex: 60, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                {searchResults.length === 0 ? (
                  <div className="text-sm text-tertiary" style={{ padding: 'var(--sp-3)', textAlign: 'center' }}>No results found</div>
                ) : (
                  searchResults.map((res, i) => (
                    <div 
                      key={`${res.date}-${i}`}
                      style={{ padding: 'var(--sp-3)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: 4, transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--elevated-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      onClick={() => {
                        setDuskDate(res.date);
                        setActiveTab('dusk');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-xs text-tertiary font-medium">{format(parseISO(res.date), 'MMM d, yyyy')}</span>
                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{res.label}</span>
                      </div>
                      <div className="text-sm" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{res.matchText}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Calendar Block */}
          <div>
            {/* Month Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-4)' }}>
              <button className="date-nav-btn" onClick={() => setViewMonth(subMonths(viewMonth, 1))} aria-label="Previous month">
                <ChevronLeft size={20} />
              </button>
              <span className="text-lg font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarIcon size={20} className="text-blue" />
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              <button
                className="date-nav-btn"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                disabled={format(addMonths(viewMonth, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
                aria-label="Next month"
                style={{ opacity: format(addMonths(viewMonth, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM') ? 0.3 : 1 }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Day Labels */}
            <div className="cal-grid" style={{ marginBottom: 'var(--sp-2)' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 600, letterSpacing: '0.06em', paddingBottom: 'var(--sp-1)' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="cal-grid card" style={{ padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
              {allDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = format(day, 'MM') === format(viewMonth, 'MM');
                const future = isFuture(day) && !isToday(day);
                const today = isToday(day);
                const status = isCurrentMonth && !future ? getDayStatus(dateStr) : 'empty';

                return (
                  <div
                    key={dateStr}
                    className={[
                      'cal-day',
                      isCurrentMonth ? (future ? 'future' : status) : 'empty',
                      today ? 'today' : '',
                      dateStr === selectedDate ? 'selected' : '',
                    ].join(' ')}
                    onClick={() => isCurrentMonth && !future && setSelectedDate(dateStr)}
                    aria-label={`${format(day, 'MMMM d')}: ${status}`}
                    role={isCurrentMonth && !future ? 'button' : undefined}
                    tabIndex={isCurrentMonth && !future ? 0 : -1}
                    onKeyDown={(e) => e.key === 'Enter' && isCurrentMonth && !future && setSelectedDate(dateStr)}
                    style={{ opacity: isCurrentMonth ? 1 : 0.2 }}
                  >
                    {format(day, 'd')}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 'var(--sp-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { status: 'green', label: 'Complete' },
                { status: 'yellow', label: 'Partial' },
                { status: 'red', label: 'Missing' },
                { status: 'empty', label: 'Future' },
              ].map((l) => (
                <div key={l.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: 3,
                    background: l.status === 'green' ? 'rgba(48,209,88,0.3)' :
                                l.status === 'yellow' ? 'rgba(255,159,10,0.3)' :
                                l.status === 'red' ? 'rgba(255,69,58,0.3)' : 'var(--card)',
                    border: `1px solid ${l.status === 'green' ? 'var(--green)' : l.status === 'yellow' ? 'var(--orange)' : l.status === 'red' ? 'var(--red)' : 'var(--border)'}`,
                  }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Date Detail Panel */}
          {selectedDate && (
            <div className="card anim-scale" style={{ padding: 'var(--sp-5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                <div>
                  <div className="text-sm text-tertiary">{format(parseISO(selectedDate), 'EEEE, MMMM d yyyy')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginTop: 4 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: statusColors[selectedStatus],
                    }} />
                    <span className="text-sm font-medium" style={{ color: statusColors[selectedStatus] }}>
                      {statusLabels[selectedStatus]}
                    </span>
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleViewLog}
                >
                  View Log <ArrowRight size={14} style={{ marginLeft: 4 }} />
                </button>
              </div>

              {selectedLog?.highlight && (
                <div style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)', background: 'var(--elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--blue)' }}>
                  <div className="text-xs text-tertiary" style={{ marginBottom: 4 }}>Today's Highlight</div>
                  <div className="text-sm font-medium">{selectedLog.highlight}</div>
                </div>
              )}

              {selectedEarnings && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
                  <div className="stat-pill">
                    <span className="stat-pill-value text-green">₹{selectedEarnings.R_calc.toFixed(0)}</span>
                    <span className="stat-pill-label">Remuneration</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-pill-value text-blue">
                      {selectedEarnings.P_potential > 0 
                        ? Math.round((selectedEarnings.P_base / selectedEarnings.P_potential) * 100) 
                        : 0}%
                    </span>
                    <span className="stat-pill-label">Completion</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Full Analytics View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          {/* F2.1: Pending Remuneration Tile */}
          <div className="card" style={{ padding: 'var(--sp-5)', background: 'linear-gradient(135deg, rgba(48,209,88,0.1) 0%, rgba(10,132,255,0.05) 100%)', border: '1px solid rgba(48,209,88,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--sp-2)' }}>
                  <IndianRupee className="text-green" size={20} />
                  Pending Remuneration
                </h3>
                <div className="text-sm text-secondary" style={{ marginBottom: 'var(--sp-4)' }}>
                  {pendingDays.length} unclaimed {pendingDays.length === 1 ? 'day' : 'days'}
                </div>
                <div className="text-3xl font-bold" style={{ color: 'var(--green)' }}>
                  ₹{totalPending.toFixed(2)}
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setShowSettleModal(true)}
                disabled={pendingDays.length === 0}
              >
                Settle Up
              </button>
            </div>
          </div>

          <AnalyticsView earningsHistory={earningsHistory} tasksHistory={tasksHistory} coreDisciplines={coreDisciplines} />
        </div>

      </div>

      {showSettleModal && <SettleUpModal onClose={() => setShowSettleModal(false)} />}
    </main>
  );
}

function AnalyticsView({ earningsHistory, tasksHistory, coreDisciplines }) {
  const [timeView, setTimeView] = useState('daily');

  const groupedEarnings = useMemo(() => {
    if (timeView === 'daily') return earningsHistory;
    
    const grouped = [];
    let currentGroup = null;

    earningsHistory.forEach((day, i) => {
      const dDate = parseISO(day.date);
      let groupKey;
      if (timeView === 'weekly') {
        groupKey = format(startOfWeek(dDate, { weekStartsOn: 0 }), 'MMM d');
      } else {
        groupKey = format(startOfMonth(dDate), 'MMM yyyy');
      }

      if (!currentGroup || currentGroup.label !== groupKey) {
        if (currentGroup) grouped.push(currentGroup);
        currentGroup = { label: groupKey, P_base: 0, P_potential: 0 };
      }
      currentGroup.P_base += day.P_base;
      currentGroup.P_potential += day.P_potential;

      if (i === earningsHistory.length - 1) {
        grouped.push(currentGroup);
      }
    });
    return grouped;
  }, [earningsHistory, timeView]);

  const pieData = useMemo(() => {
    const tagWeights = {};
    tasksHistory.forEach(day => {
      day.tasks.forEach(t => {
        if (t.type === 'normal' || t.type === 'power') {
          const tag = t.tag?.trim() ? t.tag.trim() : 'Untagged';
          tagWeights[tag] = (tagWeights[tag] || 0) + (t.weight || 1);
        }
      });
    });
    return Object.entries(tagWeights)
      .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
      .sort((a, b) => b.value - a.value);
  }, [tasksHistory]);

  const COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#BF5AF2', '#64D2FF', '#FFD60A'];

  const habitCompletionData = useMemo(() => {
    const weeks = {};
    tasksHistory.forEach(day => {
      const dDate = parseISO(day.date);
      const weekKey = format(startOfWeek(dDate, { weekStartsOn: 0 }), 'MMM d');
      if (!weeks[weekKey]) weeks[weekKey] = { label: weekKey, completed: 0, total: 0 };
      
      const recurring = day.tasks.filter(t => (t.recurrence && t.recurrence !== 'none') || t.isCoreDiscipline);
      recurring.forEach(t => {
        weeks[weekKey].total += 1;
        if (t.status === 'completed' || t.completionPercentage === 1) weeks[weekKey].completed += 1;
        else if (t.completionPercentage > 0) weeks[weekKey].completed += t.completionPercentage;
      });
    });
    return Object.values(weeks).map(w => ({
      label: w.label,
      Rate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0
    }));
  }, [tasksHistory]);

  const matrixData = useMemo(() => {
    return coreDisciplines.map(cd => {
      let completedCount = 0;
      let currentStreak = 0;
      const days = tasksHistory.map(day => {
        const task = day.tasks.find(t => t.coreDisciplineId === cd.id || (t.isCoreDiscipline && t.name === cd.name));
        let status = 'empty';
        if (task) {
          if (task.status === 'completed' || task.completionPercentage === 1) {
            status = 'green';
            completedCount++;
            currentStreak++;
          } else if (task.status === 'missed') {
            status = 'red';
            currentStreak = 0;
          } else if (task.completionPercentage > 0) {
            status = 'yellow';
            completedCount += task.completionPercentage;
            currentStreak++;
          }
        } else {
          if (day.date < format(new Date(), 'yyyy-MM-dd')) currentStreak = 0;
        }
        return { date: day.date, status };
      });
      
      return {
        id: cd.id,
        name: cd.name,
        streak: currentStreak,
        rate: Math.round((completedCount / tasksHistory.length) * 100),
        days
      };
    });
  }, [coreDisciplines, tasksHistory]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{
        background: 'var(--elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-3) var(--sp-4)',
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label || payload[0].name}</div>
        {payload.map((p, idx) => (
          <div key={idx} style={{ color: p.color || p.payload?.fill || 'var(--text-primary)' }}>
            {p.name}: {p.name === 'Rate' ? `${p.value}%` : p.value}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="anim-fade" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      
      {/* Settings Row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <select 
          className="input input-sm" 
          value={timeView} 
          onChange={(e) => setTimeView(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* F2.2: AI Insight Card */}
      <AIInsightCard timeView={timeView} />

      {/* Multi-Bar Goal Consistency Chart */}
      <div className="card" style={{ padding: 'var(--sp-5)' }}>
        <h3 className="text-lg font-semibold" style={{ marginBottom: 'var(--sp-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Target className="text-blue" size={20} />
          Goal Consistency
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={groupedEarnings} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3C" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8E8E93' }} />
            <Bar dataKey="P_potential" name="Target Points" fill="#3A3A3C" radius={[3, 3, 0, 0]} />
            <Bar dataKey="P_base" name="Actual Points" fill="#0A84FF" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        {/* Tag-based Workload Pie Chart */}
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <h3 className="text-lg font-semibold" style={{ marginBottom: 'var(--sp-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChartIcon className="text-purple" size={20} />
            Workload by Tag (30d)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Habit Completion Rate Chart */}
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <h3 className="text-lg font-semibold" style={{ marginBottom: 'var(--sp-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp className="text-green" size={20} />
            Habit Consistency
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={habitCompletionData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="habitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#30D158" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#30D158" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3C" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8E8E93', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Rate" name="Rate" stroke="#30D158" strokeWidth={2} fill="url(#habitGrad)" dot={{ r: 4, fill: '#30D158' }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Core Discipline Attendance Matrix */}
      {matrixData.length > 0 && (
        <div className="card" style={{ padding: 'var(--sp-5)' }}>
          <h3 className="text-lg font-semibold" style={{ marginBottom: 'var(--sp-5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarIcon className="text-orange" size={20} />
            Core Discipline Matrix (30d)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            {matrixData.map(cd => (
              <div key={cd.id} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', alignItems: 'center', gap: 'var(--sp-4)' }}>
                <div className="text-sm font-medium truncate" title={cd.name}>{cd.name}</div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {cd.days.map((d, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        flex: 1, 
                        height: 24, 
                        borderRadius: 2,
                        background: d.status === 'green' ? 'var(--green)' : 
                                    d.status === 'yellow' ? 'var(--orange)' : 
                                    d.status === 'red' ? 'var(--red)' : 'var(--border)',
                        opacity: d.status === 'empty' ? 0.3 : 1
                      }} 
                      title={`${format(parseISO(d.date), 'MMM d')}: ${d.status}`}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)', fontSize: 12 }}>
                  <span className="text-tertiary">{cd.rate}% rate</span>
                  <span className="text-orange font-semibold" style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Flame size={13} />{cd.streak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
