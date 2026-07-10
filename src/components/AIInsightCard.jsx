import { useState, useEffect } from 'react';
import { Sparkles, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AIInsightCard({ timeView = 'weekly' }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInsight = async () => {
    setLoading(true);
    setError(null);
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
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch insight: ${errText}`);
      }

      const data = await response.json();
      setInsight(data);
    } catch (err) {
      console.error("AI Insight Error:", err);
      setError(err.message || "Could not generate insight at this time.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, [timeView]);

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
          {timeView === 'weekly' ? '7-Day AI Synthesis' : '30-Day AI Synthesis'}
        </h3>
        <button 
          className="btn btn-ghost btn-sm btn-icon" 
          onClick={fetchInsight} 
          disabled={loading}
          title="Regenerate Insight"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={14} className="text-blue" />
            <span className="text-xs font-semibold text-tertiary uppercase tracking-wider">
              Discipline Score
            </span>
            <span className="badge badge-blue" style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
              {insight.score} / 100
            </span>
          </div>
        </>
      ) : (
        <div className="text-sm text-tertiary">No insight available.</div>
      )}
    </div>
  );
}
