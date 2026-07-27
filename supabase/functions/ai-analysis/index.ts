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
    const { timeView, userId } = await req.json();
    if (!timeView || !userId) {
      return new Response(JSON.stringify({ error: 'Missing timeView or userId' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    // Verify auth via Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Create client using the user's auth context
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || user.id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // Determine date range based on timeView
    let days = 1;
    if (timeView === 'weekly') days = 7;
    else if (timeView === 'monthly') days = 30;
    
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days + 1);
    const dateStr = pastDate.toISOString().split('T')[0];

    // Fetch data for context
    const [tasksRes, logsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', userId).gte('log_date', dateStr),
      supabase.from('daily_logs').select('*').eq('user_id', userId).gte('date', dateStr),
    ]);

    if (tasksRes.error || logsRes.error) {
       return new Response(JSON.stringify({ error: 'Failed to fetch data' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    // Filter out cancelled tasks from the analysis
    const tasks = (tasksRes.data || []).filter(t => t.status !== 'cancelled');
    const logs = logsRes.data || [];

    // Extract hashtags
    const hashtags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];

    // Prompt construction
    const promptContext = `
I am providing you with the task and journaling data of a user for the past ${days} days.
Please act as an insightful, highly analytical AI coach. 
Analyze the data and provide a concise pattern recognition summary.

Task Data summary:
- Total tasks planned: ${tasks.length}
- Completed tasks: ${tasks.filter(t => t.status === 'completed' || t.status === 'finished' || t.status === 'partly_done').length}
- Missed tasks: ${tasks.filter(t => t.status === 'missed').length}
- Postponed tasks: ${tasks.filter(t => t.status?.startsWith('postponed')).length}
- Key themes (hashtags): ${hashtags.length > 0 ? hashtags.join(', ') : 'None'}

Notable Task Audit Notes:
${tasks.filter(t => t.audit_notes?.trim()).map(t => `- [${t.log_date}] ${t.name}: ${t.audit_notes}`).join('\n') || 'None'}

Daily Journaling (Last ${days} days):
${logs.map(l => `- [${l.date}] 
  What I Learned Today: ${l.learned_notes || 'None'}
  Daily Reflection: ${l.reflection || 'None'}
  Epiphany: ${l.epiphany || 'None'}`).join('\n') || 'None'}

Based on this, generate a JSON response with exactly this structure:
{
  "title": "A short engaging title for the insight (e.g. Consistency Peak, or Energy Dip)",
  "insight": "A 2-3 sentence insightful observation about their patterns (e.g. 'You tend to miss tasks when your journal reflection mentions low energy...'). Focus on actionable or hidden correlations.",
  "score": "A number out of 100 representing their discipline score for this period"
}
ONLY return the raw JSON object, no markdown, no backticks.
    `;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API Key missing' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    // Call Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptContext }] }]
      }),
    });

    if (!geminiRes.ok) {
       const errText = await geminiRes.text();
       
       // If model not found, let's fetch the list of available models to see what we can use in 2026
       if (geminiRes.status === 404) {
         try {
           const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
           const modelsData = await modelsRes.json();
           const modelNames = modelsData.models?.map((m: any) => m.name).join(', ') || 'Unknown models';
           return new Response(JSON.stringify({ error: `Model not found. Available models: ${modelNames}. Original error: ${errText}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
         } catch (listErr) {
           // Ignore list errors
         }
       }
       
       return new Response(JSON.stringify({ error: `Gemini API error: ${errText}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
    }

    const geminiData = await geminiRes.json();
    let textResult = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    // Clean up potential markdown formatting if the model still adds it
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const resultJson = JSON.parse(textResult);

    return new Response(JSON.stringify(resultJson), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
