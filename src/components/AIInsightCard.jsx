import { useState, useEffect } from 'react';
import { format, subDays, parseISO, isToday, isYesterday } from 'date-fns';
import { Sparkles, Activity, RefreshCw, ChevronDown, ChevronUp, BookOpen, CheckSquare, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useStore from '../store/useStore';
import { compileSynthesisContext, generateLocalSynthesis } from '../utils/aiSynthesisEngine';

export default function AIInsightCard({ timeView = 'weekly', selectedDate = null }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [analyzedContext, setAnalyzedContext] = useState(null);
  const [analyzedDateStr, setAnalyzedDateStr] = useState(null);

  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const fetchInsight = async (targetDateOverride) => {
    setLoading(true);
    setError(null);

    // Determine target date for synthesis:
    // For daily: use targetDateOverride if passed, else selectedDate if passed, else default T-1 (yesterday)
    let dateToUse = targetDateOverride;
    if (!dateToUse && timeView === 'daily') {
      dateToUse = selectedDate || yesterdayStr;
    }

    // 1. Compile the complete user context across logs, study blocks, tasks & notes directly from store snapshot
    const storeState = useStore.getState();
    const context = compileSynthesisContext(storeState, timeView, dateToUse);
    setAnalyzedContext(context);
    setAnalyzedDateStr(context.targetDateStr);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          timeView,
          targetDate: context.targetDateStr,
          userId: session.user.id,
          clientData: {
            tasks: context.tasks,
            logs: context.logs,
            studySessions: context.studySessions,
            studyBlocks: context.studyBlocks,
            metrics: context.metrics,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn('Remote AI analysis edge error, utilizing local synthesis engine:', errText);
        // Fallback to local synthesis engine using exact user data
        const localResult = generateLocalSynthesis(context);
        setInsight(localResult);
        return;
      }

      const data = await response.json();
      setInsight(data);
    } catch (err) {
      console.warn("AI Insight remote fetch exception, utilizing local synthesis engine:", err);
      // Fallback to local deterministic synthesis engine with true user data
      const localResult = generateLocalSynthesis(context);
      setInsight(localResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // When timeView changes, fetch default synthesis (T-1 for daily)
    fetchInsight();
  }, [timeView]);

  const metrics = analyzedContext?.metrics || {};

  const formatDateHeader = (dStr) => {
    if (!dStr) return '';
    try {
      const d = parseISO(dStr);
      if (isYesterday(d)) return `Yesterday (${format(d, 'MMM d')}) [T-1]`;
      if (isToday(d)) return `Today (${format(d, 'MMM d')})`;
      return format(d, 'EEE, MMM d, yyyy');
    } catch (e) {
      return dStr;
    }
  };

  return (
    <div className="card anim-scale" style={{ 
      padding: 'var(--sp-5)', 
      background: 'linear-gradient(135deg, rgba(100,210,255,0.05) 0%, rgba(191,90,242,0.05) 100%)',
      border: '1px solid rgba(191,90,242,0.2)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient orb */}
      <div style={{
        position: 'absolute', top: -50, right: -50, width: 150, height: 150,
        background: 'radial-gradient(circle, rgba(191,90,242,0.15) 0%, rgba(191,90,242,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      {/* Calendar Day Selected Notice Banner */}
      {timeView === 'daily' && selectedDate && selectedDate !== analyzedDateStr && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          marginBottom: 'var(--sp-3)',
          background: 'rgba(191, 90, 242, 0.12)',
          border: '1px solid rgba(191, 90, 242, 0.3)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            📅 Calendar day selected: <strong style={{ color: 'var(--text-primary)' }}>{format(parseISO(selectedDate), 'MMM d, yyyy')}</strong>
          </span>
          <button
            className="btn btn-xs btn-primary"
            onClick={() => fetchInsight(selectedDate)}
            disabled={loading}
            style={{ fontSize: 11, padding: '2px 8px', height: 22 }}
          >
            <RefreshCw size={11} className={loading ? 'anim-spin' : ''} style={{ marginRight: 4 }} />
            Synthesize this day
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <h3 className="text-sm font-semibold text-purple" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Sparkles size={16} />
          <span>
            {timeView === 'daily' 
              ? `1-Day AI Synthesis • ${formatDateHeader(analyzedDateStr || yesterdayStr)}` 
              : timeView === 'weekly' 
                ? '7-Day AI Synthesis' 
                : '30-Day AI Synthesis'}
          </span>
        </h3>
        <button 
          className="btn btn-ghost btn-sm btn-icon" 
          onClick={() => fetchInsight(selectedDate)} 
          disabled={loading}
          title={selectedDate && selectedDate !== analyzedDateStr ? `Synthesize ${selectedDate}` : "Regenerate Insight"}
          style={{ color: 'var(--text-tertiary)' }}
        >
          <RefreshCw size={14} className={loading ? 'anim-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', padding: 'var(--sp-3) 0' }}>
          <div className="skeleton" style={{ height: 16, width: '80%' }} />
          <div className="skeleton" style={{ height: 16, width: '100%' }} />
          <div className="skeleton" style={{ height: 16, width: '60%' }} />
        </div>
      ) : error ? (
        <div className="text-sm text-tertiary">{error}</div>
      ) : insight ? (
        <>
          <div className="text-lg font-semibold" style={{ marginBottom: 'var(--sp-2)' }}>
            {insight.title}
          </div>
          <div className="text-sm text-secondary" style={{ lineHeight: 1.6, marginBottom: 'var(--sp-4)' }}>
            {insight.insight}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} className="text-blue" />
              <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">
                Discipline Score
              </span>
              <span className="badge badge-blue" style={{ fontWeight: 'bold' }}>
                {insight.score} / 100
              </span>
            </div>

            {/* Transparency Button: Data Analyzed */}
            <button
              className="btn btn-ghost btn-xs"
              onClick={() => setShowDataDetails(!showDataDetails)}
              style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <span>Data Analyzed ({metrics.totalTasks || 0} tasks, {metrics.totalStudyBlocks || 0} study blocks, {metrics.totalLogs || 0} logs)</span>
              {showDataDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Expandable Data Transparency Panel */}
          {showDataDetails && analyzedContext && (
            <div
              className="anim-fade"
              style={{
                marginTop: 'var(--sp-3)',
                padding: 'var(--sp-3)',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} className="text-blue" />
                <span>Period: {analyzedContext.startDateStr} → {analyzedContext.endDateStr} ({analyzedContext.days} days)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 8 }}>
                <div style={{ background: 'var(--elevated)', padding: '6px 8px', borderRadius: 4 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <BookOpen size={12} className="text-purple" />
                    <span>Study Mode: {metrics.totalStudyBlocks} blocks</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {metrics.totalStudyHours}h active • Avg Focus: {metrics.averageFocusRating ? `${metrics.averageFocusRating}/5` : 'N/A'}
                    {metrics.topicsStudied?.length > 0 && <div>Topics: {metrics.topicsStudied.join(', ')}</div>}
                  </div>
                </div>

                <div style={{ background: 'var(--elevated)', padding: '6px 8px', borderRadius: 4 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CheckSquare size={12} className="text-green" />
                    <span>Tasks: {metrics.totalTasks} analyzed</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {metrics.completedTasks} done • {analyzedContext.tasks.filter(t => t.notes).length} with detailed in-task notes
                  </div>
                </div>

                <div style={{ background: 'var(--elevated)', padding: '6px 8px', borderRadius: 4 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <FileText size={12} className="text-blue" />
                    <span>Daily Logs: {metrics.totalLogs} entries</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    Includes Highlights, Reflections, and Epiphanies
                  </div>
                </div>
              </div>

              {/* Sample list of items considered */}
              {analyzedContext.studyBlocks.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 11 }}>
                  <strong>Study Takeaways:</strong>{' '}
                  {analyzedContext.studyBlocks.slice(0, 3).map((b) => (
                    <span key={b.id} style={{ display: 'inline-block', marginRight: 8 }}>
                      • {b.topic || b.course}: {b.actualOutcome ? `"${b.actualOutcome.slice(0, 50)}…"` : '(completed)'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-tertiary">No insight available.</div>
      )}
    </div>
  );
}
