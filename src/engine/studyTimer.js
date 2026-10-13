/**
 * Study Mode Deterministic Timer Engine & State Utilities
 * 
 * Normative specs from PRD Section 6:
 * - Driven strictly by persisted timestamps and pause intervals, not interval counters.
 * - Remaining = max(T - E, 0)
 * - Overtime  = max(E - T, 0)
 * - Expiry NEVER changes phase automatically.
 * - Wall-clock time vs Active elapsed time (pauses strictly excluded).
 */

export const PHASE_CONFIG = {
  work: {
    type: 'work',
    name: 'Work Block',
    targetDuration: 1500, // 25 minutes
    nextPhase: 'recall',
  },
  recall: {
    type: 'recall',
    name: 'Active Recall',
    targetDuration: 60, // 1 minute
    nextPhase: 'break',
  },
  break: {
    type: 'break',
    name: 'Break',
    targetDuration: 300, // 5 minutes
    nextPhase: 'plan',
  },
};

/**
 * Calculates total paused milliseconds for a phase.
 * @param {Array<{ pausedAt: string, resumedAt: string | null }>} pauses 
 * @param {number} referenceTimeMs Current timestamp or phase end timestamp in ms
 * @returns {{ totalPausedMs: number, isCurrentlyPaused: boolean }}
 */
export function calculatePausedTime(pauses = [], referenceTimeMs = Date.now()) {
  let totalPausedMs = 0;
  let isCurrentlyPaused = false;

  for (const pause of pauses) {
    if (!pause || !pause.pausedAt) continue;
    const pauseStart = new Date(pause.pausedAt).getTime();
    if (isNaN(pauseStart)) continue;

    if (pause.resumedAt) {
      const pauseEnd = new Date(pause.resumedAt).getTime();
      if (!isNaN(pauseEnd) && pauseEnd > pauseStart) {
        totalPausedMs += Math.max(0, pauseEnd - pauseStart);
      }
    } else {
      // Pause is currently open
      isCurrentlyPaused = true;
      if (referenceTimeMs > pauseStart) {
        totalPausedMs += Math.max(0, referenceTimeMs - pauseStart);
      }
    }
  }

  return { totalPausedMs, isCurrentlyPaused };
}

/**
 * Calculates deterministic timing metrics for a given phase record.
 * 
 * @param {Object} phase Phase record
 * @param {string} phase.startedAt ISO timestamp string
 * @param {string|null} phase.endedAt ISO timestamp string if ended
 * @param {number} phase.targetDuration Target duration in seconds
 * @param {Array} phase.pauses Array of { pausedAt, resumedAt }
 * @param {number} [nowMs] Optional override timestamp for testing
 * @returns {Object} Timing metrics
 */
export function calculatePhaseTiming(phase, nowMs = Date.now()) {
  if (!phase || !phase.startedAt) {
    return {
      activeElapsedSeconds: 0,
      remainingSeconds: phase?.targetDuration || 0,
      overtimeSeconds: 0,
      isOvertime: false,
      isPaused: false,
      wallClockSeconds: 0,
      targetDuration: phase?.targetDuration || 0,
    };
  }

  const startTime = new Date(phase.startedAt).getTime();
  const endTime = phase.endedAt ? new Date(phase.endedAt).getTime() : nowMs;
  const targetDuration = phase.targetDuration || 0;

  const effectiveEnd = Math.max(startTime, endTime);
  const wallClockMs = effectiveEnd - startTime;

  const { totalPausedMs, isCurrentlyPaused } = calculatePausedTime(phase.pauses || [], effectiveEnd);

  // Active elapsed time excludes all paused durations
  const activeElapsedMs = Math.max(0, wallClockMs - totalPausedMs);
  const activeElapsedSeconds = Math.floor(activeElapsedMs / 1000);
  const wallClockSeconds = Math.floor(wallClockMs / 1000);

  const remainingSeconds = Math.max(0, targetDuration - activeElapsedSeconds);
  const overtimeSeconds = Math.max(0, activeElapsedSeconds - targetDuration);
  const isOvertime = activeElapsedSeconds >= targetDuration;

  return {
    activeElapsedSeconds,
    remainingSeconds,
    overtimeSeconds,
    isOvertime,
    isPaused: phase.endedAt ? false : isCurrentlyPaused,
    wallClockSeconds,
    targetDuration,
  };
}

/**
 * Formats a duration in seconds into MM:SS or HH:MM:SS string.
 * @param {number} totalSeconds 
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats timer display string based on countdown or overtime state.
 * @param {Object} timingResult Result from calculatePhaseTiming
 * @returns {string} e.g. "25:00", "04:12", "+00:35", "+03:12"
 */
export function formatTimerDisplay(timingResult) {
  if (!timingResult) return '00:00';
  if (timingResult.isOvertime) {
    return `+${formatDuration(timingResult.overtimeSeconds)}`;
  }
  return formatDuration(timingResult.remainingSeconds);
}

/**
 * Validates focus rating input.
 * Accepts 1, 2, 3, 4, 5, or null/undefined.
 * @param {any} val 
 * @returns {number|null}
 */
export function validateFocusRating(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (Number.isInteger(num) && num >= 1 && num <= 5) {
    return num;
  }
  return null;
}

/**
 * Calculates recall completeness based on actual outcome and next action.
 * @param {string|null} actualOutcome 
 * @param {string|null} nextAction 
 * @returns {'complete'|'missing_fields'|'not_recorded'}
 */
export function calculateRecallCompleteness(actualOutcome, nextAction) {
  const hasOutcome = Boolean(actualOutcome && actualOutcome.trim().length > 0);
  const hasNext = Boolean(nextAction && nextAction.trim().length > 0);

  if (hasOutcome && hasNext) return 'complete';
  if (hasOutcome || hasNext) return 'missing_fields';
  return 'not_recorded';
}

/**
 * Evaluates block completion status.
 * Completion rule: A block is completed when its Work phase was exited and recall phase ended.
 * Incomplete blocks may still have been stopped early or have missing recall.
 * 
 * @param {Object} block 
 * @param {Array} phases 
 * @returns {'completed'|'incomplete'|'interrupted'}
 */
export function evaluateBlockStatus(block, phases = []) {
  if (!block) return 'interrupted';
  if (block.status === 'interrupted') return 'interrupted';

  const workPhase = phases.find((p) => p.phaseType === 'work');
  const recallPhase = phases.find((p) => p.phaseType === 'recall');

  // If Work phase never completed (e.g. ended during work) -> incomplete / interrupted
  if (!workPhase || workPhase.status !== 'completed') {
    return 'incomplete';
  }

  // Work phase completed: block status depends on recall
  if (recallPhase && recallPhase.status === 'completed') {
    return 'completed';
  }

  return 'incomplete';
}
