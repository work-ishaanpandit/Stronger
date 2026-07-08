/**
 * Stronger — Local ICS Calendar Server (v2)
 * Runs on port 3001 alongside the Vite dev server in WSL.
 *
 * Endpoints:
 *   GET  /calendar.ics      → Apple Calendar-compatible iCal feed
 *   POST /api/sync          → Accepts task JSON from the React app
 *   DELETE /api/sync/:id    → Removes a task from the feed by ID
 *   GET  /health            → Health check
 *
 * Subscribe: webcal://localhost:3001/calendar.ics
 *
 * NOTE: In production (ishaanpandit.work), Apple Calendar uses the Supabase
 * Edge Function instead which runs on HTTPS automatically.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE  = path.join(__dirname, 'calendar-data.json');
const PORT = 3001;

// ── ICS Helpers ───────────────────────────────────────────────────────────────

/** Convert local YYYY-MM-DD + HH:MM to UTC iCal timestamp string. */
function toUTCStamp(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min]  = timeStr.split(':').map(Number);
  const dt = new Date(y, m - 1, d, h, min, 0);
  return dt.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

/** YYYY-MM-DD → YYYYMMDD for all-day events. */
function toAllDay(dateStr) {
  return dateStr.replace(/-/g, '');
}

/** Next calendar day in YYYYMMDD format (all-day DTEND is exclusive). */
function nextDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Escape special ICS characters. */
function esc(str) {
  return (str ?? '').toString()
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** Build the SUMMARY line per spec: [TYPE] - Name - W:X or D:₹X */
function buildSummary(task) {
  const TYPE_LABELS = {
    normal: 'NORMAL', power: 'POWER',
    kickass: 'KICKASS', uncritical: 'UNCRITICAL',
  };
  const typeLabel = TYPE_LABELS[task.type] || 'TASK';
  let title = `[${typeLabel}] - ${task.name}`;

  if (task.type === 'normal' && task.weight > 0) {
    title += ` - W:${task.weight}`;
  } else if (task.type === 'kickass' && task.damage > 0) {
    title += ` - D:\u20b9${task.damage}`;
  }
  return title;
}

/** Generate the full iCal document from a flat task array. */
function generateICS(tasks) {
  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const synced = tasks.filter(t => t.calendarSync);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stronger//Discipline Ledger 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Stronger',
    'X-WR-CALDESC:Discipline schedule from Stronger',
    'X-APPLE-CALENDAR-COLOR:#0A84FF',
  ];

  // Placeholder event so Apple Calendar validates even when no tasks exist
  if (synced.length === 0) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:stronger-init@stronger.app`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${today}`,
      `DTEND;VALUE=DATE:${nextDay(new Date().toISOString().slice(0, 10))}`,
      'SUMMARY:Stronger Calendar — Active',
      'DESCRIPTION:Enable Calendar Sync on a task to see it here.',
      'STATUS:TENTATIVE',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }

  for (const task of synced) {
    if (!task.logDate) continue;

    const uid     = `stronger-${task.id}@stronger.app`;
    const summary = esc(buildSummary(task));
    const desc    = esc(`Tag: ${task.tag || 'None'} | Status: ${task.status || 'pending'}`);
    const status  = task.status === 'completed' ? 'CONFIRMED'
                  : task.status === 'missed'    ? 'CANCELLED' : 'TENTATIVE';

    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`);

    if (task.timeBlockEnabled && task.timeBlockStart) {
      // Timed block
      const dtStart = toUTCStamp(task.logDate, task.timeBlockStart);
      const rawEnd  = task.timeBlockEnd || task.timeBlockStart;
      const dtEnd   = toUTCStamp(task.logDate, rawEnd);
      lines.push(`DTSTART:${dtStart}`, `DTEND:${dtEnd}`);
    } else {
      // All-day event
      lines.push(
        `DTSTART;VALUE=DATE:${toAllDay(task.logDate)}`,
        `DTEND;VALUE=DATE:${nextDay(task.logDate)}`,
      );
    }

    lines.push(
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      ...(task.tag ? [`CATEGORIES:${esc(task.tag)}`] : []),
      `STATUS:${status}`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

// ── Persistence ───────────────────────────────────────────────────────────────

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (_) {}
  return { tasks: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Server ────────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed   = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // ── GET /calendar.ics ─────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname.endsWith('.ics')) {
    const { tasks } = loadData();
    const ics = generateICS(tasks);
    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="stronger.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    });
    res.end(ics);
    console.log(`[ICS] Served — ${tasks.filter(t => t.calendarSync).length} synced events`);
    return;
  }

  // ── GET /health ───────────────────────────────────────────────────────────
  if (req.method === 'GET' && pathname === '/health') {
    const { tasks } = loadData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', tasks: tasks.length, synced: tasks.filter(t => t.calendarSync).length }));
    return;
  }

  // ── POST /api/sync ────────────────────────────────────────────────────────
  if (req.method === 'POST' && pathname === '/api/sync') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { tasks: incoming = [] } = JSON.parse(body);
        const data = loadData();
        const map = new Map(data.tasks.map(t => [t.id, t]));
        incoming.forEach(t => map.set(t.id, t));
        const merged = [...map.values()];
        saveData({ tasks: merged, lastSync: new Date().toISOString() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, total: merged.length }));
        console.log(`[SYNC] ${incoming.length} tasks upserted — total: ${merged.length}`);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // ── DELETE /api/sync/:taskId ──────────────────────────────────────────────
  if (req.method === 'DELETE' && pathname.startsWith('/api/sync/')) {
    const taskId = pathname.replace('/api/sync/', '');
    if (!taskId) { res.writeHead(400); res.end('Missing taskId'); return; }
    const data = loadData();
    const before = data.tasks.length;
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    saveData(data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, removed: before - data.tasks.length }));
    console.log(`[DELETE] Task ${taskId} removed from calendar`);
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  \u2605  Stronger ICS Calendar Server v2');
  console.log(`  \u279c  Health:    http://localhost:${PORT}/health`);
  console.log(`  \u279c  ICS Feed:  http://localhost:${PORT}/calendar.ics`);
  console.log(`  \u279c  Apple Cal: webcal://localhost:${PORT}/calendar.ics`);
  console.log('');
  console.log('  On iPhone/iPad (same WiFi network):');
  console.log('  Find your WSL IP: run "hostname -I" in WSL, then use that IP instead of localhost');
  console.log('');
});
