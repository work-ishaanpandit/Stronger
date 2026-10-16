import { useState, useEffect } from 'react';
import { BookOpen, XCircle, AlertTriangle, ArrowLeft, RefreshCw, Copy, Check, ExternalLink } from 'lucide-react';
import useStore from '../store/useStore';
import SetupScreen from '../components/study/SetupScreen';
import PlanScreen from '../components/study/PlanScreen';
import WorkScreen from '../components/study/WorkScreen';
import RecallScreen from '../components/study/RecallScreen';
import BreakScreen from '../components/study/BreakScreen';
import SessionSummary from '../components/study/SessionSummary';
import { STUDY_MIGRATION_SQL } from '../utils/studyMigrationSql';

export default function StudyMode() {
  const studyWorkflowStep = useStore((s) => s.studyWorkflowStep);
  const activeStudySessionId = useStore((s) => s.activeStudySessionId);
  const endStudySession = useStore((s) => s.endStudySession);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const initOrResumeStudyState = useStore((s) => s.initOrResumeStudyState);
  const studySyncStatus = useStore((s) => s.studySyncStatus);
  const syncAllLocalStudyDataToSupabase = useStore((s) => s.syncAllLocalStudyDataToSupabase);

  const [confirmEndModal, setConfirmEndModal] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    initOrResumeStudyState();
  }, []);

  const handleConfirmEnd = async () => {
    setConfirmEndModal(false);
    await endStudySession('interrupted');
  };

  const handleRetrySync = async () => {
    setIsRetryingSync(true);
    await syncAllLocalStudyDataToSupabase();
    setIsRetryingSync(false);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(STUDY_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <main className="page anim-fade">
      {/* Top Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BookOpen size={24} className="text-blue" />
              <span>Study Mode</span>
            </h1>
            {activeStudySessionId && (
              <span className="badge badge-blue" style={{ fontSize: 11 }}>
                Session In Progress
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {studySyncStatus === 'tables_missing' && (
              <span className="badge" style={{ fontSize: 11, background: 'rgba(234, 88, 12, 0.15)', color: 'var(--orange)', border: '1px solid var(--orange)' }}>
                Local Storage Only (DB Migration Required)
              </span>
            )}
            {studySyncStatus === 'saving' && (
              <span className="text-xs text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={12} className="anim-spin" /> Syncing...
              </span>
            )}
            {studySyncStatus === 'local_only' && (
              <span className="text-xs text-tertiary">Draft saved locally</span>
            )}
            {studySyncStatus === 'synced' && (
              <span className="text-xs text-green">✓ Synced to Cloud</span>
            )}
            {studySyncStatus === 'error' && (
              <button
                className="btn btn-ghost btn-xs text-red"
                onClick={handleRetrySync}
                disabled={isRetryingSync}
                title="Click to retry cloud sync"
              >
                <RefreshCw size={12} className={isRetryingSync ? 'anim-spin' : ''} />
                <span>Sync Warning (Retry)</span>
              </button>
            )}
          </div>
        </div>
        <div className="page-subtitle">
          Structured cycle of intention, deep focus, active recall, and rest
        </div>
      </div>

      {/* Sync Warning Banner when Supabase tables are missing */}
      {studySyncStatus === 'tables_missing' && (
        <div
          className="card"
          style={{
            marginBottom: 'var(--sp-5)',
            padding: 'var(--sp-4)',
            background: 'rgba(234, 88, 12, 0.08)',
            border: '1px solid var(--orange)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertTriangle size={20} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Cross-Device Sync Setup Required
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Your study sessions are preserved safely in your browser on this device. To sync with your other devices, the Study Mode tables need to be created once in your Supabase project.
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm"
              onClick={handleRetrySync}
              disabled={isRetryingSync}
              style={{
                background: 'var(--orange)',
                color: '#fff',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RefreshCw size={13} className={isRetryingSync ? 'anim-spin' : ''} />
              <span>{isRetryingSync ? 'Checking...' : 'Check & Sync Now'}</span>
            </button>
          </div>

          <div
            style={{
              fontSize: 12,
              background: 'var(--bg-secondary)',
              padding: 'var(--sp-3)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            <strong>2-minute one-time setup:</strong>
            <ol style={{ paddingLeft: 18, marginTop: 6, marginBottom: 8, lineHeight: 1.6 }}>
              <li>
                Click{' '}
                <button
                  type="button"
                  onClick={handleCopySql}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--blue)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {copiedSql ? '✓ Copied!' : 'Copy Migration SQL'}
                </button>
              </li>
              <li>
                Open the{' '}
                <a
                  href="https://supabase.com/dashboard/project/gqfejgicasfexwsaokin/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--blue)', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 2 }}
                >
                  Supabase SQL Editor <ExternalLink size={11} />
                </a>
              </li>
              <li>Paste the SQL and click <strong>Run</strong></li>
              <li>Return here and click <strong>Check & Sync Now</strong> above. All existing study sessions will automatically upload!</li>
            </ol>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn btn-outline btn-xs"
                onClick={handleCopySql}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {copiedSql ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                <span>{copiedSql ? 'Migration SQL Copied!' : 'Copy Migration SQL to Clipboard'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workflow Switcher */}
      <div className="study-container" style={{ width: '100%' }}>
        {studyWorkflowStep === 'setup' && (
          <SetupScreen onResumeSession={() => initOrResumeStudyState()} />
        )}

        {studyWorkflowStep === 'plan' && (
          <PlanScreen onEndSessionRequest={() => setConfirmEndModal(true)} />
        )}

        {studyWorkflowStep === 'work' && (
          <WorkScreen onEndSessionRequest={() => setConfirmEndModal(true)} />
        )}

        {studyWorkflowStep === 'recall' && (
          <RecallScreen onEndSessionRequest={() => setConfirmEndModal(true)} />
        )}

        {studyWorkflowStep === 'break' && (
          <BreakScreen onEndSessionRequest={() => setConfirmEndModal(true)} />
        )}

        {studyWorkflowStep === 'summary' && (
          <SessionSummary
            sessionId={activeStudySessionId}
            onStartNewSession={() => useStore.setState({ studyWorkflowStep: 'setup', activeStudySessionId: null })}
            onViewInChronicle={() => setActiveTab('chronicle')}
          />
        )}
      </div>

      {/* End Study Mode Confirmation Modal */}
      {confirmEndModal && (
        <div
          className="overlay modal-center"
          onClick={(e) => e.target === e.currentTarget && setConfirmEndModal(false)}
        >
          <div className="modal-box anim-scale" style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--sp-4)', color: 'var(--orange)' }}>
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">End Study Session?</h3>
            </div>

            <p className="text-sm text-secondary" style={{ lineHeight: 1.6, marginBottom: 'var(--sp-6)' }}>
              Ending this session will freeze all timers and conclude your study blocks. Any unfinished work or recall
              will be preserved and flagged as incomplete or interrupted in your Chronicle records.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmEndModal(false)}
              >
                Continue Studying
              </button>
              <button
                className="btn btn-sm"
                onClick={handleConfirmEnd}
                style={{ background: 'var(--red)', color: '#fff' }}
              >
                Yes, End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
