import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { format, addDays } from 'date-fns';
import { calculateDayEarnings } from '../engine/calculator';
import { generateRollovers, injectCoreDisciplines, getDayStatus } from '../engine/rollover';
import { supabase } from '../lib/supabase';

const ICS_SERVER = 'http://localhost:3001';

// ── ICS Server helpers (silent-fail) ─────────────────────────────────────────

const syncToICSServer = async (allTasks) => {
  try {
    // Sync all tasks with calendarSync=true (not just timeBlockEnabled)
    const flat = Object.values(allTasks).flat().filter(t => t.calendarSync);
    await fetch(`${ICS_SERVER}/api/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: flat }),
    });
  } catch (_) { /* ICS server offline — silent fail */ }
};

const removeFromICSServer = async (taskId) => {
  try {
    await fetch(`${ICS_SERVER}/api/sync/${taskId}`, { method: 'DELETE' });
  } catch (_) {}
};

// ── Supabase helpers ──────────────────────────────────────────────────────────

const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const useStore = create(
  persist(
    (set, get) => ({
      // ── Core state ──────────────────────────────────────────────────────────
      dailyLogs: {},
      tasks: {},
      coreDisciplines: [],
      earnings: {},
      activeTab: 'dawn',
      duskDate: todayStr(),
      calendarToken: null,
      settings: {
        currency: 'INR',
        maxDailyRemuneration: 1000,
      },

      // ── Tab navigation & Settings ───────────────────────────────────────────
      setActiveTab: (tab) => set({ activeTab: tab }),
      setDuskDate:  (date) => set({ duskDate: date }),
      updateSettings: async ({ currency, maxDailyRemuneration }) => {
        const numVal = Number(maxDailyRemuneration);
        if (isNaN(numVal) || numVal <= 0) return { error: 'Invalid maximum daily remuneration' };
        const curr = currency || 'INR';

        set((state) => ({
          settings: { currency: curr, maxDailyRemuneration: numVal }
        }));

        const user = await getUser();
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            currency: curr,
            max_daily_remuneration: numVal,
          }, { onConflict: 'id' });
        }

        const today = todayStr();
        get().recalcEarnings(today);
        return { success: true };
      },

      // ── Supabase: Fetch all data for logged-in user ─────────────────────────
      fetchFromSupabase: async () => {
        const user = await getUser();
        if (!user) return;

        const [logsRes, tasksRes, cdRes, earnRes, profileRes] = await Promise.all([
          supabase.from('daily_logs').select('*').eq('user_id', user.id),
          supabase.from('tasks').select('*').eq('user_id', user.id),
          supabase.from('core_disciplines').select('*').eq('user_id', user.id),
          supabase.from('earnings').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('calendar_token, currency, max_daily_remuneration').eq('id', user.id).maybeSingle(),
        ]);

        if (logsRes.error || tasksRes.error || cdRes.error || earnRes.error) return;

        const dailyLogs = {};
        logsRes.data.forEach(log => {
          dailyLogs[log.date] = {
            highlight: log.highlight, learnedNotes: log.learned_notes,
            learnedSourceUrl: log.learned_source_url, reflection: log.reflection,
            epiphany: log.epiphany, isEpiphanyVisible: log.is_epiphany_visible,
            isLocked: log.is_locked, approvalState: log.approval_state, createdAt: log.created_at,
          };
        });

        const tasks = {};
        tasksRes.data.forEach(t => {
          const dKey = t.log_date || 'unassigned';
          if (!tasks[dKey]) tasks[dKey] = [];
          tasks[dKey].push({
            id: t.id, name: t.name, tag: t.tag, type: t.type,
            weight: t.weight, damage: t.damage, recurrence: t.recurrence,
            status: t.status, completionPercentage: t.completion_percentage,
            logDate: t.log_date || null, originalDate: t.original_date || t.log_date || null,
            calendarSync: t.calendar_sync, timeBlockEnabled: t.time_block_enabled,
            timeBlockStart: t.time_block_start, timeBlockEnd: t.time_block_end,
            hasBonus: t.has_bonus, delayCount: t.delay_count,
            isCoreDiscipline: t.is_core_discipline, coreDisciplineId: t.core_discipline_id,
            auditNotes: t.audit_notes, postponedToDate: t.postponed_to_date || null,
            deadline: t.deadline || null,
            importance: t.importance || 'Medium',
            urgency: t.urgency || 'Medium',
            priority: t.priority || 'Medium',
            estimatedDuration: t.estimated_duration || null,
            notes: t.notes || null,
            createdAt: t.created_at || null,
            completedAt: t.completed_at || null,
            plannedDate: t.planned_date || t.log_date || null,
          });
        });

        const earnings = {};
        earnRes.data.forEach(e => {
          earnings[e.date] = {
            R_calc: e.r_calc, E_base: e.e_base, P_base: e.p_base,
            P_potential: e.p_potential, D_tot: e.d_tot, M_pow: e.m_pow,
            newDebt: e.new_debt, claimed: e.claimed,
            amount_received: e.amount_received || 0,
            currency: e.currency || 'INR',
            maxDailyRemuneration: e.max_daily_remuneration != null ? Number(e.max_daily_remuneration) : 1000,
          };
        });

        // Merge locally injected tasks that might not have reached Supabase yet
        const existingTasks = get().tasks;
        const mergedTasks = { ...tasks };
        Object.entries(existingTasks).forEach(([d, dTasks]) => {
          const newlyAdded = (dTasks ?? []).filter(dt => !(tasks[d] ?? []).some(st => st.id === dt.id));
          if (newlyAdded.length > 0) {
            mergedTasks[d] = [...(mergedTasks[d] ?? []), ...newlyAdded];
          }
        });

        const calendarToken = profileRes.data?.calendar_token ?? null;
        const userCurrency = profileRes.data?.currency || get().settings?.currency || 'INR';
        const userMaxDaily = profileRes.data?.max_daily_remuneration != null
          ? Number(profileRes.data.max_daily_remuneration)
          : (get().settings?.maxDailyRemuneration || 1000);

        set({
          dailyLogs,
          tasks: mergedTasks,
          coreDisciplines: cdRes.data || [],
          earnings,
          calendarToken,
          settings: { currency: userCurrency, maxDailyRemuneration: userMaxDaily }
        });

        // Migrate last 7 days to the independent negative model
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = format(addDays(today, -i), 'yyyy-MM-dd');
          get().recalcEarnings(date);
        }
      },

      // ── Supabase: Push individual records ───────────────────────────────────
      syncTaskToSupabase: async (task) => {
        try {
          const user = await getUser();
          if (!user) return;
          const { error } = await supabase.from('tasks').upsert({
            id: task.id, user_id: user.id, log_date: task.logDate || null,
            name: task.name, tag: task.tag, type: task.type,
            weight: task.weight, damage: task.damage, recurrence: task.recurrence,
            status: task.status, completion_percentage: task.completionPercentage ?? 0,
            original_date: task.originalDate || task.logDate || todayStr(), delay_count: task.delayCount || 0,
            calendar_sync: task.calendarSync || false,
            time_block_enabled: task.timeBlockEnabled || false,
            time_block_start: task.timeBlockStart, time_block_end: task.timeBlockEnd,
            has_bonus: task.hasBonus || false, is_core_discipline: task.isCoreDiscipline || false,
            core_discipline_id: task.coreDisciplineId || null, audit_notes: task.auditNotes || '',
            postponed_to_date: task.postponedToDate || null,
            deadline: task.deadline || null,
            importance: task.importance || 'Medium',
            urgency: task.urgency || 'Medium',
            priority: task.priority || 'Medium',
            estimated_duration: task.estimatedDuration || null,
            notes: task.notes || null,
            created_at: task.createdAt || new Date().toISOString(),
            completed_at: task.completedAt || null,
            planned_date: task.plannedDate || task.logDate || null,
          });
          if (error) {
            console.error('Upsert task error:', error);
            alert('DB Update Error: ' + error.message);
          }
        } catch (err) {
          console.error('sync exception:', err);
          alert('Sync Exception: ' + err.message);
        }
      },

      syncCoreDisciplineToSupabase: async (cd) => {
        const user = await getUser();
        if (!user) return;
        const { error } = await supabase.from('core_disciplines').upsert({
          id: cd.id, user_id: user.id, name: cd.name,
          tag: cd.tag, type: cd.type, weight: cd.weight,
          damage: cd.damage, active: cd.active ?? true
        });
        if (error) {
          console.error('Core Discipline Sync Error:', error);
          throw error;
        }
      },

      syncLogToSupabase: async (date, log) => {
        const user = await getUser();
        if (!user) return;
        await supabase.from('daily_logs').upsert({
          date, user_id: user.id, highlight: log.highlight,
          learned_notes: log.learnedNotes, learned_source_url: log.learnedSourceUrl,
          reflection: log.reflection, epiphany: log.epiphany,
          is_epiphany_visible: log.isEpiphanyVisible || false,
          is_locked: log.isLocked || false, approval_state: log.approvalState || 'draft',
        });
      },

      syncEarningsToSupabase: async (date, earningsData) => {
        const user = await getUser();
        if (!user) return;
        const { settings } = get();
        await supabase.from('earnings').upsert({
          date, user_id: user.id,
          r_calc: earningsData.R_calc ?? 0,
          e_base: earningsData.E_base ?? 0,
          p_base: earningsData.P_base ?? 0,
          p_potential: earningsData.P_potential ?? 0,
          d_tot: earningsData.D_tot ?? 0,
          m_pow: earningsData.M_pow ?? 1,
          new_debt: earningsData.newDebt ?? 0,
          amount_earned: earningsData.R_calc ?? 0,
          multiplier_applied: earningsData.M_pow ?? 1,
          total_damage: earningsData.D_tot ?? 0,
          negative_carryover: earningsData.newDebt ?? 0,
          claimed: earningsData.claimed ?? false,
          amount_received: earningsData.amount_received ?? 0,
          currency: earningsData.currency || settings?.currency || 'INR',
          max_daily_remuneration: earningsData.maxDailyRemuneration || settings?.maxDailyRemuneration || 1000,
        });
      },

      // ── Daily Log CRUD ───────────────────────────────────────────────────────
      updateDailyLog: (date, updates) => {
        set((state) => {
          const newLog = {
            highlight: '', learnedNotes: '', learnedSourceUrl: '',
            reflection: '', epiphany: '', isEpiphanyVisible: false,
            isLocked: false, approvalState: 'draft', createdAt: new Date().toISOString(),
            ...(state.dailyLogs[date] ?? {}), ...updates,
          };
          get().syncLogToSupabase(date, newLog);
          return { dailyLogs: { ...state.dailyLogs, [date]: newLog } };
        });
      },

      initDay: (date) => {
        const { dailyLogs, coreDisciplines, tasks, updateDailyLog, addTask } = get();
        if (!dailyLogs[date]) updateDailyLog(date, { createdAt: new Date().toISOString() });

        const existingTasks = tasks[date] ?? [];

        // 1. Deduplicate existing core discipline tasks (keep first, remove others)
        const seenCoreIds = new Set();
        const duplicatesToDelete = [];
        const uniqueTasks = [];

        existingTasks.forEach((t) => {
          if (t.isCoreDiscipline && t.coreDisciplineId) {
            if (seenCoreIds.has(t.coreDisciplineId)) {
              duplicatesToDelete.push(t);
            } else {
              seenCoreIds.add(t.coreDisciplineId);
              uniqueTasks.push(t);
            }
          } else {
            uniqueTasks.push(t);
          }
        });

        if (duplicatesToDelete.length > 0) {
          const idsToDelete = duplicatesToDelete.map((t) => t.id);
          set((state) => ({
            tasks: {
              ...state.tasks,
              [date]: uniqueTasks,
            },
          }));
          getUser().then((user) => {
            if (user) {
              supabase
                .from('tasks')
                .delete()
                .in('id', idsToDelete)
                .eq('user_id', user.id)
                .then(() => {
                  get().recalcEarnings(date);
                })
                .catch((err) => console.error('Failed to delete duplicates in DB:', err));
            }
          });
        }

        // 2. Inject only disciplines not already present
        const currentTasks = get().tasks[date] ?? [];
        const injectedIds = new Set(
          currentTasks.filter((t) => t.isCoreDiscipline).map((t) => t.coreDisciplineId)
        );
        const missing = coreDisciplines.filter((cd) => cd.active !== false && !injectedIds.has(cd.id));
        if (missing.length > 0) {
          const injected = injectCoreDisciplines(missing, date);
          injected.forEach((t) => addTask(date, t));
        }

        // 3. Inject postponed_later tasks from all past days targeting this date
        // Include cancelled tasks in the key set so they act as tombstones blocking re-injection
        const allExistingForDate = tasks[date] ?? [];
        const existingTaskKeys = new Set(allExistingForDate.map((t) => t.name + '|' + (t.originalDate ?? '')));
        // Also key by name+date to block recurring injection specifically
        allExistingForDate.filter(t => t.status === 'cancelled').forEach(t => existingTaskKeys.add(t.name + '|' + date));
        const allTasks = get().tasks;
        Object.entries(allTasks).forEach(([pastDate, pastTasks]) => {
          if (pastDate >= date) return; // only look at past days
          (pastTasks ?? []).forEach((t) => {
            if (t.status === 'postponed_later' && t.postponedToDate === date) {
              const key = t.name + '|' + (t.originalDate ?? pastDate);
              if (!existingTaskKeys.has(key)) {
                existingTaskKeys.add(key);
                const currentTasks = get().tasks[date] ?? [];
                if (!currentTasks.some(ct => ct.name === t.name && ct.originalDate === (t.originalDate ?? pastDate))) {
                  addTask(date, {
                    ...t,
                    id: crypto.randomUUID(),
                    logDate: date,
                    status: 'missed',
                    delayCount: (t.delayCount ?? 0) + 1,
                    rolloverType: 'postponed_rollover',
                    rolloverBadge: 'red',
                    postponedToDate: null,
                    auditNotes: '', // Fresh notes for the new day
                    originalDate: t.originalDate ?? pastDate,
                  });
                }
              }
            } else if (!t.isCoreDiscipline && t.recurrence && t.recurrence !== 'none' && t.status !== 'cancelled') {
              // Skip cancelled tasks — they are tombstones, not sources for new recurrences
              let shouldRecur = false;
              if (t.recurrence === 'daily' && pastDate === format(addDays(new Date(date + 'T00:00:00'), -1), 'yyyy-MM-dd')) {
                shouldRecur = true;
              } else if (t.recurrence === 'weekdays') {
                const targetDay = new Date(date + 'T00:00:00').getDay();
                if (targetDay >= 1 && targetDay <= 5) {
                  const daysToSubtract = targetDay === 1 ? 3 : 1;
                  if (pastDate === format(addDays(new Date(date + 'T00:00:00'), -daysToSubtract), 'yyyy-MM-dd')) {
                    shouldRecur = true;
                  }
                }
              } else if (t.recurrence === 'weekly' && pastDate === format(addDays(new Date(date + 'T00:00:00'), -7), 'yyyy-MM-dd')) {
                shouldRecur = true;
              } else if (t.recurrence === 'monthly') {
                const oneMonthAgo = new Date(date + 'T00:00:00');
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                if (pastDate === format(oneMonthAgo, 'yyyy-MM-dd')) {
                  shouldRecur = true;
                }
              }

              if (shouldRecur) {
                const key = t.name + '|' + date;
                if (!existingTaskKeys.has(key)) {
                  existingTaskKeys.add(key);
                  const currentTasks = get().tasks[date] ?? [];
                  if (!currentTasks.some(ct => ct.name === t.name && ct.rolloverType === 'recurring')) {
                    addTask(date, {
                      ...t,
                      id: crypto.randomUUID(),
                      logDate: date,
                      status: 'missed',
                      completionPercentage: 0,
                      delayCount: 0,
                      rolloverType: 'recurring',
                      rolloverBadge: 'blue',
                      postponedToDate: null,
                      auditNotes: '', // Fresh notes for the new recurrence cycle
                      originalDate: date, // reset originalDate for the new recurrence cycle
                    });
                  }
                }
              }
            }
          });
        });
      },

      // ── Task CRUD ────────────────────────────────────────────────────────────
      getTasksForDate: (date) => (get().tasks[date] ?? []).filter(t => t && t.status !== 'cancelled'),

      getTaskBasket: () => {
        const { tasks } = get();
        const allTasks = Object.values(tasks).flat();
        const seen = new Set();
        const result = [];
        for (const t of allTasks) {
          if (
            t && 
            t.id && 
            !seen.has(t.id) && 
            t.status !== 'cancelled' &&
            !t.isCoreDiscipline &&
            !t.coreDisciplineId
          ) {
            seen.add(t.id);
            result.push(t);
          }
        }
        return result;
      },

      assignTaskToToday: (taskId, targetDate = todayStr()) => {
        const { tasks, syncTaskToSupabase, initDay, recalcEarnings } = get();
        
        let targetTask = null;
        let oldKey = null;
        for (const [key, tList] of Object.entries(tasks)) {
          const found = (tList ?? []).find((t) => t && t.id === taskId);
          if (found) {
            targetTask = found;
            oldKey = key;
            break;
          }
        }

        if (!targetTask) return;

        initDay(targetDate);

        const updatedTask = {
          ...targetTask,
          logDate: targetDate,
          plannedDate: targetDate,
          originalDate: targetTask.originalDate || targetDate,
        };

        set((state) => {
          const oldList = (state.tasks[oldKey] ?? []).filter((t) => t && t.id !== taskId);
          const newList = [...(state.tasks[targetDate] ?? []).filter((t) => t && t.id !== taskId), updatedTask];
          const newTasks = {
            ...state.tasks,
            [oldKey]: oldList,
            [targetDate]: newList,
          };
          syncToICSServer(newTasks);
          return { tasks: newTasks };
        });

        syncTaskToSupabase(updatedTask);
        recalcEarnings(targetDate);
      },

      addTask: (date, task) => {
        const id = task.id ?? crypto.randomUUID();
        const dKey = date || 'unassigned';
        const fullTask = {
          importance: 'Medium',
          urgency: 'Medium',
          priority: 'Medium',
          createdAt: new Date().toISOString(),
          ...task,
          id,
          logDate: date || null,
          plannedDate: task.plannedDate || date || null,
        };
        set((state) => {
          const newTasks = {
            ...state.tasks,
            [dKey]: [...(state.tasks[dKey] ?? []), fullTask],
          };
          syncToICSServer(newTasks);
          return { tasks: newTasks };
        });
        get().syncTaskToSupabase(fullTask);
        if (date) {
          get().recalcEarnings(date);
        }
      },

      updateTask: (date, taskId, updates) => {
        const dKey = date || 'unassigned';
        set((state) => {
          let foundInDKey = (state.tasks[dKey] ?? []).some(t => t && t.id === taskId);
          let newTasks = { ...state.tasks };

          if (foundInDKey) {
            const updatedTasks = (state.tasks[dKey] ?? []).map(t => {
              if (t.id !== taskId) return t;
              const updated = { ...t, ...updates };
              get().syncTaskToSupabase(updated);
              return updated;
            });
            newTasks[dKey] = updatedTasks;
          } else {
            for (const [k, tList] of Object.entries(state.tasks)) {
              if ((tList ?? []).some(t => t && t.id === taskId)) {
                newTasks[k] = tList.map(t => {
                  if (t.id !== taskId) return t;
                  const updated = { ...t, ...updates };
                  get().syncTaskToSupabase(updated);
                  return updated;
                });
                break;
              }
            }
          }
          syncToICSServer(newTasks);
          return { tasks: newTasks };
        });
        if (date) get().recalcEarnings(date);
      },

      deleteTask: async (date, taskId) => {
        const taskToDelete = (get().tasks[date] ?? []).find(t => t.id === taskId);
        const isRecurring = taskToDelete?.recurrence && taskToDelete.recurrence !== 'none';

        if (isRecurring) {
          // Soft-delete: mark as cancelled so it acts as a tombstone for initDay injection checks.
          // This prevents the task from being re-injected on future refreshes.
          const cancelled = { ...taskToDelete, status: 'cancelled' };
          set((state) => ({
            tasks: {
              ...state.tasks,
              // Keep the cancelled record in state so existingTaskKeys picks it up, but UI filters it out
              [date]: (state.tasks[date] ?? []).map(t => t.id === taskId ? cancelled : t),
            },
          }));
          try {
            const user = await getUser();
            if (user) {
              // Simple UPDATE — only flip the status, leave all other columns intact
              const { error } = await supabase
                .from('tasks')
                .update({ status: 'cancelled' })
                .eq('id', taskToDelete.id)
                .eq('user_id', user.id);
              if (error) console.error('Failed to soft-delete task:', error);
            }
          } catch (err) {
            console.error('Soft-delete exception:', err);
          }
        } else {
          // Hard-delete non-recurring tasks
          set((state) => ({
            tasks: {
              ...state.tasks,
              [date]: (state.tasks[date] ?? []).filter(t => t.id !== taskId),
            },
          }));
          if (taskToDelete?.calendarSync) removeFromICSServer(taskId);
          try {
            const user = await getUser();
            if (user) {
              const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', user.id);
              if (error) {
                console.error('Failed to delete task:', error);
                alert('DB Delete Error: ' + error.message);
              }
            }
          } catch (err) {
            console.error('Delete exception:', err);
            alert('Delete exception: ' + err.message);
          }
        }

        get().recalcEarnings(date);
      },

      // ── Core Disciplines ──────────────────────────────────────────────────────
      // F5 FIX: await Supabase write BEFORE updating local state.
      // Previously, local state updated first → initDay injected tasks with a
      // coreDisciplineId that didn't exist in Supabase yet → FK constraint error.
      addCoreDiscipline: async (discipline) => {
        const id = crypto.randomUUID();
        const fullDiscipline = { ...discipline, id, active: true };
        try {
          // Write to DB first — must complete before local state triggers initDay
          await get().syncCoreDisciplineToSupabase(fullDiscipline);
          // Now safe to update local state (re-render → initDay → task injection)
          set((state) => ({
            coreDisciplines: [...state.coreDisciplines, fullDiscipline],
          }));
        } catch (err) {
          alert('Failed to save Core Discipline: ' + err.message);
        }
      },

      updateCoreDiscipline: (id, updates) => {
        set((state) => {
          const updatedDisciplines = state.coreDisciplines.map(d => {
            if (d.id !== id) return d;
            const updated = { ...d, ...updates };
            get().syncCoreDisciplineToSupabase(updated);
            return updated;
          });
          return { coreDisciplines: updatedDisciplines };
        });
      },

      deleteCoreDiscipline: (id) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        set((state) => {
          const newDisciplines = state.coreDisciplines.filter(d => d.id !== id);
          
          const todayTasks = state.tasks[today] ?? [];
          const tasksToDelete = todayTasks.filter(t => t.isCoreDiscipline && t.coreDisciplineId === id);
          
          let newTasksObj = state.tasks;
          if (tasksToDelete.length > 0) {
            newTasksObj = {
              ...state.tasks,
              [today]: todayTasks.filter(t => !(t.isCoreDiscipline && t.coreDisciplineId === id))
            };
            
            getUser().then(user => {
              if (user) {
                const idsToDelete = tasksToDelete.map(t => t.id);
                supabase.from('tasks').delete().in('id', idsToDelete).eq('user_id', user.id)
                  .then(({ error }) => { if (error) console.error('Failed to delete orphaned tasks:', error); });
              }
            });
          }

          return {
            coreDisciplines: newDisciplines,
            tasks: newTasksObj
          };
        });

        getUser().then(user => {
          if (user) {
            supabase.from('core_disciplines').delete().eq('id', id).eq('user_id', user.id)
              .then(({ error }) => { if (error) console.error('Failed to delete core discipline in DB:', error); });
          }
        });
        
        get().recalcEarnings(today);
      },

      // ── Earnings Engine ───────────────────────────────────────────────────────
      recalcEarnings: (date) => {
        const { tasks, earnings, settings } = get();
        const dayTasks = tasks[date] ?? [];
        const existing = earnings[date] ?? {};
        const today = todayStr();

        // For past dates that already have a snapshotted maxDailyRemuneration, preserve it.
        // For today or new dates, use the current active user settings.
        const dayMaxDaily = (date < today && existing.maxDailyRemuneration != null)
          ? Number(existing.maxDailyRemuneration)
          : Number(settings?.maxDailyRemuneration || 1000);

        const dayCurrency = (date < today && existing.currency != null)
          ? existing.currency
          : (settings?.currency || 'INR');

        const result = calculateDayEarnings(dayTasks, 0, dayMaxDaily);

        set((state) => {
          const existingEarn = state.earnings[date] ?? {};
          // Optimization: skip updating if values are already correct
          if (
            existingEarn.R_calc === result.R_calc &&
            existingEarn.D_tot === result.D_tot &&
            existingEarn.E_base === result.E_base &&
            existingEarn.M_pow === result.M_pow &&
            existingEarn.maxDailyRemuneration === dayMaxDaily &&
            existingEarn.currency === dayCurrency
          ) {
            return {};
          }
          const updated = {
            ...result,
            maxDailyRemuneration: dayMaxDaily,
            currency: dayCurrency,
            claimed: existingEarn.claimed ?? false,
            amount_received: existingEarn.amount_received ?? 0,
          };
          get().syncEarningsToSupabase(date, updated);
          return { earnings: { ...state.earnings, [date]: updated } };
        });
      },

      setEarningsClaimed: (date, claimed) => {
        set((state) => ({
          earnings: { ...state.earnings, [date]: { ...(state.earnings[date] ?? {}), claimed } },
        }));
      },

      // ── Rollover Logic ────────────────────────────────────────────────────────
      // F4 FIX: Deduplicate rollover tasks — if Submit Day is pressed multiple
      // times, guard against duplicate rollovers landing in the target date.
      processRollovers: (fromDate) => {
        const { tasks, addTask } = get();
        const toDate = format(addDays(new Date(fromDate + 'T00:00:00'), 1), 'yyyy-MM-dd');
        const rollovers = generateRollovers(tasks[fromDate] ?? [], toDate);
        const existingInTarget = tasks[toDate] ?? [];

        rollovers.forEach(t => {
          // Skip if a task with the same original origin + name already exists in target
          const isDuplicate = existingInTarget.some(
            existing =>
              existing.name === t.name &&
              (existing.originalDate === t.originalDate ||
               (existing.coreDisciplineId && existing.coreDisciplineId === t.coreDisciplineId))
          );
          if (!isDuplicate) addTask(toDate, t);
        });
      },

      // ── Chronicle helpers ──────────────────────────────────────────────────────
      getDayStatus: (date) => {
        const { dailyLogs, tasks } = get();
        return getDayStatus(dailyLogs[date], tasks[date] ?? []);
      },

      getEarningsHistory: (days = 30) => {
        const { earnings } = get();
        return Array.from({ length: days }, (_, i) => {
          const date = format(addDays(new Date(), -(days - 1 - i)), 'yyyy-MM-dd');
          return {
            date, label: format(new Date(date + 'T00:00:00'), 'MMM d'),
            R_calc: earnings[date]?.R_calc ?? 0, E_base: earnings[date]?.E_base ?? 0,
            D_tot: earnings[date]?.D_tot ?? 0, M_pow: earnings[date]?.M_pow ?? 1,
            P_base: earnings[date]?.P_base ?? 0, P_potential: earnings[date]?.P_potential ?? 0,
          };
        });
      },

      getTasksHistory: (days = 30) => {
        const { tasks } = get();
        return Array.from({ length: days }, (_, i) => {
          const date = format(addDays(new Date(), -(days - 1 - i)), 'yyyy-MM-dd');
          return { date, label: format(new Date(date + 'T00:00:00'), 'MMM d'), tasks: tasks[date] || [] };
        });
      },

      searchEntries: (query) => {
        if (!query?.trim()) return [];
        const { tasks, dailyLogs } = get();
        const q = query.toLowerCase();
        const results = [];

        Object.entries(dailyLogs).forEach(([date, log]) => {
          const match = [log.highlight, log.learnedNotes, log.reflection, log.epiphany]
            .find(f => f?.toLowerCase().includes(q));
          if (match) results.push({ date, type: 'log', matchText: match, label: 'Journal Entry' });
        });

        Object.entries(tasks).forEach(([date, dayTasks]) => {
          dayTasks.forEach(t => {
            if (t.name?.toLowerCase().includes(q) || t.tag?.toLowerCase().includes(q)) {
              results.push({ date, type: 'task', matchText: t.name, label: 'Task' });
            }
          });
        });

        return results.sort((a, b) => (a.date < b.date ? 1 : -1));
      },

      // ── Calendar Token (F1) ───────────────────────────────────────────────────
      generateCalendarToken: async () => {
        const user = await getUser();
        if (!user) return;
        const newToken = crypto.randomUUID();
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, calendar_token: newToken }, { onConflict: 'id' });
        if (!error) set({ calendarToken: newToken });
        return newToken;
      },

      // ── Pending Remuneration (F2.1) ───────────────────────────────────────────
      getPendingRemuneration: () => {
        const { earnings } = get();
        const today = format(new Date(), 'yyyy-MM-dd');
        const pendingDays = Object.entries(earnings)
          // Include both positive and negative unpaid balances
          .filter(([date, data]) => {
            if (date >= today) return false;
            const rCalc = parseFloat(data.R_calc || 0);
            const received = parseFloat(data.amount_received || 0);
            return Math.abs(rCalc - received) > 0.01;
          })
          .sort(([aDate], [bDate]) => (aDate < bDate ? -1 : 1));
        
        const totalPending = pendingDays.reduce((sum, [_, data]) => {
          const rCalc = parseFloat(data.R_calc || 0);
          const received = parseFloat(data.amount_received || 0);
          return sum + (rCalc - received);
        }, 0);
        return { totalPending, pendingDays };
      },

      resetPendingBalance: async () => {
        const user = await getUser();
        if (!user) return;

        const { pendingDays } = get().getPendingRemuneration();
        if (pendingDays.length === 0) return;

        const localUpdates = {};
        const dbUpdates = [];

        for (const [date, data] of pendingDays) {
          const rCalc = parseFloat(data.R_calc || 0);
          localUpdates[date] = { claimed: true, amount_received: rCalc };

          dbUpdates.push({
            date,
            user_id: user.id,
            r_calc:            data.R_calc        || 0,
            e_base:            data.E_base        || 0,
            p_base:            data.P_base        || 0,
            p_potential:       data.P_potential   || 0,
            d_tot:             data.D_tot         || 0,
            m_pow:             data.M_pow         || 1,
            new_debt:          data.newDebt       || 0,
            amount_earned:     data.R_calc        || 0,
            multiplier_applied:data.M_pow         || 1,
            total_damage:      data.D_tot         || 0,
            negative_carryover:data.newDebt       || 0,
            claimed:           true,
            amount_received:   rCalc,
          });
        }

        if (dbUpdates.length === 0) return;

        const { error } = await supabase
          .from('earnings')
          .upsert(dbUpdates, { onConflict: 'date,user_id' });

        if (error) {
          console.error('resetPendingBalance DB error:', error);
          alert('Failed to reset balance: ' + error.message);
          return;
        }

        set((state) => {
          const newEarnings = { ...state.earnings };
          Object.entries(localUpdates).forEach(([d, up]) => {
            newEarnings[d] = { ...(newEarnings[d] || {}), ...up };
          });
          return { earnings: newEarnings };
        });
      },

      settleUp: async (amountReceived) => {
        const user = await getUser();
        if (!user) return;

        const { totalPending, pendingDays } = get().getPendingRemuneration();

        if (pendingDays.length === 0) return;

        let remaining = Math.max(0, amountReceived || 0);
        const settlingAll = Math.abs(remaining - totalPending) < 0.01 || totalPending <= 0;
        
        const localUpdates = {};
        const dbUpdates = [];

        for (const [date, data] of pendingDays) {
          const alreadyReceived = parseFloat(data.amount_received || 0);
          const rCalc = parseFloat(data.R_calc || 0);
          const dueForDay = rCalc - alreadyReceived;
          
          let applying = 0;
          let nowClaimed = false;
          let newReceived = alreadyReceived;

          if (settlingAll) {
            applying = dueForDay;
            newReceived = rCalc;
            nowClaimed = true;
          } else {
            // Partial settlement: only apply to positive days
            if (dueForDay <= 0 || remaining <= 0) continue;
            applying = Math.min(dueForDay, remaining);
            newReceived = alreadyReceived + applying;
            nowClaimed = Math.abs(newReceived - rCalc) < 0.01;
            remaining -= applying;
          }

          localUpdates[date] = { claimed: nowClaimed, amount_received: newReceived };

          // Include ALL required DB columns with null guards to prevent upsert failures
          dbUpdates.push({
            date,
            user_id: user.id,
            r_calc:            data.R_calc        || 0,
            e_base:            data.E_base        || 0,
            p_base:            data.P_base        || 0,
            p_potential:       data.P_potential   || 0,
            d_tot:             data.D_tot         || 0,
            m_pow:             data.M_pow         || 1,
            new_debt:          data.newDebt       || 0,
            // Legacy columns (also NOT NULL in schema)
            amount_earned:     data.R_calc        || 0,
            multiplier_applied:data.M_pow         || 1,
            total_damage:      data.D_tot         || 0,
            negative_carryover:data.newDebt       || 0,
            claimed:           nowClaimed,
            amount_received:   newReceived,
          });
        }

        if (dbUpdates.length === 0) return;

        // Save to DB first — use explicit onConflict so it always UPDATEs the right row
        const { error } = await supabase
          .from('earnings')
          .upsert(dbUpdates, { onConflict: 'date,user_id' });

        if (error) {
          console.error('settleUp DB error:', error);
          alert('Failed to save settlement: ' + error.message);
          return;
        }

        // Only update local state after DB confirms success
        set((state) => {
          const newEarnings = { ...state.earnings };
          Object.entries(localUpdates).forEach(([date, updates]) => {
            newEarnings[date] = { ...newEarnings[date], ...updates };
          });
          return { earnings: newEarnings };
        });
      },
    }),
    {
      name: 'stronger-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useStore;
