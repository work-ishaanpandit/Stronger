/**
 * STRONGER ROLLOVER ENGINE
 * Handles task carry-forward logic between days (PRD Section 4.3).
 *
 * Rules:
 *   - Partly Done   → Yellow badge, weight decays: W_new = (W * Remaining%) * (0.9^n)
 *   - Postponed     → Red badge "Delayed", carries original_date + delay_count
 *   - Core Disciplines → Auto-injected fresh each new day (no decay)
 */

import { format, addDays } from 'date-fns';

export const ROLLOVER_TYPE = {
  PARTLY_DONE: 'partly_done_rollover',
  POSTPONED: 'postponed_rollover',
  CORE: 'core_discipline',
};

/**
 * Given today's finalized tasks, generate the rolled-over tasks for tomorrow.
 * @param {Array} tasks - Completed/evaluated tasks from day T
 * @param {string} targetDate - ISO date string for the day receiving rolled tasks
 * @returns {Array} New task objects to inject into targetDate's list
 */
export function generateRollovers(tasks, targetDate) {
  const rollovers = [];

  for (const task of tasks) {
    // ── Partly Done rollover ────────────────────────────────────────────
    if (task.status === 'partly_done' && task.type === 'normal') {
      const remaining = 1 - (task.completionPercentage ?? 0);
      const n = (task.delayCount ?? 0) + 1;
      const W_new = (task.weight ?? 1) * remaining * Math.pow(0.9, n);

      rollovers.push({
        ...baseRollover(task, targetDate),
        weight: round2(W_new),
        completionPercentage: 0,
        delayCount: n,
        rolloverType: ROLLOVER_TYPE.PARTLY_DONE,
        rolloverBadge: 'yellow',
        status: 'missed', // Reset for new day
      });
    }

    // ── Postponed Tomorrow rollover ──────────────────────────────────────
    if (task.status === 'postponed_tomorrow') {
      rollovers.push({
        ...baseRollover(task, targetDate),
        delayCount: (task.delayCount ?? 0) + 1,
        rolloverType: ROLLOVER_TYPE.POSTPONED,
        rolloverBadge: 'red',
        status: 'missed',
      });
    }

    // ── Postponed Later rollover (only inject on the target date) ────────
    if (task.status === 'postponed_later' && task.postponedToDate === targetDate) {
      rollovers.push({
        ...baseRollover(task, targetDate),
        delayCount: (task.delayCount ?? 0) + 1,
        rolloverType: ROLLOVER_TYPE.POSTPONED,
        rolloverBadge: 'red',
        status: 'missed',
      });
    }
  }

  return rollovers;
}

/**
 * Inject Core Disciplines into a new day (no decay, fresh slate).
 * @param {Array} disciplines - Array of core discipline definitions
 * @param {string} date - ISO date string for the target day
 * @returns {Array} Task objects ready to be added to the day
 */
export function injectCoreDisciplines(disciplines, date) {
  return disciplines
    .filter((d) => d.active)
    .map((d) => ({
      id: crypto.randomUUID(),
      logDate: date,
      originalDate: date,
      name: d.name,
      tag: d.tag ?? null,
      type: d.type ?? 'normal',
      weight: d.weight ?? 1,
      damage: d.damage ?? 0,
      recurrence: d.recurrence ?? 'daily',
      status: 'missed',
      completionPercentage: 0,
      hasBonus: false,
      delayCount: 0,
      rolloverType: ROLLOVER_TYPE.CORE,
      rolloverBadge: null,
      isCoreDiscipline: true,
      coreDisciplineId: d.id, // Link back to the discipline definition
      timeBlockEnabled: false,
      timeBlockStart: null,
      timeBlockEnd: null,
      auditNotes: '',
      calendarSync: false,
      gcalEventId: null,
    }));
}

/**
 * Determines if a date is editable (T or T-1 only).
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {boolean}
 */
export function isDateEditable(dateStr) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
  return dateStr === today || dateStr === yesterday;
}

/**
 * Determines day log status for Chronicle color coding.
 * @param {Object} log - daily_log record (may be null/undefined)
 * @param {Array} tasks - tasks for that day
 * @returns {'green'|'yellow'|'red'|'empty'}
 */
export function getDayStatus(log, tasks) {
  if (!log) return 'empty';
  const hasAlpha = !!log.highlight || tasks.length > 0;
  const hasOmega = !!log.reflection || !!log.learnedNotes;

  if (hasAlpha && hasOmega) return 'green';
  if (hasAlpha && !hasOmega) return 'yellow';
  return 'red';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function baseRollover(task, targetDate) {
  return {
    id: crypto.randomUUID(),
    logDate: targetDate,
    originalDate: task.originalDate ?? task.logDate,
    name: task.name,
    tag: task.tag,
    type: task.type,
    weight: task.weight,
    damage: task.damage,
    recurrence: task.recurrence,
    hasBonus: task.hasBonus ?? false,
    timeBlockEnabled: false,
    timeBlockStart: null,
    timeBlockEnd: null,
    auditNotes: '',
    calendarSync: false,
    gcalEventId: null,
    postponedToDate: null,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
