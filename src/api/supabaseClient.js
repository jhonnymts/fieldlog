/**
 * Supabase client adapter
 * Drop-in replacement for pocketbaseClient.js
 * Uses Supabase REST API directly — no SDK needed.
 * Same entity API shape: .filter(), .list(), .create(), .update(), .delete(), .bulkCreate()
 *
 * Env vars required:
 *   VITE_SUPABASE_URL  — e.g. https://xyzxyzxyz.supabase.co
 *   VITE_SUPABASE_ANON_KEY — the anon/public key from Supabase project settings
 */

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Low-level fetch helper ───────────────────────────────────────────────────

async function sbFetch(table, options = {}) {
  const { path = '', method = 'GET', body, params } = options;

  const url = new URL(`${SB_URL}/rest/v1/${table}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = {
    'apikey': SB_KEY,
    'Authorization': `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (method === 'POST') headers['Prefer'] = 'return=representation';
  if (method === 'PATCH') headers['Prefer'] = 'return=representation';

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.hint || err.error || `Supabase error ${res.status}: ${res.statusText}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ─── Build Supabase filter params from a plain object ─────────────────────────
// e.g. { project_id: "abc" } → { project_id: "eq.abc" }
// e.g. { id: "abc" }        → { id: "eq.abc" }

function buildFilterParams(filterObj) {
  if (!filterObj) return {};
  return Object.fromEntries(
    Object.entries(filterObj)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, `eq.${v}`])
  );
}

// ─── Map sort field from PocketBase syntax to Supabase syntax ─────────────────
// PocketBase: 'sort_order' or '-created'
// Supabase:   'order=sort_order.asc' or 'order=created.desc'

function buildOrderParam(sortField) {
  if (!sortField) return null;
  if (sortField.startsWith('-')) return `${sortField.slice(1)}.desc`;
  return `${sortField}.asc`;
}

// ─── Entity factory ───────────────────────────────────────────────────────────

function createEntityClient(table) {
  return {
    async list(sortField) {
      const params = { select: '*' };
      const order = buildOrderParam(sortField);
      if (order) params.order = order;
      const result = await sbFetch(table, { params });
      return Array.isArray(result) ? result : [];
    },

    async filter(filterObj, sortField) {
      const params = { select: '*', ...buildFilterParams(filterObj) };
      const order = buildOrderParam(sortField);
      if (order) params.order = order;
      const result = await sbFetch(table, { params });
      // Supabase always returns an array — return it directly
      return Array.isArray(result) ? result : [];
    },

    async create(payload) {
      const result = await sbFetch(table, { method: 'POST', body: payload });
      // Supabase returns array on insert — return first item
      return Array.isArray(result) ? result[0] : result;
    },

    async update(id, payload) {
      const result = await sbFetch(table, {
        method: 'PATCH',
        body: payload,
        params: { id: `eq.${id}` },
      });
      return Array.isArray(result) ? result[0] : result;
    },

    async delete(id) {
      return sbFetch(table, {
        method: 'DELETE',
        params: { id: `eq.${id}` },
      });
    },

    async bulkCreate(payloads) {
      const results = [];
      for (const payload of payloads) {
        const record = await sbFetch(table, { method: 'POST', body: payload });
        results.push(Array.isArray(record) ? record[0] : record);
      }
      return results;
    },
  };
}

// ─── Exported client — same shape as pocketbaseClient ────────────────────────

export const sb = {
  entities: {
    Project:   createEntityClient('projects'),
    DailyLog:  createEntityClient('daily_logs'),
    LogEntry:  createEntityClient('log_entries'),
    IssueItem: createEntityClient('issue_items'),
    Asset:     createEntityClient('assets'),
    PunchItem: createEntityClient('punch_items'),
  },
};

// Re-export as `base44` so all existing page imports work without any changes
export const base44 = sb;
