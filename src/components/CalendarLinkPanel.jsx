import { useState } from 'react';
import { Calendar, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react';
import useStore from '../store/useStore';
import { supabase } from '../lib/supabase';

export default function CalendarLinkPanel() {
  const calendarToken = useStore((s) => s.calendarToken);
  const generateCalendarToken = useStore((s) => s.generateCalendarToken);
  const fetchFromSupabase = useStore((s) => s.fetchFromSupabase);

  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // Build the subscription URL from the Supabase project URL
  const buildCalendarUrl = (token, userId) => {
    const base = import.meta.env.VITE_SUPABASE_URL ?? '';
    return `${base}/functions/v1/calendar-sync?user_id=${userId}&token=${token}`;
  };

  const [userId, setUserId] = useState(null);

  // Fetch userId on mount if not available
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  });

  const calendarUrl = calendarToken && userId
    ? buildCalendarUrl(calendarToken, userId)
    : null;

  const webcalUrl = calendarUrl
    ? calendarUrl.replace('https://', 'webcal://')
    : null;

  const handleCopy = async () => {
    if (!calendarUrl) return;
    await navigator.clipboard.writeText(webcalUrl || calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!confirmRegen && calendarToken) {
      // Ask for confirmation before regenerating (breaks existing subscriptions)
      setConfirmRegen(true);
      return;
    }
    setGenerating(true);
    setConfirmRegen(false);
    await generateCalendarToken();
    // Re-fetch to ensure userId is fresh
    await fetchFromSupabase();
    setGenerating(false);
  };

  return (
    <div className="card" style={{ padding: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        <Calendar size={18} style={{ color: 'var(--blue)' }} />
        <span className="text-sm font-semibold">Calendar Subscription</span>
      </div>

      {!calendarToken ? (
        <div style={{ textAlign: 'center' }}>
          <div className="text-sm text-tertiary" style={{ marginBottom: 'var(--sp-3)', lineHeight: 1.6 }}>
            Generate a unique link to subscribe to your tasks in Apple Calendar, Google Calendar, or any ICS-compatible app.
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
            style={{ width: '100%' }}
          >
            {generating ? <RefreshCw size={14} className="spin" /> : <Calendar size={14} />}
            {generating ? 'Generating…' : 'Generate Calendar Link'}
          </button>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--sp-2)',
            background: 'var(--elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            marginBottom: 'var(--sp-3)',
          }}>
            <code style={{
              flex: 1, fontSize: 11,
              color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {webcalUrl ?? calendarUrl}
            </code>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCopy}
              title="Copy subscription URL"
              style={{ padding: '4px 8px', flexShrink: 0 }}
            >
              {copied
                ? <Check size={14} style={{ color: 'var(--green)' }} />
                : <Copy size={14} />
              }
            </button>
          </div>

          <div className="text-xs text-tertiary" style={{ marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
            Paste this <strong>webcal://</strong> link into your calendar app to subscribe. Only tasks with Calendar Sync enabled will appear.
          </div>

          {confirmRegen ? (
            <div style={{ background: 'var(--elevated)', border: '1px solid var(--red)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
                <AlertCircle size={14} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                <span className="text-xs" style={{ color: 'var(--red)', lineHeight: 1.5 }}>
                  Regenerating will <strong>break your existing calendar subscription</strong>. You'll need to re-subscribe with the new link.
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setConfirmRegen(false)}>Cancel</button>
                <button className="btn btn-sm" style={{ flex: 1, background: 'var(--red)', color: '#fff' }} onClick={handleGenerate} disabled={generating}>
                  {generating ? 'Regenerating…' : 'Yes, Regenerate'}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleGenerate}
              style={{ fontSize: 11, color: 'var(--text-tertiary)' }}
            >
              <RefreshCw size={11} /> Regenerate Token
            </button>
          )}
        </>
      )}
    </div>
  );
}
