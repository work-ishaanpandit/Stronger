import { isAfter, parseISO, addDays, startOfDay } from 'date-fns';

export const QUADRANTS = {
  do_now: {
    key: 'do_now',
    label: 'Do Now',
    subtitle: 'Important & Urgent',
    emoji: '🔴',
    color: 'var(--red)',
    bg: 'rgba(255, 69, 58, 0.08)',
    border: 'rgba(255, 69, 58, 0.25)',
  },
  schedule: {
    key: 'schedule',
    label: 'Schedule',
    subtitle: 'Important, Not Urgent',
    emoji: '🟡',
    color: 'var(--orange)',
    bg: 'rgba(255, 159, 10, 0.08)',
    border: 'rgba(255, 159, 10, 0.25)',
  },
  delegate: {
    key: 'delegate',
    label: 'Quick Action',
    subtitle: 'Not Important, Urgent',
    emoji: '🟠',
    color: 'var(--purple)',
    bg: 'rgba(191, 90, 242, 0.08)',
    border: 'rgba(191, 90, 242, 0.25)',
  },
  someday: {
    key: 'someday',
    label: 'Someday',
    subtitle: 'Not Important, Not Urgent',
    emoji: '⚪',
    color: 'var(--text-tertiary)',
    bg: 'rgba(255, 255, 255, 0.03)',
    border: 'var(--border)',
  },
};

export function getEisenhowerQuadrant(importance = 'Medium', urgency = 'Medium', task = null) {
  let isHighImp = String(importance).toLowerCase() === 'high';
  let isHighUrg = String(urgency).toLowerCase() === 'high';

  // Tasks with deadlines within a week (due soon or overdue) automatically become Urgent
  // If marked Important -> Do Now
  // If marked Not Important -> Quick Action (delegate)
  if (task && (isTaskDueSoon(task, 7) || isTaskOverdue(task))) {
    isHighUrg = true;
  }

  if (isHighImp && isHighUrg) return QUADRANTS.do_now;
  if (isHighImp && !isHighUrg) return QUADRANTS.schedule;
  if (!isHighImp && isHighUrg) return QUADRANTS.delegate;
  return QUADRANTS.someday;
}

export function isTaskOverdue(task) {
  if (!task || !task.deadline || task.status === 'finished' || task.status === 'cancelled') return false;
  try {
    const d = new Date(task.deadline);
    return new Date() > d;
  } catch (e) {
    return false;
  }
}

export function isTaskDueSoon(task, daysThreshold = 7) {
  if (!task || !task.deadline || task.status === 'finished' || task.status === 'cancelled') return false;
  try {
    const d = new Date(task.deadline);
    const now = new Date();
    const futureLimit = addDays(now, daysThreshold);
    return d >= startOfDay(now) && d <= futureLimit;
  } catch (e) {
    return false;
  }
}

/**
 * Returns deadline metrics with exact days left or days overdue.
 * @param {Object} task
 * @returns {{ label: string, isOverdue: boolean, days: number, isWithinWeek: boolean } | null}
 */
export function getDeadlineStatus(task) {
  if (!task || !task.deadline || task.status === 'finished' || task.status === 'cancelled') return null;
  try {
    const d = startOfDay(new Date(task.deadline));
    const now = startOfDay(new Date());
    const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdue = Math.abs(diffDays);
      return {
        label: `${overdue} ${overdue === 1 ? 'day' : 'days'} overdue`,
        isOverdue: true,
        days: diffDays,
        isWithinWeek: true,
      };
    } else if (diffDays === 0) {
      return {
        label: 'Due today',
        isOverdue: false,
        days: 0,
        isWithinWeek: true,
      };
    } else if (diffDays <= 7) {
      return {
        label: `${diffDays} ${diffDays === 1 ? 'day' : 'days'} left`,
        isOverdue: false,
        days: diffDays,
        isWithinWeek: true,
      };
    } else {
      return {
        label: `${diffDays} days left`,
        isOverdue: false,
        days: diffDays,
        isWithinWeek: false,
      };
    }
  } catch (e) {
    return null;
  }
}

