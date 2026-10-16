import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudySlice } from '../src/store/studySlice.js';

// Minimal mock of zustand set/get store harness
function createMockStore() {
  let state = {};
  const set = (updater) => {
    const next = typeof updater === 'function' ? updater(state) : updater;
    state = { ...state, ...next };
  };
  const get = () => state;

  const slice = createStudySlice(set, get);
  state = { ...slice };
  return { get, set };
}

test('studySlice - startStudySession creates session and initial block', async () => {
  const { get } = createMockStore();
  await get().startStudySession('Brain dump thoughts here');

  const s = get();
  assert.ok(s.activeStudySessionId);
  assert.ok(s.activeStudyBlockId);
  assert.equal(s.studyWorkflowStep, 'plan');

  const session = s.studySessions[s.activeStudySessionId];
  assert.equal(session.brainDump, 'Brain dump thoughts here');
  assert.equal(session.status, 'active');

  const block = s.studyBlocks[s.activeStudyBlockId];
  assert.equal(block.sequenceNumber, 1);
  assert.equal(block.status, 'planned');
});

test('studySlice - startWorkBlock requires planned outcome', async () => {
  const { get } = createMockStore();
  await get().startStudySession();

  await assert.rejects(
    async () => {
      await get().startWorkBlock({ course: 'CS101', topic: 'Algorithms', plannedOutcome: '' });
    },
    { message: 'Planned outcome is required before starting work' }
  );

  await get().startWorkBlock({
    course: 'CS101',
    topic: 'Algorithms',
    plannedOutcome: 'Solve binary search tree problems',
  });

  const s = get();
  assert.equal(s.studyWorkflowStep, 'work');
  assert.ok(s.activeStudyPhaseId);

  const phase = s.studyPhases[s.activeStudyPhaseId];
  assert.equal(phase.phaseType, 'work');
  assert.equal(phase.targetDuration, 1500);
  assert.equal(phase.status, 'in_progress');

  const block = s.studyBlocks[s.activeStudyBlockId];
  assert.equal(block.plannedOutcome, 'Solve binary search tree problems');
  assert.equal(block.course, 'CS101');
  assert.equal(block.topic, 'Algorithms');
});

test('studySlice - pause and resume phase records intervals', async () => {
  const { get } = createMockStore();
  await get().startStudySession();
  await get().startWorkBlock({ plannedOutcome: 'Proof of theorem' });

  let phase = get().studyPhases[get().activeStudyPhaseId];
  assert.equal(phase.pauses.length, 0);

  // Pause
  await get().pauseActivePhase();
  phase = get().studyPhases[get().activeStudyPhaseId];
  assert.equal(phase.pauses.length, 1);
  assert.ok(phase.pauses[0].pausedAt);
  assert.equal(phase.pauses[0].resumedAt, null);

  // Resume
  await get().resumeActivePhase();
  phase = get().studyPhases[get().activeStudyPhaseId];
  assert.equal(phase.pauses.length, 1);
  assert.ok(phase.pauses[0].resumedAt);
});

test('studySlice - advanceToRecall transitions work to recall', async () => {
  const { get } = createMockStore();
  await get().startStudySession();
  await get().startWorkBlock({ plannedOutcome: 'Proof of theorem' });

  const workPhaseId = get().activeStudyPhaseId;
  await get().advanceToRecall();

  const s = get();
  assert.equal(s.studyWorkflowStep, 'recall');
  assert.notEqual(s.activeStudyPhaseId, workPhaseId);

  const oldWorkPhase = s.studyPhases[workPhaseId];
  assert.equal(oldWorkPhase.status, 'completed');
  assert.ok(oldWorkPhase.endedAt);

  const recallPhase = s.studyPhases[s.activeStudyPhaseId];
  assert.equal(recallPhase.phaseType, 'recall');
  assert.equal(recallPhase.targetDuration, 60);
  assert.equal(recallPhase.status, 'in_progress');
});

