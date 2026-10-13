import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePhaseTiming,
  calculatePausedTime,
  formatDuration,
  formatTimerDisplay,
  validateFocusRating,
  calculateRecallCompleteness,
  evaluateBlockStatus,
} from '../src/engine/studyTimer.js';

test('studyTimer - formatting durations', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(59), '00:59');
  assert.equal(formatDuration(60), '01:00');
  assert.equal(formatDuration(1500), '25:00');
  assert.equal(formatDuration(3665), '1:01:05');
});

test('studyTimer - countdown calculation before expiry', () => {
  const startedAt = '2026-10-14T10:00:00.000Z';
  const nowMs = new Date('2026-10-14T10:10:00.000Z').getTime(); // 10 minutes in (600s)
  const phase = {
    startedAt,
    targetDuration: 1500, // 25 minutes
    pauses: [],
  };

  const result = calculatePhaseTiming(phase, nowMs);
  assert.equal(result.activeElapsedSeconds, 600);
  assert.equal(result.remainingSeconds, 900); // 15 minutes remaining
  assert.equal(result.overtimeSeconds, 0);
  assert.equal(result.isOvertime, false);
  assert.equal(result.isPaused, false);
  assert.equal(formatTimerDisplay(result), '15:00');
});

test('studyTimer - overtime calculation after expiry', () => {
  const startedAt = '2026-10-14T10:00:00.000Z';
  const nowMs = new Date('2026-10-14T10:26:30.000Z').getTime(); // 26m 30s in (1590s)
  const phase = {
    startedAt,
    targetDuration: 1500, // 25 minutes
    pauses: [],
  };

  const result = calculatePhaseTiming(phase, nowMs);
  assert.equal(result.activeElapsedSeconds, 1590);
  assert.equal(result.remainingSeconds, 0);
  assert.equal(result.overtimeSeconds, 90); // 1m 30s in overtime
  assert.equal(result.isOvertime, true);
  assert.equal(formatTimerDisplay(result), '+01:30');
});

test('studyTimer - pause freezes active elapsed time and excludes paused duration', () => {
  const startedAt = '2026-10-14T10:00:00.000Z';
  // User worked 10m (until 10:10), paused from 10:10 to 10:14 (4m pause), resumed at 10:14.
  // Current time is 10:20 (6 minutes after resume). Total active = 10m + 6m = 16m = 960s.
  const pauses = [
    {
      pausedAt: '2026-10-14T10:10:00.000Z',
      resumedAt: '2026-10-14T10:14:00.000Z',
    },
  ];
  const nowMs = new Date('2026-10-14T10:20:00.000Z').getTime(); // 20m wall-clock elapsed
  const phase = {
    startedAt,
    targetDuration: 1500,
    pauses,
  };

  const result = calculatePhaseTiming(phase, nowMs);
  assert.equal(result.wallClockSeconds, 1200); // 20 minutes wall-clock
  assert.equal(result.activeElapsedSeconds, 960); // 16 minutes active
  assert.equal(result.remainingSeconds, 540); // 9 minutes remaining
  assert.equal(result.isPaused, false);
});

test('studyTimer - currently active pause stays frozen', () => {
  const startedAt = '2026-10-14T10:00:00.000Z';
  // User worked 10m, paused at 10:10:00. Current time is 10:30:00 (still paused).
  const pauses = [
    {
      pausedAt: '2026-10-14T10:10:00.000Z',
      resumedAt: null,
    },
  ];
  const nowMs = new Date('2026-10-14T10:30:00.000Z').getTime();
  const phase = {
    startedAt,
    targetDuration: 1500,
    pauses,
  };

  const result = calculatePhaseTiming(phase, nowMs);
  assert.equal(result.isPaused, true);
  assert.equal(result.activeElapsedSeconds, 600); // exactly 10 minutes active
  assert.equal(result.remainingSeconds, 900); // exactly 15 minutes remaining
  assert.equal(result.wallClockSeconds, 1800); // 30 minutes wall-clock
});

test('studyTimer - pause in overtime freezes overtime duration', () => {
  const startedAt = '2026-10-14T10:00:00.000Z';
  // Target is 1500s (25m). User ran to 26m (10:26), 1m of overtime.
  // Paused at 10:26:00, still paused at 10:40:00.
  const pauses = [
    {
      pausedAt: '2026-10-14T10:26:00.000Z',
      resumedAt: null,
    },
  ];
  const nowMs = new Date('2026-10-14T10:40:00.000Z').getTime();
  const phase = {
    startedAt,
    targetDuration: 1500,
    pauses,
  };

  const result = calculatePhaseTiming(phase, nowMs);
  assert.equal(result.isPaused, true);
  assert.equal(result.isOvertime, true);
  assert.equal(result.activeElapsedSeconds, 1560); // exactly 26 minutes active
  assert.equal(result.overtimeSeconds, 60); // exactly 1 minute overtime frozen
  assert.equal(formatTimerDisplay(result), '+01:00');
});

test('studyTimer - focus rating validation', () => {
  assert.equal(validateFocusRating(1), 1);
  assert.equal(validateFocusRating(3), 3);
  assert.equal(validateFocusRating(5), 5);
  assert.equal(validateFocusRating('4'), 4);
  assert.equal(validateFocusRating(0), null);
  assert.equal(validateFocusRating(6), null);
  assert.equal(validateFocusRating(-1), null);
  assert.equal(validateFocusRating('abc'), null);
  assert.equal(validateFocusRating(null), null);
  assert.equal(validateFocusRating(undefined), null);
});

test('studyTimer - recall completeness assessment', () => {
  assert.equal(calculateRecallCompleteness('Solved proof', 'Review chapter 4'), 'complete');
  assert.equal(calculateRecallCompleteness('Solved proof', ''), 'missing_fields');
  assert.equal(calculateRecallCompleteness('', 'Review chapter 4'), 'missing_fields');
  assert.equal(calculateRecallCompleteness('', ''), 'not_recorded');
  assert.equal(calculateRecallCompleteness(null, null), 'not_recorded');
});

test('studyTimer - block status evaluation', () => {
  const block = { id: 'b1', status: 'in_progress' };
  const phasesCompleted = [
    { phaseType: 'work', status: 'completed' },
    { phaseType: 'recall', status: 'completed' },
  ];
  assert.equal(evaluateBlockStatus(block, phasesCompleted), 'completed');

  const phasesInterruptedWork = [
    { phaseType: 'work', status: 'interrupted' },
  ];
  assert.equal(evaluateBlockStatus(block, phasesInterruptedWork), 'incomplete');

  const blockInterrupted = { id: 'b2', status: 'interrupted' };
  assert.equal(evaluateBlockStatus(blockInterrupted, phasesCompleted), 'interrupted');
});
