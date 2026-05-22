/**
 * AI helper — powered by Groq
 * Model: llama-3.1-8b-instant (free tier, ~14,400 req/day)
 * API key set via VITE_GROQ_KEY env var.
 * Get a free key at: https://console.groq.com
 *
 * Groq uses the OpenAI-compatible chat completions API shape.
 */

const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.1-8b-instant';

async function groqPrompt(prompt) {
  if (!GROQ_KEY) {
    throw new Error('No Groq API key set. Add VITE_GROQ_KEY to your .env.local file.');
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:       MODEL,
      temperature: 0.4,
      max_tokens:  1024,
      messages:    [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ─── Build asset context block for prompts ────────────────────────────────────
function buildAssetContext(assets = []) {
  if (!assets.length) return '  None on record.';
  return assets
    .map(a => `  [${a.asset_id}] ${a.asset_name} (${a.asset_type || 'Other'}) — Status: ${a.status || 'In Progress'}${a.notes ? ` | Notes: ${a.notes}` : ''}`)
    .join('\n');
}

// ─── Feature 1: Draft executive summary from activity entries ─────────────────

export async function draftExecutiveSummary({ projectName, logDate, entries, issues, assets = [] }) {
  const entryLines = entries.map(e => `  [${e.time_stamp}] ${e.content}`).join('\n');
  const issueLines = issues.length
    ? issues.map(i => `  #${i.issue_number} (${i.status}) — ${i.description}`).join('\n')
    : '  None logged.';
  const assetLines = buildAssetContext(assets);

  const prompt = `You are a field commissioning engineer writing a formal daily report for a T&C / SAT project.

Project: ${projectName}
Date: ${logDate}

Activity log entries for today:
${entryLines}

Issues / action items logged today:
${issueLines}

Asset / equipment status as of today:
${assetLines}

Write a concise, professional Executive Summary paragraph (3–5 sentences) suitable for a daily field report.
- Write in past tense, third person ("Testing was conducted...", "The team completed...")
- Summarize the key work accomplished, reference specific assets or equipment by name where relevant to today's entries
- Note overall asset completion progress if meaningful (e.g. "X of Y assets are now complete")
- Do NOT use bullet points — flowing prose only
- Do NOT fabricate details not present in the entries or asset list above
- Keep it under 130 words`;

  return groqPrompt(prompt);
}

// ─── Feature 2: Draft lookahead from open issues + punch items + assets ────────

export async function draftLookahead({ projectName, issues, punchItems, assets = [] }) {
  const openIssues = issues.filter(i => i.status !== 'Closed');
  const openPunch  = punchItems.filter(p => p.status !== 'Closed');
  const inProgress = assets.filter(a => a.status === 'In Progress' || a.status === 'Open Issue' || a.status === 'Failed');

  const issueLine = openIssues.length
    ? openIssues.map(i => `  #${i.issue_number} — ${i.description}${i.owner ? ` (Owner: ${i.owner})` : ''}${i.target_date ? ` [Target: ${i.target_date}]` : ''}`).join('\n')
    : '  None.';

  const punchLine = openPunch.length
    ? openPunch.map(p => `  #${p.item_number} — ${p.description}${p.owner ? ` (Owner: ${p.owner})` : ''}`).join('\n')
    : '  None.';

  const assetLine = inProgress.length
    ? inProgress.map(a => `  [${a.asset_id}] ${a.asset_name} — ${a.status}`).join('\n')
    : '  None — all assets complete or deferred.';

  const prompt = `You are a field commissioning engineer writing the Lookahead section of a daily T&C report.

Project: ${projectName}

Open issues from today's log:
${issueLine}

Outstanding punch list items:
${punchLine}

Assets still requiring work (In Progress / Open Issue / Failed):
${assetLine}

Write a concise Lookahead paragraph (2–4 sentences) describing planned activities and follow-up actions for the next working day.
- Write in future tense ("Tomorrow, the team will...", "Follow-up is required on...")
- Prioritize open issues with target dates first, then assets still requiring attention
- Reference specific asset IDs or names where relevant
- Do NOT use bullet points — flowing prose only
- Do NOT fabricate details not present above
- Keep it under 90 words`;

  return groqPrompt(prompt);
}

// ─── Feature 3: Punch list narrative for formal report inclusion ──────────────

export async function draftPunchNarrative({ projectName, items }) {
  const open   = items.filter(i => i.status !== 'Closed');
  const closed = items.filter(i => i.status === 'Closed');

  const itemLines = items.map(i =>
    `  #${i.item_number} [${i.status}] — ${i.description}${i.owner ? ` (Owner: ${i.owner})` : ''}${i.date_closed ? ` — Closed ${i.date_closed}` : ''}`
  ).join('\n');

  const prompt = `You are a field commissioning engineer writing a formal punch list summary for inclusion in a project closeout or status report.

Project: ${projectName}
Total items: ${items.length} (${open.length} open / ${closed.length} closed)

Punch list:
${itemLines}

Write a formal summary paragraph (3–5 sentences) suitable for a project status report.
- Summarize overall punch list status, highlight any critical open items, and note closed items
- Write in professional engineering report style — third person, past/present tense as appropriate
- Do NOT use bullet points — flowing prose only
- Do NOT fabricate details not listed above
- Keep it under 150 words`;

  return groqPrompt(prompt);
}

// ─── Feature 4: Clean up a rough field entry into proper log language ─────────

export async function cleanupEntry(rawText) {
  const prompt = `You are a field commissioning engineer writing a formal activity log entry for a daily T&C / SAT report.

Convert the following rough field shorthand into a single, professional log entry sentence.
- Write in past tense, active voice ("Performed stroke test on XV-2201...")
- Expand abbreviations where the meaning is clear from context
- Keep technical tag names (valve numbers, instrument tags, etc.) exactly as written
- Return ONLY the cleaned-up sentence — no preamble, no explanation, no quotes

Raw entry: "${rawText}"`;

  return groqPrompt(prompt);
}
