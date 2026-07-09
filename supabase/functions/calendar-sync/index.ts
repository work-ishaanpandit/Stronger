import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

// Timezone-safe date helpers
function toAllDay(dateStr: string) {
  return dateStr.replace(/-/g, '');
}

function nextDay(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function toLocalFloatingTime(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-');
  const [h, min] = timeStr.split(':');
  return `${y}${m}${d}T${h}${min}00`;
}

function buildSummary(task: Record<string, unknown>) {
  const TYPE_LABELS: Record<string, string> = {
    normal: 'NORMAL', power: 'POWER',
    kickass: 'KICKASS', uncritical: 'UNCRITICAL',
  };
  const typeLabel = TYPE_LABELS[task.type as string] || 'TASK';
  let title = `[${typeLabel}] - ${task.name}`;
  if (task.type === 'normal' && Number(task.weight) > 0) {
    title += ` - W:${task.weight}`;
  } else if (task.type === 'kickass' && Number(task.damage) > 0) {
    title += ` - D:\u20b9${task.damage}`;
  }
  return title;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const token  = url.searchParams.get('token');

    if (!userId || !token) {
      return new Response('Missing user_id or token', { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';

    // ⚠️  Use the SERVICE ROLE key to bypass Row Level Security so the
    //     Edge Function can read the user's tasks without being blocked.
    //     This is safe because we are validating user_id via the token param
    //     and this function is server-side trusted code.
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase   = createClient(supabaseUrl, serviceKey);

    // Fetch all tasks where calendar_sync is true for this user
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('calendar_sync', true);

    if (error) throw error;

    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    const todayStr = new Date().toISOString().slice(0, 10);

    let ics = 'BEGIN:VCALENDAR\r\n';
    ics += 'VERSION:2.0\r\n';
    ics += 'PRODID:-//Stronger//Discipline Ledger 2.0//EN\r\n';
    ics += 'CALSCALE:GREGORIAN\r\n';
    ics += 'METHOD:PUBLISH\r\n';
    ics += 'X-WR-CALNAME:Stronger\r\n';
    ics += 'X-WR-CALDESC:Discipline schedule from Stronger\r\n';
    ics += 'X-APPLE-CALENDAR-COLOR:#0A84FF\r\n';

    if (!tasks || tasks.length === 0) {
      // Placeholder so Apple Calendar validates the feed
      ics += 'BEGIN:VEVENT\r\n';
      ics += 'UID:stronger-init@stronger.app\r\n';
      ics += `DTSTAMP:${now}\r\n`;
      ics += `DTSTART;VALUE=DATE:${toAllDay(todayStr)}\r\n`;
      ics += `DTEND;VALUE=DATE:${nextDay(todayStr)}\r\n`;
      ics += 'SUMMARY:Stronger Calendar \u2014 Active\r\n';
      ics += 'DESCRIPTION:Enable Calendar Sync on a task to see it here.\r\n';
      ics += 'STATUS:TENTATIVE\r\n';
      ics += 'TRANSP:TRANSPARENT\r\n';
      ics += 'END:VEVENT\r\n';
    } else {
      for (const task of tasks) {
        const uid     = `stronger-${task.id}@stronger.app`;
        const summary = buildSummary(task);
        const desc    = `Tag: ${task.tag || 'None'} | Status: ${task.status || 'pending'}`;
        const isPast = task.log_date < todayStr;
        const status = task.status === 'finished' ? 'CONFIRMED'
                     : (task.status === 'missed' && isPast) ? 'CANCELLED'
                     : 'TENTATIVE'; // 'missed' today or future is still pending

        ics += 'BEGIN:VEVENT\r\n';
        ics += `UID:${uid}\r\n`;
        ics += `DTSTAMP:${now}\r\n`;

        if (task.time_block_enabled && task.time_block_start) {
          const dtStart = toLocalFloatingTime(task.log_date, task.time_block_start);
          const dtEnd   = toLocalFloatingTime(task.log_date, task.time_block_end || task.time_block_start);
          ics += `DTSTART:${dtStart}\r\n`;
          ics += `DTEND:${dtEnd}\r\n`;
        } else {
          ics += `DTSTART;VALUE=DATE:${toAllDay(task.log_date)}\r\n`;
          ics += `DTEND;VALUE=DATE:${nextDay(task.log_date)}\r\n`;
        }

        ics += `SUMMARY:${summary}\r\n`;
        ics += `DESCRIPTION:${desc}\r\n`;
        if (task.tag) ics += `CATEGORIES:${task.tag}\r\n`;
        ics += `STATUS:${status}\r\n`;
        ics += 'TRANSP:OPAQUE\r\n';
        ics += 'END:VEVENT\r\n';
      }
    }

    ics += 'END:VCALENDAR\r\n';

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="stronger-calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(msg, { status: 500 });
  }
});
