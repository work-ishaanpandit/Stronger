import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

// Timezone-safe inclusive/exclusive dates for all-day events
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

function toUTCStamp(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min]  = timeStr.split(':').map(Number);
  // Parse in local Deno server timezone, output as ISO UTC
  const dt = new Date(y, m - 1, d, h, min, 0);
  return dt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

function buildSummary(task: any) {
  const TYPE_LABELS: Record<string, string> = {
    normal: 'NORMAL', power: 'POWER',
    kickass: 'KICKASS', uncritical: 'UNCRITICAL',
  };
  const typeLabel = TYPE_LABELS[task.type] || 'TASK';
  let title = `[${typeLabel}] - ${task.name}`;

  if (task.type === 'normal' && task.weight > 0) {
    title += ` - W:${task.weight}`;
  } else if (task.type === 'kickass' && task.damage > 0) {
    title += ` - D:₹${task.damage}`;
  }
  return title;
}

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const token = url.searchParams.get("token");

    if (!userId || !token) {
      return new Response("Missing user_id or token", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch tasks where calendar_sync is true for this user
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("calendar_sync", true);

    if (error) throw error;

    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    // Generate iCalendar (.ics) format
    let icsContent = "BEGIN:VCALENDAR\r\n";
    icsContent += "VERSION:2.0\r\n";
    icsContent += "PRODID:-//Stronger//Discipline Ledger 2.0//EN\r\n";
    icsContent += "CALSCALE:GREGORIAN\r\n";
    icsContent += "METHOD:PUBLISH\r\n";
    icsContent += "X-WR-CALNAME:Stronger\r\n";
    icsContent += `X-WR-CALDESC:Discipline schedule for ${userId}\r\n`;
    icsContent += "X-APPLE-CALENDAR-COLOR:#0A84FF\r\n";

    if (!tasks || tasks.length === 0) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `UID:stronger-init@stronger.app\r\n`;
      icsContent += `DTSTAMP:${now}\r\n`;
      icsContent += `DTSTART;VALUE=DATE:${today}\r\n`;
      icsContent += `DTEND;VALUE=DATE:${nextDay(new Date().toISOString().slice(0, 10))}\r\n`;
      icsContent += "SUMMARY:Stronger Calendar — Active\r\n";
      icsContent += "DESCRIPTION:Enable Calendar Sync on a task to see it here.\r\n";
      icsContent += "STATUS:TENTATIVE\r\n";
      icsContent += "TRANSP:TRANSPARENT\r\n";
      icsContent += "END:VEVENT\r\n";
    } else {
      tasks.forEach(task => {
        const uid = `stronger-${task.id}@stronger.app`;
        const summary = buildSummary(task);
        const desc = `Tag: ${task.tag || 'None'} | Status: ${task.status || 'pending'}`;
        const status = task.status === 'completed' ? 'CONFIRMED'
                     : task.status === 'missed'    ? 'CANCELLED' : 'TENTATIVE';

        icsContent += "BEGIN:VEVENT\r\n";
        icsContent += `UID:${uid}\r\n`;
        icsContent += `DTSTAMP:${now}\r\n`;

        if (task.time_block_enabled && task.time_block_start) {
          const dtStart = toUTCStamp(task.log_date, task.time_block_start);
          const rawEnd  = task.time_block_end || task.time_block_start;
          const dtEnd   = toUTCStamp(task.log_date, rawEnd);
          icsContent += `DTSTART:${dtStart}\r\n`;
          icsContent += `DTEND:${dtEnd}\r\n`;
        } else {
          icsContent += `DTSTART;VALUE=DATE:${toAllDay(task.log_date)}\r\n`;
          icsContent += `DTEND;VALUE=DATE:${nextDay(task.log_date)}\r\n`;
        }

        icsContent += `SUMMARY:${summary}\r\n`;
        icsContent += `DESCRIPTION:${desc}\r\n`;
        if (task.tag) icsContent += `CATEGORIES:${task.tag}\r\n`;
        icsContent += `STATUS:${status}\r\n`;
        icsContent += "TRANSP:OPAQUE\r\n";
        icsContent += "END:VEVENT\r\n";
      });
    }

    icsContent += "END:VCALENDAR\r\n";

    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="stronger-calendar.ics"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
