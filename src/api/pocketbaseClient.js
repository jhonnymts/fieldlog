/**
 * PocketBase client adapter
 * Drop-in replacement for base44Client.js
 * Mirrors the base44 entity API shape: .filter(), .list(), .create(), .update(), .delete(), .bulkCreate()
 */

const PB_URL = import.meta.env.VITE_PB_URL;

// ─── Low-level fetch helper ───────────────────────────────────────────────────

async function pbFetch(path, options = {}) {
  const res = await fetch(`${PB_URL}/api/${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `PocketBase error ${res.status}`);
  }
  // 204 No Content (delete)
  if (res.status === 204) return null;
  return res.json();
}

// ─── Build a filter string from a plain object ────────────────────────────────
// e.g. { project_id: "abc123" } → 'project_id="abc123"'

function buildFilter(filterObj) {
  if (!filterObj || Object.keys(filterObj).length === 0) return '';
  // Special case: { id: "..." } — PocketBase uses the record id directly
  return Object.entries(filterObj)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' && ');
}

// ─── Entity factory ───────────────────────────────────────────────────────────

function createEntityClient(collection) {
  return {
    /**
     * List all records, optionally sorted.
     * sortField: e.g. '-created_date' (prefix - for desc), 'sort_order', '-log_date'
     */
    async list(sortField) {
      const params = new URLSearchParams({ perPage: '500' });
      if (sortField) params.set('sort', sortField);
      const data = await pbFetch(`collections/${collection}/records?${params}`);
      return data.items;
    },

    /**
     * Filter records by field equality, optionally sorted.
     * filterObj: e.g. { project_id: "abc" } or { id: "abc" }
     */
    async filter(filterObj, sortField) {
      const params = new URLSearchParams({ perPage: '500' });
      const f = buildFilter(filterObj);
      if (f) params.set('filter', f);
      if (sortField) params.set('sort', sortField);
      const data = await pbFetch(`collections/${collection}/records?${params}`);
      return data.items;
    },

    /** Create a single record */
    async create(payload) {
      return pbFetch(`collections/${collection}/records`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    /** Update a record by id */
    async update(id, payload) {
      return pbFetch(`collections/${collection}/records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    },

    /** Delete a record by id */
    async delete(id) {
      return pbFetch(`collections/${collection}/records/${id}`, {
        method: 'DELETE',
      });
    },

    /** Bulk create — sequential, returns array of created records */
    async bulkCreate(payloads) {
      const results = [];
      for (const payload of payloads) {
        const record = await pbFetch(`collections/${collection}/records`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        results.push(record);
      }
      return results;
    },
  };
}

// ─── Exported client — matches base44 shape ───────────────────────────────────

export const pb = {
  entities: {
    Project: createEntityClient('projects'),
    DailyLog: createEntityClient('daily_logs'),
    LogEntry: createEntityClient('log_entries'),
    IssueItem: createEntityClient('issue_items'),
    Asset: createEntityClient('assets'),
    PunchItem: createEntityClient('punch_items'),
  },
};

// Re-export as `base44` so existing imports keep working without find-replace
export const base44 = pb;
