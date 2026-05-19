/**
 * AI helper — powered by Claude (Anthropic)
 * Model: claude-haiku-4-5-20251001 (fast, cost-efficient, ideal for field drafting)
 * API key set via VITE_GEMINI_KEY env var.
 * Get a key at: https://console.anthropic.com
 *
 * All function signatures are identical to the previous version —
 * no other files need to change.
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;


/**
 * Core call — takes a prompt string, returns the text response.
 * Throws a readable error if the key is missing or the API fails.
 */
async function geminiPrompt(prompt) {
  if (!GEMINI_KEY) {
    throw new Error('No Gemini API key set. Add VITE_GEMINI_KEY to your .env.local file.');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

// ─── Feature 1: Draft executive summary from activity entries ─────────────────

export async function draftExecutiveSummary({ projectName, logDate, entries, issues }) {
  const entryLines = entries.map(e => `  [${e.time_stamp}] ${e.content}`).join('\n');
  const issueLines = issues.length
    ? issues.map(i => `  #${i.issue_number} (${i.status}) — ${i.description}`).join('\n')
    : '  None logged.';

  const prompt = `You are a field commissioning engineer writing a formal daily report for a T&C / SAT project.

Project: ${projectName}
Date: ${logDate}

Activity log entries for today:
${entryLines}

Issues / action items logged today:
${issueLines}

Write a concise, professional Executive Summary paragraph (3–5 sentences) suitable for a daily field report.
- Write in past tense, third person ("Testing was conducted...", "The team completed...")
- Summarize the key work accomplished, any notable findings, and overall day status
- Do NOT use bullet points — flowing prose only
- Do NOT fabricate details not present in the entries above
- Keep it under 120 words`;

  return geminiPrompt(prompt);
}

// ─── Feature 2: Draft lookahead from open issues + punch items ────────────────

export async function draftLookahead({ projectName, issues, punchItems }) {
  const openIssues = issues.filter(i => i.status !== 'Closed');
  const openPunch  = punchItems.filter(p => p.status !== 'Closed');

  const issueLine = openIssues.length
    ? openIssues.map(i => `  #${i.issue_number} — ${i.description}${i.owner ? ` (Owner: ${i.owner})` : ''}${i.target_date ? ` [Target: ${i.target_date}]` : ''}`).join('\n')
    : '  None.';

  const punchLine = openPunch.length
    ? openPunch.map(p => `  #${p.item_number} — ${p.description}${p.owner ? ` (Owner: ${p.owner})` : ''}`).join('\n')
    : '  None.';

  const prompt = `You are a field commissioning engineer writing the Lookahead section of a daily T&C report.

Project: ${projectName}

Open issues from today's log:
${issueLine}

Outstanding punch list items:
${punchLine}

Write a concise Lookahead paragraph (2–4 sentences) describing planned activities and follow-up actions for the next working day.
- Write in future tense ("Tomorrow, the team will...", "Follow-up is required on...")
- Prioritize items by urgency — open issues with target dates first
- Do NOT use bullet points — flowing prose only
- Do NOT fabricate details not present above
- Keep it under 80 words`;

  return geminiPrompt(prompt);
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

  return geminiPrompt(prompt);
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

  return geminiPrompt(prompt);
}
