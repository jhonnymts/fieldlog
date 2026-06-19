import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, X, FolderOpen, ClipboardCheck, AlertTriangle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

const RESULT_ICONS = {
  project:  { icon: FolderOpen,     color: 'text-blue-400',    label: 'Project' },
  asset:    { icon: ClipboardCheck, color: 'text-emerald-400', label: 'Asset' },
  punch:    { icon: AlertTriangle,  color: 'text-amber-400',   label: 'Punch' },
  logentry: { icon: Clock,          color: 'text-primary',     label: 'Entry' },
};

function highlight(text = '', query = '') {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/30 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function match(text = '', q = '') {
  return text.toLowerCase().includes(q.toLowerCase());
}

function buildResults(queryClient, query) {
  if (!query || query.length < 2) return [];
  const results = [];
  const cache = queryClient.getQueryCache().getAll();

  for (const entry of cache) {
    const key  = entry.queryKey;
    const data = entry.state.data;
    if (!data) continue;

    // Projects
    if (key[0] === 'projects' && Array.isArray(data)) {
      for (const p of data) {
        if (match(p.project_name, query) || match(p.client_name, query) || match(p.location, query) || match(p.project_number, query)) {
          results.push({ type: 'project', id: p.id, title: p.project_name, sub: [p.client_name, p.location].filter(Boolean).join(' · '), path: `/project/${p.id}` });
        }
      }
    }

    // Assets
    if (key[0] === 'assets' && key[1] && Array.isArray(data)) {
      for (const a of data) {
        if (match(a.asset_id, query) || match(a.asset_name, query) || match(a.notes, query)) {
          results.push({ type: 'asset', id: a.id, title: a.asset_name, sub: `${a.asset_id} · ${a.asset_type || ''}`, path: `/project/${key[1]}/assets` });
        }
      }
    }

    // Punch items
    if (key[0] === 'punchItems' && key[1] && Array.isArray(data)) {
      for (const p of data) {
        if (match(p.description, query) || match(p.owner, query)) {
          results.push({ type: 'punch', id: p.id, title: p.description, sub: `#${p.item_number} · ${p.status}${p.owner ? ' · ' + p.owner : ''}`, path: `/project/${key[1]}/punch` });
        }
      }
    }

    // Log entries
    if (key[0] === 'logEntries' && key[1] && Array.isArray(data)) {
      for (const e of data) {
        if (match(e.content, query)) {
          const dlEntry = cache.find((c) => c.queryKey[0] === 'dailyLog' && c.queryKey[1] === e.daily_log_id);
          const projectId = dlEntry?.state?.data?.project_id;
          if (!projectId) continue;
          results.push({ type: 'logentry', id: e.id, title: e.content, sub: e.time_stamp || '', path: `/project/${projectId}/log/${e.daily_log_id}` });
        }
      }
    }
  }

  const seen = new Set();
  return results.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; }).slice(0, 30);
}

function groupResults(results) {
  const groups = {};
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }
  return groups;
}

export default function GlobalSearch({ onClose }) {
  const [query, setQuery] = useState('');
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const inputRef    = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const results = buildResults(queryClient, query);
  const groups  = groupResults(results);

  const handleSelect = (path) => { navigate(path); onClose(); };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, assets, punch items, entries…"
            className="bg-transparent border-0 h-8 px-0 focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.length < 2 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Type at least 2 characters to search</p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No results for &quot;{query}&quot;</p>
          ) : (
            Object.entries(groups).map(([type, items]) => {
              const { icon: Icon, color, label } = RESULT_ICONS[type] || RESULT_ICONS.logentry;
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 px-4 py-2 sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border/50">
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {label}s ({items.length})
                    </span>
                  </div>
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSelect(r.path)}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <p className="text-sm text-foreground font-medium line-clamp-2 leading-snug">
                        {highlight(r.title, query)}
                      </p>
                      {r.sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{r.sub}</p>}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>

        {query.length >= 2 && results.length > 0 && (
          <div className="px-4 py-2 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">
              {results.length} result{results.length !== 1 ? 's' : ''} · Navigate to a screen to load more into cache
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