test('studySlice - saveRecallAndStartBreak flags completeness and starts break', async () => {
  const { get } = createMockStore();
  await get().startStudySession();
  await get().startWorkBlock({ plannedOutcome: 'Proof of theorem' });
  await get().advanceToRecall();

  const recallPhaseId = get().activeStudyPhaseId;
  const blockId = get().activeStudyBlockId;

  await get().saveRecallAndStartBreak({
    done: 'Proved the lemma successfully',
    next: 'Move to corollary 2',
    focus: 4,
  });

  const s = get();
  assert.equal(s.studyWorkflowStep, 'break');

  const oldRecallPhase = s.studyPhases[recallPhaseId];
  assert.equal(oldRecallPhase.status, 'completed');

  const breakPhase = s.studyPhases[s.activeStudyPhaseId];
  assert.equal(breakPhase.phaseType, 'break');
  assert.equal(breakPhase.targetDuration, 300);

  const block = s.studyBlocks[blockId];
  assert.equal(block.actualOutcome, 'Proved the lemma successfully');
  assert.equal(block.nextAction, 'Move to corollary 2');
  assert.equal(block.focusRating, 4);
  assert.equal(block.recallCompleteness, 'complete');
  assert.equal(block.status, 'completed');
});

test('studySlice - returnToPlan creates next block sequence', async () => {
  const { get } = createMockStore();
  await get().startStudySession();
  await get().startWorkBlock({ course: 'Bio', topic: 'Genetics', plannedOutcome: 'Mendelian rules' });
  await get().advanceToRecall();
  await get().saveRecallAndStartBreak({ done: 'Finished punnett squares', next: 'Dihybrid crosses', focus: 5 });

  const breakPhaseId = get().activeStudyPhaseId;
  const firstBlockId = get().activeStudyBlockId;

  await get().returnToPlan();

  const s = get();
  assert.equal(s.studyWorkflowStep, 'plan');
  assert.notEqual(s.activeStudyBlockId, firstBlockId);

  const breakPhase = s.studyPhases[breakPhaseId];
  assert.equal(breakPhase.status, 'completed');

  const nextBlock = s.studyBlocks[s.activeStudyBlockId];
  assert.equal(nextBlock.sequenceNumber, 2);
  assert.equal(nextBlock.course, 'Bio');
  assert.equal(nextBlock.topic, 'Genetics');
  assert.equal(nextBlock.status, 'planned');
});

test('studySlice - endStudySession preserves partial blocks and opens summary', async () => {
  const { get } = createMockStore();
  await get().startStudySession('Thoughts before stopping');
  await get().startWorkBlock({ plannedOutcome: 'First task' });

  const sessionId = get().activeStudySessionId;
  const blockId = get().activeStudyBlockId;
  const phaseId = get().activeStudyPhaseId;

  await get().endStudySession('interrupted');

  const s = get();
  assert.equal(s.studyWorkflowStep, 'summary');
  assert.equal(s.activeStudySessionId, null);

  const session = s.studySessions[sessionId];
  assert.equal(session.status, 'interrupted');
  assert.ok(session.endedAt);

  const block = s.studyBlocks[blockId];
  assert.equal(block.status, 'interrupted');

  const phase = s.studyPhases[phaseId];
  assert.equal(phase.status, 'interrupted');
  assert.ok(phase.endedAt);
});

test('studySlice - editHistoricalBlock creates audit revision record and does not modify timing', async () => {
  const { get } = createMockStore();
  await get().startStudySession();
  await get().startWorkBlock({ plannedOutcome: 'Original plan' });
  await get().advanceToRecall();
  await get().saveRecallAndStartBreak({ done: 'Original done', next: 'Original next', focus: 3 });

  const blockId = get().activeStudyBlockId;
  const originalBlock = get().studyBlocks[blockId];

  const res = await get().editHistoricalBlock(blockId, {
    topic: 'New Topic',
    focusRating: 5,
  });

  assert.equal(res.success, true);
  const updatedBlock = get().studyBlocks[blockId];
  assert.equal(updatedBlock.topic, 'New Topic');
  assert.equal(updatedBlock.focusRating, 5);

  const revs = get().studyRevisions[blockId];
  assert.ok(revs);
  assert.equal(revs.length, 2);

  const topicRev = revs.find((r) => r.fieldName === 'topic');
  assert.ok(topicRev);
  assert.equal(topicRev.newValue, 'New Topic');

  const focusRev = revs.find((r) => r.fieldName === 'focusRating');
  assert.ok(focusRev);
  assert.equal(focusRev.previousValue, '3');
  assert.equal(focusRev.newValue, '5');
});

test('studySlice - sound alert toggle manages speaker state', () => {
  const { get } = createMockStore();
  assert.equal(get().studySoundAlertEnabled, true);

  get().toggleStudySoundAlert();
  assert.equal(get().studySoundAlertEnabled, false);

  get().toggleStudySoundAlert();
  assert.equal(get().studySoundAlertEnabled, true);

  get().setStudySoundAlert(false);
  assert.equal(get().studySoundAlertEnabled, false);
});
