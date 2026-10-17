import { format, subDays, startOfDay, parseISO } from 'date-fns';

/**
 * Gathers and compiles all user data for AI synthesis across daily logs,
 * self study sessions, tasks, and task notes for a given time window.
 * 
 * @param {Object} storeState Zustand store state
 * @param {'daily' | 'weekly' | 'monthly'} timeView
 * @param {string} [referenceDateStr] Target date string (defaults to today)
 * @returns {Object} Compiled synthesis context
 */
export function compileSynthesisContext(storeState, timeView = 'weekly', referenceDateStr) {
  const today = referenceDateStr ? parseISO(referenceDateStr) : new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  let days = 1;
  if (timeView === 'weekly') days = 7;
  else if (timeView === 'monthly') days = 30;

  const startDateObj = subDays(startOfDay(today), days - 1);
  const startDateStr = format(startDateObj, 'yyyy-MM-dd');

  const {
    dailyLogs = {},
    tasks = {},
    studySessions = {},
    studyBlocks = {},
    studyPhases = {},
  } = storeState;

  // 1. Filter Daily Logs for the window
  const relevantLogs = [];
  Object.entries(dailyLogs).forEach(([date, log]) => {
    if (date >= startDateStr && date <= todayStr) {
      if (log.highlight || log.learnedNotes || log.reflection || log.epiphany) {
        relevantLogs.push({
          date,
          highlight: log.highlight || '',
          learnedNotes: log.learnedNotes || '',
          learnedSourceUrl: log.learnedSourceUrl || '',
          reflection: log.reflection || '',
          epiphany: log.epiphany || '',
        });
      }
    }
  });
  relevantLogs.sort((a, b) => b.date.localeCompare(a.date));

  // 2. Filter Tasks for the window (including task notes)
  const relevantTasks = [];
  Object.entries(tasks).forEach(([dKey, taskList]) => {
    (taskList || []).forEach((t) => {
      if (!t || t.status === 'cancelled') return;

      const taskDate = t.logDate || t.plannedDate || (dKey && /^\d{4}-\d{2}-\d{2}$/.test(dKey) ? dKey : null) || (t.createdAt ? t.createdAt.split('T')[0] : null);
      const isDateInRange = taskDate && taskDate >= startDateStr && taskDate <= todayStr;
      const isCompletedRecently = t.completedAt && t.completedAt.split('T')[0] >= startDateStr;
      const hasRecentDeadline = t.deadline && t.deadline.split('T')[0] >= startDateStr && t.deadline.split('T')[0] <= todayStr;

      // Include task if it was scheduled, completed, or active in this window
      if (isDateInRange || isCompletedRecently || hasRecentDeadline) {
        relevantTasks.push({
          id: t.id,
          name: t.name || t.title,
          status: t.status,
          date: taskDate || 'unassigned',
          tag: t.tag || '',
          type: t.type || 'normal',
          importance: t.importance || 'Medium',
          urgency: t.urgency || 'Medium',
          notes: t.notes || '', // Crucial: in-task notes
          auditNotes: t.auditNotes || '',
          deadline: t.deadline || null,
          completionPercentage: t.completionPercentage ?? (t.status === 'finished' || t.status === 'completed' ? 1 : 0),
        });
      }
    });
  });

  // 3. Filter Self Study Sessions & Blocks for the window
  const relevantSessions = [];
  const relevantBlocks = [];
  let totalStudyMinutes = 0;
  let totalFocusRating = 0;
  let focusRatingCount = 0;

  Object.values(studySessions).forEach((session) => {
    const sessionDate = session.date || (session.startedAt ? session.startedAt.split('T')[0] : (session.createdAt ? session.createdAt.split('T')[0] : null));
    if (sessionDate && sessionDate >= startDateStr && sessionDate <= todayStr) {
      relevantSessions.push({
        id: session.id,
        date: sessionDate,
        brainDump: session.brainDump || '',
        status: session.status,
      });

      // Find blocks belonging to this session
      const sessionBlocks = Object.values(studyBlocks).filter((b) => b.sessionId === session.id);
      sessionBlocks.forEach((block) => {
        // Calculate work duration from phases
        const blockPhases = Object.values(studyPhases).filter((p) => p.blockId === block.id);
        const workPhase = blockPhases.find((p) => p.phaseType === 'work');
        let workDurationMins = 25;
        if (workPhase?.targetDuration) {
          workDurationMins = Math.round(workPhase.targetDuration / 60);
        }
        totalStudyMinutes += workDurationMins;

        if (block.focusRating != null) {
          totalFocusRating += Number(block.focusRating);
          focusRatingCount += 1;
        }

        relevantBlocks.push({
          id: block.id,
          date: sessionDate,
          course: block.course || '',
          topic: block.topic || '',
          plannedOutcome: block.plannedOutcome || '',
          actualOutcome: block.actualOutcome || '', // Crucial: what was accomplished/learned in recall
          nextAction: block.nextAction || '',
          focusRating: block.focusRating || null,
          status: block.status,
          recallCompleteness: block.recallCompleteness || 'not_recorded',
          durationMinutes: workDurationMins,
        });
      });
    }
  });

  relevantBlocks.sort((a, b) => b.date.localeCompare(a.date));

  // Summary Metrics
  const completedTasksCount = relevantTasks.filter((t) => t.status === 'completed' || t.status === 'finished' || t.completionPercentage === 1).length;
  const missedTasksCount = relevantTasks.filter((t) => t.status === 'missed').length;
  const averageFocusRating = focusRatingCount > 0 ? (totalFocusRating / focusRatingCount).toFixed(1) : null;
  const coursesStudied = [...new Set(relevantBlocks.map((b) => b.course).filter(Boolean))];
  const topicsStudied = [...new Set(relevantBlocks.map((b) => b.topic).filter(Boolean))];

  return {
    timeView,
    days,
    startDateStr,
    endDateStr: todayStr,
    logs: relevantLogs,
    tasks: relevantTasks,
    studySessions: relevantSessions,
    studyBlocks: relevantBlocks,
    metrics: {
      totalTasks: relevantTasks.length,
      completedTasks: completedTasksCount,
      missedTasks: missedTasksCount,
      taskCompletionRate: relevantTasks.length > 0 ? Math.round((completedTasksCount / relevantTasks.length) * 100) : 0,
      totalStudySessions: relevantSessions.length,
      totalStudyBlocks: relevantBlocks.length,
      totalStudyHours: (totalStudyMinutes / 60).toFixed(1),
      averageFocusRating,
      coursesStudied,
      topicsStudied,
      totalLogs: relevantLogs.length,
    },
  };
}

