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

export function getEisenhowerQuadrant(importance = 'Medium', urgency = 'Medium') {
  const isHighImp = String(importance).toLowerCase() === 'high';
  const isHighUrg = String(urgency).toLowerCase() === 'high';

  if (isHighImp && isHighUrg) return QUADRANTS.do_now;
  if (isHighImp && !isHighUrg) return QUADRANTS.schedule;
  if (!isHighImp && isHighUrg) return QUADRANTS.delegate;
  return QUADRANTS.someday;
}

export function isTaskOverdue(task) {
  if (!task.deadline || task.status === 'finished' || task.status === 'cancelled') return false;
  try {
    const d = new Date(task.deadline);
    return new Date() > d;
  } catch (e) {
    return false;
  }
}

export function isTaskDueSoon(task, daysThreshold = 7) {
  if (!task.deadline || task.status === 'finished' || task.status === 'cancelled') return false;
  try {
    const d = new Date(task.deadline);
    const now = new Date();
    const futureLimit = addDays(now, daysThreshold);
    return d >= startOfDay(now) && d <= futureLimit;
  } catch (e) {
    return false;
  }
}

export function filterTasks(taskList = [], { filter = 'all', category = 'all', priority = 'all', search = '' }) {
  const query = search.trim().toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  return taskList.filter((t) => {
    if (t.status === 'cancelled' || t.status === 'finished' || t.isCoreDiscipline || t.coreDisciplineId) return false;
    const taskDate = t.logDate || t.plannedDate;
    if (taskDate && taskDate < todayStr) return false;

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
      return (t.urgency || 'Medium').toLowerCase() === 'high';
    }
    if (filter === 'important_urgent') {
      return (t.importance || 'Medium').toLowerCase() === 'high' && (t.urgency || 'Medium').toLowerCase() === 'high';
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
