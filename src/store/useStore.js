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

      // ── Tab navigation ──────────────────────────────────────────────────────
      setActiveTab: (tab) => set({ activeTab: tab }),
      setDuskDate:  (date) => set({ duskDate: date }),

      // ── Supabase: Fetch all data for logged-in user ─────────────────────────
      fetchFromSupabase: async () => {
        const user = await getUser();
        if (!user) return;

        const [logsRes, tasksRes, cdRes, earnRes, profileRes] = await Promise.all([
          supabase.from('daily_logs').select('*').eq('user_id', user.id),
          supabase.from('tasks').select('*').eq('user_id', user.id),
          supabase.from('core_disciplines').select('*').eq('user_id', user.id),
          supabase.from('earnings').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('calendar_token').eq('id', user.id).maybeSingle(),
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
          if (!tasks[t.log_date]) tasks[t.log_date] = [];
          tasks[t.log_date].push({
            id: t.id, name: t.name, tag: t.tag, type: t.type,
            weight: t.weight, damage: t.damage, recurrence: t.recurrence,
            status: t.status, completionPercentage: t.completion_percentage,
            logDate: t.log_date, originalDate: t.original_date,
            calendarSync: t.calendar_sync, timeBlockEnabled: t.time_block_enabled,
            timeBlockStart: t.time_block_start, timeBlockEnd: t.time_block_end,
            hasBonus: t.has_bonus, delayCount: t.delay_count,
            isCoreDiscipline: t.is_core_discipline, coreDisciplineId: t.core_discipline_id,
            auditNotes: t.audit_notes,
          });
        });

        const earnings = {};
        earnRes.data.forEach(e => {
          earnings[e.date] = {
            R_calc: e.r_calc, E_base: e.e_base, P_base: e.p_base,
            P_potential: e.p_potential, D_tot: e.d_tot, M_pow: e.m_pow,
            newDebt: e.new_debt, claimed: e.claimed,
          };
        });

        const calendarToken = profileRes.data?.calendar_token ?? null;
        set({ dailyLogs, tasks, coreDisciplines: cdRes.data || [], earnings, calendarToken });
      },

      // ── Supabase: Push individual records ───────────────────────────────────
      syncTaskToSupabase: async (task) => {
        try {
          const user = await getUser();
          if (!user) return;
          const { error } = await supabase.from('tasks').upsert({
            id: task.id, user_id: user.id, log_date: task.logDate,
            name: task.name, tag: task.tag, type: task.type,
            weight: task.weight, damage: task.damage, recurrence: task.recurrence,
            status: task.status, completion_percentage: task.completionPercentage ?? 0,
            original_date: task.originalDate || task.logDate, delay_count: task.delayCount || 0,
            calendar_sync: task.calendarSync || false,
            time_block_enabled: task.timeBlockEnabled || false,
            time_block_start: task.timeBlockStart, time_block_end: task.timeBlockEnd,
            has_bonus: task.hasBonus || false, is_core_discipline: task.isCoreDiscipline || false,
            core_discipline_id: task.coreDisciplineId || null, audit_notes: task.auditNotes || '',
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

        // Inject only disciplines not already present
        const existingTasks = tasks[date] ?? [];
        const injectedIds = new Set(
          existingTasks.filter(t => t.isCoreDiscipline).map(t => t.coreDisciplineId)
        );
        const missing = coreDisciplines.filter(cd => cd.active !== false && !injectedIds.has(cd.id));
        if (missing.length > 0) {
          const injected = injectCoreDisciplines(missing, date);
          injected.forEach(t => addTask(date, t));
        }
      },

      // ── Task CRUD ────────────────────────────────────────────────────────────
      getTasksForDate: (date) => get().tasks[date] ?? [],

      addTask: (date, task) => {
        const id = task.id ?? crypto.randomUUID();
        const fullTask = { ...task, id, logDate: date };
        set((state) => {
          const newTasks = {
            ...state.tasks,
            [date]: [...(state.tasks[date] ?? []), fullTask],
          };
          syncToICSServer(newTasks);
          return { tasks: newTasks };
        });
        get().syncTaskToSupabase(fullTask);
        get().recalcEarnings(date);
      },

      updateTask: (date, taskId, updates) => {
        set((state) => {
          const updatedTasks = (state.tasks[date] ?? []).map(t => {
            if (t.id !== taskId) return t;
            const updated = { ...t, ...updates };
            get().syncTaskToSupabase(updated);
            return updated;
          });
          const newTasks = { ...state.tasks, [date]: updatedTasks };
          syncToICSServer(newTasks);
          return { tasks: newTasks };
        });
        get().recalcEarnings(date);
      },

      deleteTask: async (date, taskId) => {
        // Capture task before deletion to check calendarSync
        const taskToDelete = (get().tasks[date] ?? []).find(t => t.id === taskId);

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
        set((state) => ({
          coreDisciplines: state.coreDisciplines.filter(d => d.id !== id),
        }));
        getUser().then(user => {
          if (user) {
            supabase.from('core_disciplines').delete().eq('id', id).eq('user_id', user.id)
              .then(({ error }) => { if (error) console.error('Failed to delete core discipline in DB:', error); });
          }
        });
      },

      // ── Earnings Engine ───────────────────────────────────────────────────────
      recalcEarnings: (date) => {
        const { tasks, earnings } = get();
        const dayTasks = tasks[date] ?? [];
        const prevDate = format(addDays(new Date(date + 'T00:00:00'), -1), 'yyyy-MM-dd');
        const debtCarryover = earnings[prevDate]?.newDebt ?? 0;
        const result = calculateDayEarnings(dayTasks, debtCarryover);

        set((state) => {
          const updated = { ...result, claimed: state.earnings[date]?.claimed ?? false };
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
    }),
    {
      name: 'stronger-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useStore;
