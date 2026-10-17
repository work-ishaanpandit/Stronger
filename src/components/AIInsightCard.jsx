import { useState, useEffect } from 'react';
import { Sparkles, Activity, RefreshCw, ChevronDown, ChevronUp, BookOpen, CheckSquare, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import useStore from '../store/useStore';
import { compileSynthesisContext, generateLocalSynthesis } from '../utils/aiSynthesisEngine';

export default function AIInsightCard({ timeView = 'weekly' }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDataDetails, setShowDataDetails] = useState(false);
  const [analyzedContext, setAnalyzedContext] = useState(null);

  // Subscribe to all relevant store data
  const storeState = useStore((s) => ({
    dailyLogs: s.dailyLogs,
    tasks: s.tasks,
    studySessions: s.studySessions,
    studyBlocks: s.studyBlocks,
    studyPhases: s.studyPhases,
  }));

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);

    // 1. Compile the complete user context across logs, study blocks, tasks & notes
    const context = compileSynthesisContext(storeState, timeView);
    setAnalyzedContext(context);

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
    fetchInsight();
  }, [timeView]);

  const metrics = analyzedContext?.metrics || {};

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <h3 className="text-sm font-semibold text-purple" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} />
          {timeView === 'daily' ? '1-Day AI Synthesis' : timeView === 'weekly' ? '7-Day AI Synthesis' : '30-Day AI Synthesis'}
        </h3>
        <button 
          className="btn btn-ghost btn-sm btn-icon" 
          onClick={fetchInsight} 
          disabled={loading}
          title="Regenerate Insight"
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
