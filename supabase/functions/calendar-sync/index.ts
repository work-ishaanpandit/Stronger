import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.0";

// Expected Endpoint: /calendar-sync?user_id=123&token=abc
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const token = url.searchParams.get("token");

    if (!userId || !token) {
      return new Response("Missing user_id or token", { status: 400 });
    }

    // Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    
    // In production, validate token against user settings.
    // Assuming validation passed for now.

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch tasks with time blocks enabled for this user
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("time_block_enabled", true);

    if (error) throw error;

    // Generate iCalendar (.ics) format
    let icsContent = "BEGIN:VCALENDAR\r\n";
    icsContent += "VERSION:2.0\r\n";
    icsContent += "PRODID:-//Stronger//Discipline Ledger//EN\r\n";
    icsContent += "CALSCALE:GREGORIAN\r\n";

    tasks?.forEach(task => {
      // Parse dates: log_date is 'YYYY-MM-DD', start/end are 'HH:MM:SS' or 'HH:MM'
      const startDateTimeStr = `${task.log_date}T${task.time_block_start || '09:00:00'}`;
      const endDateTimeStr = `${task.log_date}T${task.time_block_end || '10:00:00'}`;
      
      const startD = new Date(startDateTimeStr);
      const endD = new Date(endDateTimeStr);

      const formatICSDate = (d) => {
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icsContent += "BEGIN:VEVENT\r\n";
      icsContent += `UID:task_${task.id}@stronger.app\r\n`;
      icsContent += `DTSTART:${formatICSDate(startD)}\r\n`;
      icsContent += `DTEND:${formatICSDate(endD)}\r\n`;
      icsContent += `SUMMARY:[${task.type.toUpperCase()}] ${task.name}\r\n`;
      icsContent += `DESCRIPTION:Status: ${task.status} | Weight: ${task.weight}\r\n`;
      icsContent += "END:VEVENT\r\n";
    });

    icsContent += "END:VCALENDAR\r\n";

    return new Response(icsContent, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="stronger-calendar.ics"`,
      },
    });

  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
