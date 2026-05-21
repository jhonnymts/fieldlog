/**
 * Supabase client
 * Uses @supabase/supabase-js for auth session management.
 * Entity API shape: .filter(), .list(), .create(), .update(), .delete(), .bulkCreate()
 * Auth token is automatically attached to every request via the SDK session.
 */

import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Supabase JS client (used for auth + RLS-aware requests) ──────────────────
export const supabase = createClient(SB_URL, SB_KEY);

// ─── Low-level fetch helper — uses SDK session token automatically ─────────────
async function sbFetch(table, options = {}) {
  const { path = '', method = 'GET', body, params } = options;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SB_KEY;

  const url = new URL(`${SB_URL}/rest/v1/${table}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers = {
    'apikey':        SB_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };

  if (method === 'POST')  headers['Prefer'] = 'return=representation';
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
function buildFilterParams(filterObj) {
  if (!filterObj) return {};
  return Object.fromEntries(
    Object.entries(filterObj)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, `eq.${v}`])
  );
}

// ─── Map sort field ────────────────────────────────────────────────────────────
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
      return Array.isArray(result) ? result : [];
    },

    async create(payload) {
      const result = await sbFetch(table, { method: 'POST', body: payload });
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

    // BUG FIX: was looping one POST per row — now sends a single batch POST array
    // Supabase PostgREST accepts an array body and inserts all rows in one request
    async bulkCreate(payloads) {
      if (!payloads || payloads.length === 0) return [];
      const result = await sbFetch(table, { method: 'POST', body: payloads });
      return Array.isArray(result) ? result : [result];
    },
  };
}

// ─── FieldLog client ──────────────────────────────────────────────────────────
export const fieldlog = {
  entities: {
    Project:     createEntityClient('projects'),
    DailyLog:    createEntityClient('daily_logs'),
    LogEntry:    createEntityClient('log_entries'),
    IssueItem:   createEntityClient('issue_items'),
    Asset:       createEntityClient('assets'),
    PunchItem:   createEntityClient('punch_items'),
    UserProfile: createEntityClient('user_profiles'),
  },
};