export function filterTasks(taskList = [], { filter = 'all', category = 'all', priority = 'all', search = '', coreDisciplines = [] }) {
  const query = search.trim().toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  return taskList.filter((t) => {
    if (t.status === 'cancelled' || t.status === 'finished') return false;
    if (t.isCoreDiscipline || t.coreDisciplineId || t.rolloverType === 'core_discipline') return false;
    if (coreDisciplines.some((cd) => cd.id === t.coreDisciplineId || (cd.name && t.name && cd.name.trim().toLowerCase() === t.name.trim().toLowerCase()))) return false;

    // Search query filter
    if (query) {
      const titleMatch = (t.name || t.title || '').toLowerCase().includes(query);
      const notesMatch = (t.notes || t.auditNotes || '').toLowerCase().includes(query);
      const tagMatch = (t.tag || '').toLowerCase().includes(query);
      if (!titleMatch && !notesMatch && !tagMatch) return false;
    }

    // Category / Tag filter
    if (category !== 'all' && t.tag !== category) return false;

    // Priority filter
    if (priority !== 'all' && (t.priority || 'Medium').toLowerCase() !== priority.toLowerCase()) return false;

    // Primary Tab/Status filter
    if (filter === 'inbox') {
      return !t.logDate && !t.plannedDate;
    }
    if (filter === 'today') {
      return t.logDate === todayStr || t.plannedDate === todayStr;
    }
    if (filter === 'overdue') {
      return isTaskOverdue(t);
    }
    if (filter === 'due_week') {
      return isTaskDueSoon(t, 7);
    }
    if (filter === 'completed') {
      return t.status === 'finished';
    }
    if (filter === 'important') {
      return (t.importance || 'Medium').toLowerCase() === 'high';
    }
    if (filter === 'urgent') {
      return (t.urgency || 'Medium').toLowerCase() === 'high' || isTaskDueSoon(t, 7) || isTaskOverdue(t);
    }
    if (filter === 'important_urgent') {
      const isHighImp = (t.importance || 'Medium').toLowerCase() === 'high';
      const isHighUrg = (t.urgency || 'Medium').toLowerCase() === 'high' || isTaskDueSoon(t, 7) || isTaskOverdue(t);
      return isHighImp && isHighUrg;
    }

    return true;
  });
}

export function sortTasks(taskList = [], sortBy = 'created', sortAsc = false) {
  const copy = [...taskList];
  const priorityWeight = { high: 3, medium: 2, low: 1 };

  return copy.sort((a, b) => {
    let result = 0;
    if (sortBy === 'deadline') {
      const dateA = a.deadline ? new Date(a.deadline).getTime() : 9999999999999;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : 9999999999999;
      result = dateA - dateB;
    } else if (sortBy === 'priority') {
      const wA = priorityWeight[(a.priority || 'medium').toLowerCase()] || 2;
      const wB = priorityWeight[(b.priority || 'medium').toLowerCase()] || 2;
      result = wB - wA;
    } else if (sortBy === 'importance') {
      const wA = priorityWeight[(a.importance || 'medium').toLowerCase()] || 2;
      const wB = priorityWeight[(b.importance || 'medium').toLowerCase()] || 2;
      result = wB - wA;
    } else if (sortBy === 'urgency') {
      const wA = priorityWeight[(a.urgency || 'medium').toLowerCase()] || 2;
      const wB = priorityWeight[(b.urgency || 'medium').toLowerCase()] || 2;
      result = wB - wA;
    } else if (sortBy === 'weight') {
      result = (b.weight || 1) - (a.weight || 1);
    } else {
      // Default: created date
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      result = timeB - timeA;
    }

    return sortAsc ? -result : result;
  });
}
