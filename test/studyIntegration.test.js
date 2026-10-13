import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudySlice } from '../src/store/studySlice.js';
import { calculatePhaseTiming, formatTimerDisplay } from '../src/engine/studyTimer.js';

function createMockHarness() {
  let state = {};
  const set = (updater) => {
    const next = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...next };
  };
  const get = () => state;

  const slice = createStudySlice(set, get);
  state = {
    ...slice,
    // Include existing Stronger state to ensure zero regression
    dailyLogs: { '2026-10-14': { highlight: 'Unchanged' } },
    tasks: { '2026-10-14': [{ id: 't1', name: 'Task 1', weight: 1.0 }] },
    earnings: { '2026-10-14': { R_calc: 1000 } },
  };
  return { get, set };
}

test('studyIntegration - Critical Timer Test (PRD Section 13)', async () => {
  const { get, set } = createMockHarness();

  // 1. Start Work phase at simulated T0
  const t0 = new Date('2026-10-14T10:00:00.000Z').getTime();
  await get().startStudySession('Critical test brain dump');
  await get().startWorkBlock({ plannedOutcome: 'Derive quadratic equation' });

  let s = get();
  assert.equal(s.studyWorkflowStep, 'work');
  const workPhaseId = s.activeStudyPhaseId;
  assert.ok(workPhaseId);

  // Set startedAt to t0 for exact timing simulation
  set((prev) => ({
    studyPhases: {
      ...prev.studyPhases,
      [workPhaseId]: {
        ...prev.studyPhases[workPhaseId],
        startedAt: new Date(t0).toISOString(),
      },
    },
  }));

  // 2. Advance simulated time beyond 25 minutes (e.g. 27 minutes = 1620s)
  const t1 = t0 + 27 * 60 * 1000;
  let timing = calculatePhaseTiming(get().studyPhases[workPhaseId], t1);

  // 3. Verify overtime appears WITHOUT changing phase
  assert.equal(get().studyWorkflowStep, 'work'); // Still in work phase!
  assert.equal(timing.isOvertime, true);
  assert.equal(timing.remainingSeconds, 0);
  assert.equal(timing.overtimeSeconds, 120); // 2 minutes of overtime
  assert.equal(formatTimerDisplay(timing), '+02:00');

  // 4. Pause the timer during overtime at t1
  // Mock pause time to t1
  set((prev) => {
    const p = prev.studyPhases[workPhaseId];
    return {
      studyPhases: {
        ...prev.studyPhases,
        [workPhaseId]: {
          ...p,
          pauses: [...p.pauses, { pausedAt: new Date(t1).toISOString(), resumedAt: null }],
        },
      },
    };
  });

  // 5. Advance wall-clock time by 5 minutes while paused (t2 = t1 + 5m)
  const t2 = t1 + 5 * 60 * 1000;
  timing = calculatePhaseTiming(get().studyPhases[workPhaseId], t2);

  // 6. Verify active elapsed time does NOT increase while paused
  assert.equal(timing.isPaused, true);
  assert.equal(timing.activeElapsedSeconds, 1620); // Still exactly 27m
  assert.equal(timing.overtimeSeconds, 120); // Overtime frozen at 2m
  assert.equal(formatTimerDisplay(timing), '+02:00');

  // 7. Resume at t2
  set((prev) => {
    const p = prev.studyPhases[workPhaseId];
    const updatedPauses = [...p.pauses];
    updatedPauses[0] = { ...updatedPauses[0], resumedAt: new Date(t2).toISOString() };
    return {
      studyPhases: {
        ...prev.studyPhases,
        [workPhaseId]: {
          ...p,
          pauses: updatedPauses,
        },
      },
    };
  });

  // 8. Verify overtime continues from the previous value 1 minute after resume (t3 = t2 + 1m)
  const t3 = t2 + 60 * 1000;
  timing = calculatePhaseTiming(get().studyPhases[workPhaseId], t3);
  assert.equal(timing.isPaused, false);
  assert.equal(timing.activeElapsedSeconds, 1680); // 28 minutes
  assert.equal(timing.overtimeSeconds, 180); // 3 minutes of overtime
  assert.equal(formatTimerDisplay(timing), '+03:00');

  // 9. Simulate app refresh / restart: call initOrResumeStudyState
  get().initOrResumeStudyState();

  // 10. Verify the same phase and timer state are restored
  assert.equal(get().activeStudyPhaseId, workPhaseId);
  assert.equal(get().studyWorkflowStep, 'work');
  timing = calculatePhaseTiming(get().studyPhases[get().activeStudyPhaseId], t3);
  assert.equal(timing.activeElapsedSeconds, 1680);
  assert.equal(formatTimerDisplay(timing), '+03:00');

  // 11. Click "Next: Recall"
  await get().advanceToRecall();

  // 12. Verify exactly one Work phase exit and one Recall phase start
  s = get();
  assert.equal(s.studyWorkflowStep, 'recall');
  const finishedWork = s.studyPhases[workPhaseId];
  assert.equal(finishedWork.status, 'completed');
  assert.ok(finishedWork.endedAt);

  const newRecallPhase = s.studyPhases[s.activeStudyPhaseId];
  assert.equal(newRecallPhase.phaseType, 'recall');
  assert.equal(newRecallPhase.status, 'in_progress');
  assert.ok(newRecallPhase.startedAt);
  assert.equal(newRecallPhase.endedAt, null);
});

test('studyIntegration - Zero regression on existing Stronger models', async () => {
  const { get } = createMockHarness();

  // Verify dailyLogs, tasks, and earnings are unaffected by Study Mode actions
  await get().startStudySession('Testing regression');
  await get().startWorkBlock({ plannedOutcome: 'Test' });
  await get().advanceToRecall();
  await get().saveRecallAndStartBreak({ done: 'Done', next: 'Next', focus: 5 });
  await get().endStudySession();

  const s = get();
  assert.equal(s.dailyLogs['2026-10-14'].highlight, 'Unchanged');
  assert.equal(s.tasks['2026-10-14'].length, 1);
  assert.equal(s.tasks['2026-10-14'][0].name, 'Task 1');
  assert.equal(s.earnings['2026-10-14'].R_calc, 1000);
});