/**
 * Builds a prompt for Gemini AI synthesizing logs, task notes, and study sessions.
 */
export function buildSynthesisPrompt(context) {
  const {
    timeView,
    days,
    startDateStr,
    endDateStr,
    logs,
    tasks,
    studySessions,
    studyBlocks,
    metrics,
  } = context;

  const periodLabel = timeView === 'daily' ? 'Past 24 Hours' : timeView === 'weekly' ? 'Past 7 Days' : 'Past 30 Days';

  return `
You are the personal AI executive coach and study analyst in "Stronger" — a high-performance discipline and learning OS.
Analyze the user's authentic performance data over the ${periodLabel} (${startDateStr} to ${endDateStr}).

Synthesize across three interconnected pillars:
1. DAILY LOGS & REFLECTIONS: What they prioritized (Highlights), what they learned, and their evening reflections/epiphanies.
2. SELF STUDY SESSIONS: Deep work blocks, topics tackled, pre-study brain dumps, recall takeaways (actual accomplishments), and focus ratings (1-5).
3. TASKS & IN-TASK NOTES: Planned commitments, task execution, task notes, and audit reasons for delays.

=== DATA SUMMARY ===
• Period: ${days} days (${startDateStr} to ${endDateStr})
• Tasks Planned/Active: ${metrics.totalTasks} (Completed: ${metrics.completedTasks}, Missed: ${metrics.missedTasks}, Completion Rate: ${metrics.taskCompletionRate}%)
• Study Sessions: ${metrics.totalStudySessions} sessions (${metrics.totalStudyBlocks} blocks, ~${metrics.totalStudyHours} hours)
• Average Study Focus Rating: ${metrics.averageFocusRating ? metrics.averageFocusRating + '/5' : 'No ratings recorded'}
• Courses/Topics Studied: ${metrics.topicsStudied.length > 0 ? metrics.topicsStudied.join(', ') : 'None recorded'}
• Daily Reflection Journals: ${metrics.totalLogs} days logged

=== SELF STUDY SESSIONS & WORK BLOCKS ===
${studySessions.length === 0 ? 'No self study sessions recorded in this period.' : studySessions.map(s => `
[Session Date: ${s.date}]
${s.brainDump ? `• Pre-Study Brain Dump: "${s.brainDump}"` : ''}
${studyBlocks.filter(b => b.date === s.date).map(b => `  - Block: ${b.course ? b.course + ' / ' : ''}${b.topic || 'Untitled'} (${b.durationMinutes}m, Status: ${b.status}, Focus: ${b.focusRating ? b.focusRating + '/5' : 'Unrated'})
    Planned: ${b.plannedOutcome || 'None'}
    Actual Accomplished / Learned: ${b.actualOutcome || 'Not recorded'}
    Next Action: ${b.nextAction || 'None'}`).join('\n')}
`).join('\n')}

=== TASKS & IN-TASK NOTES ===
${tasks.length === 0 ? 'No tasks recorded in this period.' : tasks.map(t => `
• [${t.date}] ${t.name} (Status: ${t.status}${t.tag ? ', #' + t.tag : ''})
  ${t.notes ? `In-Task Notes: "${t.notes.replace(/\n+/g, ' ')}"` : ''}
  ${t.auditNotes ? `Audit Note: "${t.auditNotes}"` : ''}
  ${t.deadline ? `Deadline: ${t.deadline}` : ''}
`).join('\n')}

=== DAILY JOURNALS & REFLECTIONS ===
${logs.length === 0 ? 'No daily journals logged in this period.' : logs.map(l => `
[Date: ${l.date}]
• Today's Highlight: ${l.highlight || 'None'}
• What I Learned: ${l.learnedNotes || 'None'}
• Evening Reflection: ${l.reflection || 'None'}
• Epiphany: ${l.epiphany || 'None'}
`).join('\n')}

=== INSTRUCTIONS FOR SYNTHESIS ===
Deliver a sharp, honest, highly tailored synthesis. 
DO NOT give generic motivational fluff. Explicitly reference their real study topics, actual task notes, and reflections from the data above.
Correlate their study focus and notes with their task completion and journal reflections.

Respond with ONLY valid JSON with this exact schema (no markdown fences, no backticks):
{
  "title": "A punchy, specific 3-6 word synthesis title referencing their actual focus or bottleneck",
  "insight": "A 3-5 sentence deep synthesis connecting their self study sessions, in-task notes, and reflections. Highlight specific courses/topics studied, recurring friction points noted, and actionable recommendations.",
  "score": 85
}
`;
}

