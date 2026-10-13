import { useState, useEffect } from 'react';
import { BookOpen, XCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import useStore from '../store/useStore';
import SetupScreen from '../components/study/SetupScreen';
import PlanScreen from '../components/study/PlanScreen';
import WorkScreen from '../components/study/WorkScreen';
import RecallScreen from '../components/study/RecallScreen';
import BreakScreen from '../components/study/BreakScreen';
import SessionSummary from '../components/study/SessionSummary';

export default function StudyMode() {
  const studyWorkflowStep = useStore((s) => s.studyWorkflowStep);
  const activeStudySessionId = useStore((s) => s.activeStudySessionId);
  const endStudySession = useStore((s) => s.endStudySession);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const initOrResumeStudyState = useStore((s) => s.initOrResumeStudyState);
  const studySyncStatus = useStore((s) => s.studySyncStatus);

  const [confirmEndModal, setConfirmEndModal] = useState(false);

  useEffect(() => {
    initOrResumeStudyState();
  }, []);

  const handleConfirmEnd = async () => {
    setConfirmEndModal(false);
    await endStudySession('interrupted');
  };

  return (
    <main className="page anim-fade">
      {/* Top Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--sp-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {studySyncStatus === 'local_only' && (
              <span className="text-xs text-tertiary">Draft saved locally</span>
            )}
            {studySyncStatus === 'synced' && (
              <span className="text-xs text-green">✓ Synced</span>
            )}
            {studySyncStatus === 'error' && (
              <span className="text-xs text-red">Sync Warning (Saved Locally)</span>
            )}
          </div>
        </div>
        <div className="page-subtitle">
          Structured cycle of intention, deep focus, active recall, and rest
        </div>
      </div>

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
