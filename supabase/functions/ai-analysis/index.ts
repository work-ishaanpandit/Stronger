import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { timeView, userId, clientData } = body;
    if (!timeView || !userId) {
      return new Response(JSON.stringify({ error: 'Missing timeView or userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Verify auth via Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Determine date range based on timeView
    let days = 1;
    if (timeView === 'weekly') days = 7;
    else if (timeView === 'monthly') days = 30;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days + 1);
    const dateStr = pastDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    let tasks = [];
    let logs = [];
    let studySessions = [];
    let studyBlocks = [];

    // If client provided comprehensive context directly, use it
    if (clientData) {
      tasks = clientData.tasks || [];
      logs = clientData.logs || [];
      studySessions = clientData.studySessions || [];
      studyBlocks = clientData.studyBlocks || [];
    } else {
      // Otherwise fetch across all four core tables in Supabase
      const [tasksRes, logsRes, sessRes, blocksRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', userId).gte('log_date', dateStr),
        supabase.from('daily_logs').select('*').eq('user_id', userId).gte('date', dateStr),
        supabase.from('study_sessions').select('*').eq('user_id', userId).gte('date', dateStr),
        supabase.from('study_blocks').select('*').eq('user_id', userId),
      ]);

      tasks = (tasksRes.data || []).filter((t: any) => t.status !== 'cancelled');
      logs = logsRes.data || [];
      studySessions = sessRes.data || [];

      // Link study blocks to the sessions in this window
      const sessionIds = new Set(studySessions.map((s: any) => s.id));
      studyBlocks = (blocksRes.data || []).filter((b: any) => sessionIds.has(b.session_id));
    }

    // Compute key metrics
    const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'finished' || t.completion_percentage === 1 || t.completionPercentage === 1);
    const missedTasks = tasks.filter((t: any) => t.status === 'missed');
    const tasksWithNotes = tasks.filter((t: any) => (t.notes || '').trim().length > 0);
    const topicsStudied = [...new Set(studyBlocks.map((b: any) => b.topic || b.course).filter(Boolean))];

    let totalFocus = 0;
    let focusCount = 0;
    studyBlocks.forEach((b: any) => {
      const fr = b.focus_rating ?? b.focusRating;
      if (fr != null) {
        totalFocus += Number(fr);
        focusCount++;
      }
    });
    const avgFocus = focusCount > 0 ? (totalFocus / focusCount).toFixed(1) : null;

    // Prompt construction incorporating logs, task notes, and self study sessions
    const promptContext = `
You are the personal AI executive coach and study analyst in "Stronger" — a high-performance discipline and learning OS.
Analyze the user's authentic performance data over the past ${days} days (${dateStr} to ${todayStr}).

Synthesize across three interconnected pillars:
1. DAILY LOGS & REFLECTIONS: What they prioritized (Highlights), what they learned, and their evening reflections/epiphanies.
2. SELF STUDY SESSIONS: Deep work blocks, topics tackled, pre-study brain dumps, recall takeaways (actual accomplishments), and focus ratings (1-5).
3. TASKS & IN-TASK NOTES: Planned commitments, task execution, task notes, and audit reasons for delays.

=== DATA SUMMARY ===
• Period: ${days} days (${dateStr} to ${todayStr})
• Total Tasks: ${tasks.length} (Completed: ${completedTasks.length}, Missed: ${missedTasks.length})
• Tasks with In-Task Notes: ${tasksWithNotes.length}
• Study Sessions: ${studySessions.length} (${studyBlocks.length} work blocks)
• Topics/Courses Studied: ${topicsStudied.length > 0 ? topicsStudied.join(', ') : 'None'}
• Average Study Focus Rating: ${avgFocus ? avgFocus + '/5' : 'Unrated'}
• Daily Reflection Journals: ${logs.length} days logged

=== SELF STUDY SESSIONS & WORK BLOCKS ===
${studySessions.length === 0 ? 'No self study sessions recorded in this period.' : studySessions.map((s: any) => `
[Session Date: ${s.date}]
${(s.brain_dump || s.brainDump) ? `• Pre-Study Brain Dump: "${s.brain_dump || s.brainDump}"` : ''}
${studyBlocks.filter((b: any) => (b.session_id === s.id || b.sessionId === s.id || b.date === s.date)).map((b: any) => `  - Block: ${(b.course ? b.course + ' / ' : '')}${(b.topic || 'Untitled')} (Status: ${b.status}, Focus: ${b.focus_rating || b.focusRating || 'Unrated'}/5)
    Planned Outcome: ${b.planned_outcome || b.plannedOutcome || 'None'}
    Actual Accomplished / Learned: ${b.actual_outcome || b.actualOutcome || 'Not recorded'}
    Next Action: ${b.next_action || b.nextAction || 'None'}`).join('\n')}
`).join('\n')}

=== TASKS & IN-TASK NOTES ===
${tasks.length === 0 ? 'No tasks recorded in this period.' : tasks.map((t: any) => `
• [${t.log_date || t.date || 'unassigned'}] ${t.name || t.title} (Status: ${t.status}${t.tag ? ', #' + t.tag : ''})
  ${t.notes ? `In-Task Notes: "${String(t.notes).replace(/\n+/g, ' ')}"` : ''}
  ${(t.audit_notes || t.auditNotes) ? `Audit Note: "${t.audit_notes || t.auditNotes}"` : ''}
  ${t.deadline ? `Deadline: ${t.deadline}` : ''}
`).join('\n')}

=== DAILY JOURNALS & REFLECTIONS ===
${logs.length === 0 ? 'No daily journals logged in this period.' : logs.map((l: any) => `
[Date: ${l.date}]
• Today's Highlight: ${l.highlight || 'None'}
• What I Learned: ${l.learned_notes || l.learnedNotes || 'None'}
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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API Key missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Try valid Gemini models in sequence
    const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash'];
    let geminiRes: any = null;
    let lastErrText = '';

    for (const model of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      try {
        geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptContext }] }],
          }),
        });

        if (geminiRes.ok) break;
        lastErrText = await geminiRes.text();
      } catch (err: any) {
        lastErrText = err.message;
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      return new Response(JSON.stringify({ error: `Gemini API error: ${lastErrText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const geminiData = await geminiRes.json();
    let textResult = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

    const resultJson = JSON.parse(textResult);

    // Attach data summary metadata for complete user transparency
    resultJson.dataSummary = {
      days,
      tasksAnalyzed: tasks.length,
      tasksWithNotes: tasksWithNotes.length,
      studyBlocksAnalyzed: studyBlocks.length,
      logsAnalyzed: logs.length,
      topics: topicsStudied,
    };

    return new Response(JSON.stringify(resultJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