/**
 * Intelligent deterministic local synthesizer fallback
 * Used if the remote API or edge function is temporarily unavailable.
 */
export function generateLocalSynthesis(context) {
  const { timeView, logs, tasks, studyBlocks, metrics } = context;

  const completionRate = metrics.taskCompletionRate;
  const avgFocus = metrics.averageFocusRating ? Number(metrics.averageFocusRating) : null;
  const topics = metrics.topicsStudied;

  // Calculate composite discipline score (weighted tasks + focus + consistency)
  let baseScore = 50;
  if (metrics.totalTasks > 0) {
    baseScore = Math.round(completionRate * 0.5 + (avgFocus ? (avgFocus / 5) * 40 : 25) + (metrics.totalLogs > 0 ? 10 : 0));
  } else if (metrics.totalStudyBlocks > 0) {
    baseScore = Math.round((avgFocus ? (avgFocus / 5) * 80 : 65) + (metrics.totalLogs > 0 ? 15 : 5));
  }
  const score = Math.min(100, Math.max(10, baseScore));

  let title = 'Steady Momentum';
  let insightParts = [];

  // Topics and Study insight
  if (studyBlocks.length > 0) {
    const topicStr = topics.slice(0, 3).join(', ');
    const totalMins = Math.round(Number(metrics.totalStudyHours) * 60);
    insightParts.push(
      `You invested ${totalMins} minutes across ${studyBlocks.length} study block${studyBlocks.length === 1 ? '' : 's'}${topicStr ? ` focusing on ${topicStr}` : ''}${avgFocus ? ` with an average focus rating of ${avgFocus}/5` : ''}.`
    );

    // Look at actual outcomes in recall
    const recallNotes = studyBlocks.filter(b => b.actualOutcome?.trim()).map(b => b.actualOutcome.trim());
    if (recallNotes.length > 0) {
      insightParts.push(`Key active recall takeaway: "${recallNotes[0].slice(0, 120)}${recallNotes[0].length > 120 ? '…' : ''}".`);
    }
  } else {
    insightParts.push(`No dedicated Study Mode sessions were recorded in this ${timeView} window.`);
  }

  // Tasks and in-task notes insight
  if (tasks.length > 0) {
    insightParts.push(
      `Task execution reached ${completionRate}% (${metrics.completedTasks} completed out of ${metrics.totalTasks} planned).`
    );

    const taskWithNotes = tasks.find(t => t.notes?.trim());
    if (taskWithNotes) {
      insightParts.push(
        `Your task notes for "${taskWithNotes.name}" reveal active planning ("${taskWithNotes.notes.slice(0, 90).replace(/\n+/g, ' ')}…").`
      );
    }
  }

  // Reflection insight
  const logWithReflection = logs.find(l => l.reflection?.trim() || l.highlight?.trim());
  if (logWithReflection) {
    if (logWithReflection.highlight) {
      insightParts.push(`Daily highlight anchor: "${logWithReflection.highlight}".`);
    } else if (logWithReflection.reflection) {
      insightParts.push(`Journal reflection noted: "${logWithReflection.reflection.slice(0, 100)}…".`);
    }
  }

  if (score >= 80) {
    title = topics.length > 0 ? `High-Impact Focus on ${topics[0]}` : 'Strong Execution Arc';
  } else if (score >= 60) {
    title = 'Building Consistency';
  } else {
    title = 'Re-aligning Intentions';
  }

  return {
    title,
    insight: insightParts.join(' '),
    score,
    isLocalFallback: true,
  };
}
