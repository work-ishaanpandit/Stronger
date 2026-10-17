import test from 'node:test';
import assert from 'node:assert/strict';
import { getEisenhowerQuadrant, getDeadlineStatus, isTaskOverdue, isTaskDueSoon, filterTasks, QUADRANTS } from '../src/utils/eisenhower.js';
import { compileSynthesisContext, generateLocalSynthesis } from '../src/utils/aiSynthesisEngine.js';

test('Eisenhower deadline auto-movement', async (t) => {
  await t.test('Task due in 3 days with High importance moves to Do Now', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const deadlineStr = futureDate.toISOString().split('T')[0];

    const task = {
      id: 'task-1',
      name: 'Finish physics report',
      importance: 'High',
      urgency: 'Low', // initially marked low urgency
      deadline: deadlineStr,
      status: 'pending'
    };

    const q = getEisenhowerQuadrant(task.importance, task.urgency, task);
    assert.equal(q.key, 'do_now');
    assert.equal(q.label, 'Do Now');
  });

  await t.test('Task due in 5 days with Normal/Medium importance moves to Quick Action (delegate)', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const deadlineStr = futureDate.toISOString().split('T')[0];

    const task = {
      id: 'task-2',
      name: 'Send feedback email',
      importance: 'Medium',
      urgency: 'Low',
      deadline: deadlineStr,
      status: 'pending'
    };

    const q = getEisenhowerQuadrant(task.importance, task.urgency, task);
    assert.equal(q.key, 'delegate');
    assert.equal(q.label, 'Quick Action');
  });

  await t.test('Overdue task with Low importance moves to Quick Action (delegate)', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 2);
    const deadlineStr = pastDate.toISOString().split('T')[0];

    const task = {
      id: 'task-3',
      name: 'Renew subscription',
      importance: 'Low',
      urgency: 'Low',
      deadline: deadlineStr,
      status: 'pending'
    };

    const q = getEisenhowerQuadrant(task.importance, task.urgency, task);
    assert.equal(q.key, 'delegate');
    assert.equal(q.label, 'Quick Action');
  });

  await t.test('Task due in 14 days retains original schedule quadrant', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const deadlineStr = futureDate.toISOString().split('T')[0];

    const task = {
      id: 'task-4',
      name: 'Plan vacation',
      importance: 'High',
      urgency: 'Low',
      deadline: deadlineStr,
      status: 'pending'
    };

    const q = getEisenhowerQuadrant(task.importance, task.urgency, task);
    assert.equal(q.key, 'schedule');
    assert.equal(q.label, 'Schedule');
  });
});

test('getDeadlineStatus metrics and formatting', async (t) => {
  await t.test('Calculates exact days overdue', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 3);
    const deadlineStr = pastDate.toISOString().split('T')[0];

    const status = getDeadlineStatus({ deadline: deadlineStr, status: 'pending' });
    assert.ok(status);
    assert.equal(status.isOverdue, true);
    assert.equal(status.isWithinWeek, true);
    assert.equal(status.label, '3 days overdue');
  });

  await t.test('Calculates due today', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const status = getDeadlineStatus({ deadline: todayStr, status: 'pending' });
    assert.ok(status);
    assert.equal(status.isOverdue, false);
    assert.equal(status.isWithinWeek, true);
    assert.equal(status.label, 'Due today');
  });

  await t.test('Calculates exact days left within week', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 4);
    const deadlineStr = futureDate.toISOString().split('T')[0];

    const status = getDeadlineStatus({ deadline: deadlineStr, status: 'pending' });
    assert.ok(status);
    assert.equal(status.isOverdue, false);
    assert.equal(status.isWithinWeek, true);
    assert.equal(status.label, '4 days left');
  });
});

test('AI Synthesis Engine includes daily logs, study blocks, and task notes', async (t) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const mockStoreState = {
    dailyLogs: {
      [todayStr]: {
        highlight: 'Mastered Laplace transforms in engineering mathematics',
        reflection: 'Focused morning, but struggled with energy after lunch.',
        epiphany: 'Breaking proofs into micro-steps prevents overwhelm.'
      }
    },
    tasks: {
      [todayStr]: [
        {
          id: 'task-101',
          name: 'Chapter 4 problem set',
          status: 'finished',
          notes: 'Completed problems 1-12. Need to review problem 8 convergence test.',
          importance: 'High',
          urgency: 'High'
        }
      ]
    },
    studySessions: {
      'session-1': {
        id: 'session-1',
        course: 'Advanced Calculus',
        topic: 'Laplace Transforms',
        brainDump: 'Anxious about upcoming midterm. Need to understand transfer functions.',
        startedAt: new Date().toISOString(),
        blockIds: ['block-1']
      }
    },
    studyBlocks: {
      'block-1': {
        id: 'block-1',
        sessionId: 'session-1',
        blockNumber: 1,
        course: 'Advanced Calculus',
        topic: 'Laplace Transforms',
        plannedOutcome: 'Solve 5 ODE initial value problems using Laplace.',
        actualOutcome: 'Successfully solved all 5. Discovered shortcut for partial fractions.',
        nextAction: 'Practice inverse Laplace transforms on Monday.',
        focusRating: 5,
        totalWorkSeconds: 1500,
        totalRecallSeconds: 60,
        totalBreakSeconds: 300,
        status: 'completed',
        completedAt: new Date().toISOString()
      }
    }
  };

  const context1d = compileSynthesisContext(mockStoreState, '1d');
  assert.equal(context1d.studyBlocks.length, 1);
  assert.equal(context1d.studyBlocks[0].course, 'Advanced Calculus');
  assert.equal(context1d.studyBlocks[0].actualOutcome, 'Successfully solved all 5. Discovered shortcut for partial fractions.');
  assert.equal(context1d.tasks.length, 1);
  assert.ok(context1d.tasks[0].notes.includes('Completed problems 1-12'));
  assert.equal(context1d.logs.length, 1);
  assert.ok(context1d.logs[0].highlight.includes('Laplace transforms'));

  // Test local synthesis generation
  const synthesis = generateLocalSynthesis(context1d);
  assert.ok(synthesis);
  assert.ok(synthesis.title);
  assert.ok(synthesis.insight.length > 20);
  assert.ok(synthesis.score >= 0);
  assert.equal(synthesis.isLocalFallback, true);
});
