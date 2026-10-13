import {
  calculatePhaseTiming,
  calculateRecallCompleteness,
  validateFocusRating,
  PHASE_CONFIG,
} from '../engine/studyTimer.js';
import { supabase } from '../lib/supabase.js';

const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const createStudySlice = (set, get) => ({
  // ── Study Mode State ────────────────────────────────────────────────────────
  studySessions: {},
  studyBlocks: {},
  studyPhases: {},
  studyRevisions: {},

  activeStudySessionId: null,
  activeStudyBlockId: null,
  activeStudyPhaseId: null,
  studyWorkflowStep: 'setup', // 'setup' | 'plan' | 'work' | 'recall' | 'break' | 'summary'

  studyDrafts: {
    brainDump: '',
    plan: { course: '', topic: '', plannedOutcome: '' },
    recall: { done: '', next: '', focus: null },
  },

  studySyncStatus: 'synced', // 'synced' | 'saving' | 'local_only' | 'error'
  studySyncError: null,
  isTransitioning: false, // Atomic transition guard

  // ── Draft Updaters ──────────────────────────────────────────────────────────
  setBrainDumpDraft: (text) => {
    set((state) => ({
      studyDrafts: { ...state.studyDrafts, brainDump: text },
      studySyncStatus: 'local_only',
    }));
  },

  setPlanDraft: (updates) => {
    set((state) => ({
      studyDrafts: {
        ...state.studyDrafts,
        plan: { ...state.studyDrafts.plan, ...updates },
      },
      studySyncStatus: 'local_only',
    }));
  },

  setRecallDraft: (updates) => {
    set((state) => ({
      studyDrafts: {
        ...state.studyDrafts,
        recall: { ...state.studyDrafts.recall, ...updates },
      },
      studySyncStatus: 'local_only',
    }));
  },

  // ── Session Initialization & Recovery ───────────────────────────────────────
  initOrResumeStudyState: () => {
    const { studySessions, studyBlocks, studyPhases, activeStudySessionId } = get();

    // Check if there is an active session
    let activeSession = null;
    if (activeStudySessionId && studySessions[activeStudySessionId]?.status === 'active') {
      activeSession = studySessions[activeStudySessionId];
    } else {
      activeSession = Object.values(studySessions).find((s) => s.status === 'active') || null;
    }

    if (!activeSession) {
      set({
        activeStudySessionId: null,
        activeStudyBlockId: null,
        activeStudyPhaseId: null,
        studyWorkflowStep: 'setup',
      });
      return;
    }

    // Find all blocks belonging to this active session
    const sessionBlocks = Object.values(studyBlocks)
      .filter((b) => b.sessionId === activeSession.id)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    const latestBlock = sessionBlocks[sessionBlocks.length - 1];

    if (!latestBlock) {
      set({
        activeStudySessionId: activeSession.id,
        activeStudyBlockId: null,
        activeStudyPhaseId: null,
        studyWorkflowStep: 'setup',
      });
      return;
    }

    // Find phases for the latest block
    const blockPhases = Object.values(studyPhases)
      .filter((p) => p.blockId === latestBlock.id)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    const activePhase = blockPhases.find((p) => p.status === 'in_progress');

    if (activePhase) {
      set({
        activeStudySessionId: activeSession.id,
        activeStudyBlockId: latestBlock.id,
        activeStudyPhaseId: activePhase.id,
        studyWorkflowStep: activePhase.phaseType,
      });
    } else {
      // If block is planned or all previous phases are completed, open Plan
      set({
        activeStudySessionId: activeSession.id,
        activeStudyBlockId: latestBlock.id,
        activeStudyPhaseId: null,
        studyWorkflowStep: latestBlock.status === 'completed' ? 'summary' : 'plan',
        studyDrafts: {
          ...get().studyDrafts,
          plan: {
            course: latestBlock.course || '',
            topic: latestBlock.topic || '',
            plannedOutcome: latestBlock.plannedOutcome || '',
          },
        },
      });
    }
  },

  // ── Study Mode Workflow Actions ─────────────────────────────────────────────

  /**
   * 1. Start a new Study Session from Setup Screen
   */
  startStudySession: async (brainDumpText = '') => {
    if (get().isTransitioning) return;
    set({ isTransitioning: true, studySyncStatus: 'saving', studySyncError: null });

    try {
      const user = await getUser();
      const now = new Date().toISOString();
      const sessionId = crypto.randomUUID();
      const blockId = crypto.randomUUID();

      const newSession = {
        id: sessionId,
        userId: user?.id || 'local-user',
        date: now.split('T')[0],
        startedAt: now,
        endedAt: null,
        brainDump: brainDumpText || '',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      const initialBlock = {
        id: blockId,
        sessionId,
        userId: user?.id || 'local-user',
        sequenceNumber: 1,
        course: '',
        topic: '',
        plannedOutcome: '',
        actualOutcome: null,
        nextAction: null,
        focusRating: null,
        status: 'planned',
        recallCompleteness: 'not_recorded',
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        studySessions: { ...state.studySessions, [sessionId]: newSession },
        studyBlocks: { ...state.studyBlocks, [blockId]: initialBlock },
        activeStudySessionId: sessionId,
        activeStudyBlockId: blockId,
        activeStudyPhaseId: null,
        studyWorkflowStep: 'plan',
        studyDrafts: {
          brainDump: '',
          plan: { course: '', topic: '', plannedOutcome: '' },
          recall: { done: '', next: '', focus: null },
        },
        studySyncStatus: user ? 'synced' : 'local_only',
        isTransitioning: false,
      }));

      // Background push to Supabase
      if (user) {
        get().syncStudySessionToSupabase(newSession);
        get().syncStudyBlockToSupabase(initialBlock);
      }
    } catch (err) {
      console.error('Error starting study session:', err);
      set({ isTransitioning: false, studySyncStatus: 'error', studySyncError: err.message });
    }
  },

  /**
   * 2. Start Work Block from Plan Screen
   */
  startWorkBlock: async (planData) => {
    if (get().isTransitioning) return;
    const { activeStudyBlockId, studyBlocks } = get();
    if (!activeStudyBlockId || !studyBlocks[activeStudyBlockId]) return;

    if (!planData.plannedOutcome || !planData.plannedOutcome.trim()) {
      throw new Error('Planned outcome is required before starting work');
    }

    set({ isTransitioning: true, studySyncStatus: 'saving', studySyncError: null });

    try {
      const user = await getUser();
      const now = new Date().toISOString();
      const phaseId = crypto.randomUUID();

      const updatedBlock = {
        ...studyBlocks[activeStudyBlockId],
        course: planData.course?.trim() || null,
        topic: planData.topic?.trim() || null,
        plannedOutcome: planData.plannedOutcome.trim(),
        status: 'in_progress',
        updatedAt: now,
      };

      const workPhase = {
        id: phaseId,
        blockId: activeStudyBlockId,
        userId: user?.id || 'local-user',
        phaseType: 'work',
        targetDuration: PHASE_CONFIG.work.targetDuration, // 1500s (25m)
        startedAt: now,
        endedAt: null,
        status: 'in_progress',
        pauses: [],
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        studyBlocks: { ...state.studyBlocks, [activeStudyBlockId]: updatedBlock },
        studyPhases: { ...state.studyPhases, [phaseId]: workPhase },
        activeStudyPhaseId: phaseId,
        studyWorkflowStep: 'work',
        studySyncStatus: user ? 'synced' : 'local_only',
        isTransitioning: false,
      }));

      if (user) {
        get().syncStudyBlockToSupabase(updatedBlock);
        get().syncStudyPhaseToSupabase(workPhase);
      }
    } catch (err) {
      console.error('Error starting work phase:', err);
      set({ isTransitioning: false, studySyncStatus: 'error', studySyncError: err.message });
      throw err;
    }
  },

  /**
   * 3. Pause Active Phase
   */
  pauseActivePhase: async () => {
    const { activeStudyPhaseId, studyPhases } = get();
    if (!activeStudyPhaseId || !studyPhases[activeStudyPhaseId]) return;

    const phase = studyPhases[activeStudyPhaseId];
    if (phase.endedAt || phase.status !== 'in_progress') return;

    // Check if already paused
    const hasOpenPause = (phase.pauses || []).some((p) => !p.resumedAt);
    if (hasOpenPause) return;

    const now = new Date().toISOString();
    const updatedPauses = [...(phase.pauses || []), { pausedAt: now, resumedAt: null }];

    const updatedPhase = {
      ...phase,
      pauses: updatedPauses,
      updatedAt: now,
    };

    set((state) => ({
      studyPhases: { ...state.studyPhases, [activeStudyPhaseId]: updatedPhase },
    }));

    const user = await getUser();
    if (user) {
      get().syncStudyPhaseToSupabase(updatedPhase);
    }
  },

  /**
   * 4. Resume Active Phase
   */
  resumeActivePhase: async () => {
    const { activeStudyPhaseId, studyPhases } = get();
    if (!activeStudyPhaseId || !studyPhases[activeStudyPhaseId]) return;

    const phase = studyPhases[activeStudyPhaseId];
    if (phase.endedAt || phase.status !== 'in_progress') return;

    const now = new Date().toISOString();
    const pauses = phase.pauses || [];
    const openPauseIndex = pauses.findIndex((p) => !p.resumedAt);
    if (openPauseIndex === -1) return;

    const updatedPauses = [...pauses];
    updatedPauses[openPauseIndex] = {
      ...updatedPauses[openPauseIndex],
      resumedAt: now,
    };

    const updatedPhase = {
      ...phase,
      pauses: updatedPauses,
      updatedAt: now,
    };

    set((state) => ({
      studyPhases: { ...state.studyPhases, [activeStudyPhaseId]: updatedPhase },
    }));

    const user = await getUser();
    if (user) {
      get().syncStudyPhaseToSupabase(updatedPhase);
    }
  },

  /**
   * 5. Transition Work -> Recall
   */
  advanceToRecall: async () => {
    if (get().isTransitioning) return;
    const { activeStudyPhaseId, activeStudyBlockId, studyPhases } = get();
    if (!activeStudyPhaseId || !studyPhases[activeStudyPhaseId]) return;

    set({ isTransitioning: true, studySyncStatus: 'saving', studySyncError: null });

    try {
      const user = await getUser();
      const now = new Date().toISOString();
      const currentPhase = studyPhases[activeStudyPhaseId];

      // Close open pause if paused at transition time
      let pauses = currentPhase.pauses || [];
      const openIdx = pauses.findIndex((p) => !p.resumedAt);
      if (openIdx !== -1) {
        pauses = [...pauses];
        pauses[openIdx] = { ...pauses[openIdx], resumedAt: now };
      }

      // 1. Complete Work phase
      const completedWorkPhase = {
        ...currentPhase,
        endedAt: now,
        status: 'completed',
        pauses,
        updatedAt: now,
      };

      // 2. Create Recall phase
      const recallPhaseId = crypto.randomUUID();
      const recallPhase = {
        id: recallPhaseId,
        blockId: activeStudyBlockId,
        userId: user?.id || 'local-user',
        phaseType: 'recall',
        targetDuration: PHASE_CONFIG.recall.targetDuration, // 60s
        startedAt: now,
        endedAt: null,
        status: 'in_progress',
        pauses: [],
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        studyPhases: {
          ...state.studyPhases,
          [activeStudyPhaseId]: completedWorkPhase,
          [recallPhaseId]: recallPhase,
        },
        activeStudyPhaseId: recallPhaseId,
        studyWorkflowStep: 'recall',
        studyDrafts: {
          ...state.studyDrafts,
          recall: { done: '', next: '', focus: null },
        },
        studySyncStatus: user ? 'synced' : 'local_only',
        isTransitioning: false,
      }));

      if (user) {
        get().syncStudyPhaseToSupabase(completedWorkPhase);
        get().syncStudyPhaseToSupabase(recallPhase);
      }
    } catch (err) {
      console.error('Error advancing to recall:', err);
      set({ isTransitioning: false, studySyncStatus: 'error', studySyncError: err.message });
    }
  },

  /**
   * 6. Transition Recall -> Break
   */
  saveRecallAndStartBreak: async (recallData) => {
    if (get().isTransitioning) return;
    const { activeStudyPhaseId, activeStudyBlockId, studyPhases, studyBlocks } = get();
    if (!activeStudyPhaseId || !studyPhases[activeStudyPhaseId] || !activeStudyBlockId) return;

    set({ isTransitioning: true, studySyncStatus: 'saving', studySyncError: null });

    try {
      const user = await getUser();
      const now = new Date().toISOString();
      const currentRecallPhase = studyPhases[activeStudyPhaseId];
      const currentBlock = studyBlocks[activeStudyBlockId];

      // Close open pause if any
      let pauses = currentRecallPhase.pauses || [];
      const openIdx = pauses.findIndex((p) => !p.resumedAt);
      if (openIdx !== -1) {
        pauses = [...pauses];
        pauses[openIdx] = { ...pauses[openIdx], resumedAt: now };
      }

      // Complete Recall Phase
      const completedRecallPhase = {
        ...currentRecallPhase,
        endedAt: now,
        status: 'completed',
        pauses,
        updatedAt: now,
      };

      // Validate focus & calculate completeness
      const validFocus = validateFocusRating(recallData.focus);
      const actualOutcome = recallData.done?.trim() || null;
      const nextAction = recallData.next?.trim() || null;
      const completeness = calculateRecallCompleteness(actualOutcome, nextAction);

      const updatedBlock = {
        ...currentBlock,
        actualOutcome,
        nextAction,
        focusRating: validFocus,
        recallCompleteness: completeness,
        status: 'completed',
        updatedAt: now,
      };

      // Create Break Phase
      const breakPhaseId = crypto.randomUUID();
      const breakPhase = {
        id: breakPhaseId,
        blockId: activeStudyBlockId,
        userId: user?.id || 'local-user',
        phaseType: 'break',
        targetDuration: PHASE_CONFIG.break.targetDuration, // 300s (5m)
        startedAt: now,
        endedAt: null,
        status: 'in_progress',
        pauses: [],
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        studyPhases: {
          ...state.studyPhases,
          [activeStudyPhaseId]: completedRecallPhase,
          [breakPhaseId]: breakPhase,
        },
        studyBlocks: {
          ...state.studyBlocks,
          [activeStudyBlockId]: updatedBlock,
        },
        activeStudyPhaseId: breakPhaseId,
        studyWorkflowStep: 'break',
        studySyncStatus: user ? 'synced' : 'local_only',
        isTransitioning: false,
      }));

      if (user) {
        get().syncStudyPhaseToSupabase(completedRecallPhase);
        get().syncStudyBlockToSupabase(updatedBlock);
        get().syncStudyPhaseToSupabase(breakPhase);
      }
    } catch (err) {
      console.error('Error saving recall & starting break:', err);
      set({ isTransitioning: false, studySyncStatus: 'error', studySyncError: err.message });
    }
  },

  /**
   * 7. Transition Break -> Plan (New Block)
   */
  returnToPlan: async () => {
    if (get().isTransitioning) return;
    const { activeStudyPhaseId, activeStudyBlockId, activeStudySessionId, studyPhases, studyBlocks } = get();
    if (!activeStudyPhaseId || !studyPhases[activeStudyPhaseId] || !activeStudySessionId) return;

    set({ isTransitioning: true, studySyncStatus: 'saving', studySyncError: null });

    try {
      const user = await getUser();
      const now = new Date().toISOString();
      const currentBreakPhase = studyPhases[activeStudyPhaseId];
      const previousBlock = studyBlocks[activeStudyBlockId];

      // Close open pause if any
      let pauses = currentBreakPhase.pauses || [];
      const openIdx = pauses.findIndex((p) => !p.resumedAt);
      if (openIdx !== -1) {
        pauses = [...pauses];
        pauses[openIdx] = { ...pauses[openIdx], resumedAt: now };
      }

      // Complete Break Phase
      const completedBreakPhase = {
        ...currentBreakPhase,
        endedAt: now,
        status: 'completed',
        pauses,
        updatedAt: now,
      };

      // Create Next Block
      const nextSequence = (previousBlock?.sequenceNumber || 1) + 1;
      const nextBlockId = crypto.randomUUID();

      const nextBlock = {
        id: nextBlockId,
        sessionId: activeStudySessionId,
        userId: user?.id || 'local-user',
        sequenceNumber: nextSequence,
        course: previousBlock?.course || '',
        topic: previousBlock?.topic || '',
        plannedOutcome: '',
        actualOutcome: null,
        nextAction: null,
        focusRating: null,
        status: 'planned',
        recallCompleteness: 'not_recorded',
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        studyPhases: {
          ...state.studyPhases,
          [activeStudyPhaseId]: completedBreakPhase,
        },
        studyBlocks: {
          ...state.studyBlocks,
          [nextBlockId]: nextBlock,
        },
        activeStudyBlockId: nextBlockId,
        activeStudyPhaseId: null,
        studyWorkflowStep: 'plan',
        studyDrafts: {
          ...state.studyDrafts,
          plan: {
            course: previousBlock?.course || '',
            topic: previousBlock?.topic || '',
            plannedOutcome: '',
          },
        },
        studySyncStatus: user ? 'synced' : 'local_only',
        isTransitioning: false,
      }));

      if (user) {
        get().syncStudyPhaseToSupabase(completedBreakPhase);
        get().syncStudyBlockToSupabase(nextBlock);
      }
    } catch (err) {
      console.error('Error returning to plan:', err);
      set({ isTransitioning: false, studySyncStatus: 'error', studySyncError: err.message });
    }
  },

  /**
   * 8. End Study Mode from Any Phase
   */
  endStudySession: async (reason = 'normal') => {
    if (get().isTransitioning) return;
    const {
      activeStudySessionId,
      activeStudyBlockId,
      activeStudyPhaseId,
      studySessions,
      studyBlocks,
      studyPhases,
      studyDrafts,
    } = get();

    if (!activeStudySessionId || !studySessions[activeStudySessionId]) return;

    set({ isTransitioning: true, studySyncStatus: 'saving', studySyncError: null });

    try {
      const user = await getUser();
      const now = new Date().toISOString();
      const session = studySessions[activeStudySessionId];

      const phaseUpdates = {};
      const blockUpdates = {};

      // 1. End active phase if present
      if (activeStudyPhaseId && studyPhases[activeStudyPhaseId]) {
        const p = studyPhases[activeStudyPhaseId];
        let pauses = p.pauses || [];
        const openIdx = pauses.findIndex((pause) => !pause.resumedAt);
        if (openIdx !== -1) {
          pauses = [...pauses];
          pauses[openIdx] = { ...pauses[openIdx], resumedAt: now };
        }

        const phaseStatus = p.phaseType === 'break' ? 'completed' : 'interrupted';
        phaseUpdates[activeStudyPhaseId] = {
          ...p,
          endedAt: now,
          status: phaseStatus,
          pauses,
          updatedAt: now,
        };
      }

      // 2. Mark active block if unfinished
      if (activeStudyBlockId && studyBlocks[activeStudyBlockId]) {
        const b = studyBlocks[activeStudyBlockId];
        if (b.status === 'in_progress' || b.status === 'planned') {
          // If ended during recall, save entered draft recall
          let actualOutcome = b.actualOutcome;
          let nextAction = b.nextAction;
          let focusRating = b.focusRating;

          if (get().studyWorkflowStep === 'recall') {
            actualOutcome = studyDrafts.recall.done?.trim() || b.actualOutcome;
            nextAction = studyDrafts.recall.next?.trim() || b.nextAction;
            focusRating = validateFocusRating(studyDrafts.recall.focus) || b.focusRating;
          }

          const completeness = calculateRecallCompleteness(actualOutcome, nextAction);
          blockUpdates[activeStudyBlockId] = {
            ...b,
            actualOutcome,
            nextAction,
            focusRating,
            recallCompleteness: completeness,
            status: 'interrupted',
            updatedAt: now,
          };
        }
      }

      // 3. Mark session completed
      const endedSession = {
        ...session,
        endedAt: now,
        status: reason === 'interrupted' ? 'interrupted' : 'completed',
        updatedAt: now,
      };

      set((state) => ({
        studySessions: { ...state.studySessions, [activeStudySessionId]: endedSession },
        studyBlocks: { ...state.studyBlocks, ...blockUpdates },
        studyPhases: { ...state.studyPhases, ...phaseUpdates },
        activeStudySessionId: null,
        activeStudyBlockId: null,
        activeStudyPhaseId: null,
        studyWorkflowStep: 'summary',
        studySyncStatus: user ? 'synced' : 'local_only',
        isTransitioning: false,
      }));

      if (user) {
        get().syncStudySessionToSupabase(endedSession);
        Object.values(blockUpdates).forEach((b) => get().syncStudyBlockToSupabase(b));
        Object.values(phaseUpdates).forEach((p) => get().syncStudyPhaseToSupabase(p));
      }
    } catch (err) {
      console.error('Error ending study session:', err);
      set({ isTransitioning: false, studySyncStatus: 'error', studySyncError: err.message });
    }
  },

  /**
   * 9. Historical Block Edit & Audit Trail
   */
  editHistoricalBlock: async (blockId, fieldUpdates) => {
    const { studyBlocks, studyRevisions } = get();
    const block = studyBlocks[blockId];
    if (!block) return { error: 'Block not found' };

    const user = await getUser();
    const now = new Date().toISOString();
    const revisionsToCreate = [];

    const allowedFields = ['course', 'topic', 'plannedOutcome', 'actualOutcome', 'nextAction', 'focusRating'];
    const updatedBlock = { ...block, updatedAt: now };

    for (const [key, newVal] of Object.entries(fieldUpdates)) {
      if (!allowedFields.includes(key)) continue;

      let sanitizedNew = newVal;
      if (key === 'focusRating') {
        sanitizedNew = validateFocusRating(newVal);
      } else if (typeof newVal === 'string') {
        sanitizedNew = newVal.trim() || null;
      }

      const prevVal = block[key];
      if (prevVal !== sanitizedNew) {
        updatedBlock[key] = sanitizedNew;

        revisionsToCreate.push({
          id: crypto.randomUUID(),
          recordId: blockId,
          recordType: 'study_block',
          userId: user?.id || 'local-user',
          fieldName: key,
          previousValue: prevVal != null ? String(prevVal) : null,
          newValue: sanitizedNew != null ? String(sanitizedNew) : null,
          editedAt: now,
        });
      }
    }

    // Recompute completeness if outcome or nextAction changed
    updatedBlock.recallCompleteness = calculateRecallCompleteness(
      updatedBlock.actualOutcome,
      updatedBlock.nextAction
    );

    const existingRevs = studyRevisions[blockId] || [];
    const newRevs = [...existingRevs, ...revisionsToCreate];

    set((state) => ({
      studyBlocks: { ...state.studyBlocks, [blockId]: updatedBlock },
      studyRevisions: { ...state.studyRevisions, [blockId]: newRevs },
    }));

    if (user) {
      get().syncStudyBlockToSupabase(updatedBlock);
      for (const rev of revisionsToCreate) {
        get().syncStudyRevisionToSupabase(rev);
      }
    }

    return { success: true, updatedBlock };
  },

  // ── Supabase Background Sync Handlers ───────────────────────────────────────

  syncStudySessionToSupabase: async (session) => {
    try {
      const user = await getUser();
      if (!user) return;

      const payload = {
        id: session.id,
        user_id: user.id,
        date: session.date,
        started_at: session.startedAt,
        ended_at: session.endedAt || null,
        brain_dump: session.brainDump || '',
        status: session.status || 'active',
        created_at: session.createdAt,
        updated_at: session.updatedAt,
      };

      const { error } = await supabase.from('study_sessions').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('study_sessions sync error:', error.message);
        set({ studySyncStatus: 'local_only', studySyncError: error.message });
      }
    } catch (err) {
      console.warn('study_sessions sync exception:', err.message);
      set({ studySyncStatus: 'local_only' });
    }
  },

  syncStudyBlockToSupabase: async (block) => {
    try {
      const user = await getUser();
      if (!user) return;

      const payload = {
        id: block.id,
        session_id: block.sessionId,
        user_id: user.id,
        sequence_number: block.sequenceNumber,
        course: block.course || null,
        topic: block.topic || null,
        planned_outcome: block.plannedOutcome,
        actual_outcome: block.actualOutcome || null,
        next_action: block.nextAction || null,
        focus_rating: block.focusRating || null,
        status: block.status || 'planned',
        recall_completeness: block.recallCompleteness || 'not_recorded',
        created_at: block.createdAt,
        updated_at: block.updatedAt,
      };

      const { error } = await supabase.from('study_blocks').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('study_blocks sync error:', error.message);
        set({ studySyncStatus: 'local_only', studySyncError: error.message });
      }
    } catch (err) {
      console.warn('study_blocks sync exception:', err.message);
      set({ studySyncStatus: 'local_only' });
    }
  },

  syncStudyPhaseToSupabase: async (phase) => {
    try {
      const user = await getUser();
      if (!user) return;

      const payload = {
        id: phase.id,
        block_id: phase.blockId,
        user_id: user.id,
        phase_type: phase.phaseType,
        target_duration: phase.targetDuration,
        started_at: phase.startedAt,
        ended_at: phase.endedAt || null,
        status: phase.status || 'in_progress',
        pauses: phase.pauses || [],
        created_at: phase.createdAt,
        updated_at: phase.updatedAt,
      };

      const { error } = await supabase.from('study_phases').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('study_phases sync error:', error.message);
        set({ studySyncStatus: 'local_only', studySyncError: error.message });
      }
    } catch (err) {
      console.warn('study_phases sync exception:', err.message);
      set({ studySyncStatus: 'local_only' });
    }
  },

  syncStudyRevisionToSupabase: async (rev) => {
    try {
      const user = await getUser();
      if (!user) return;

      const payload = {
        id: rev.id,
        record_id: rev.recordId,
        record_type: rev.recordType,
        user_id: user.id,
        field_name: rev.fieldName,
        previous_value: rev.previousValue || null,
        new_value: rev.newValue || null,
        edited_at: rev.editedAt,
      };

      const { error } = await supabase.from('study_revisions').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('study_revisions sync error:', error.message);
      }
    } catch (err) {
      console.warn('study_revisions sync exception:', err.message);
    }
  },
});
