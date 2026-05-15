import React from 'react';
const statuses = [
  { key: 'Complete', label: 'Ready', color: 'bg-emerald-500' }, { key: 'In Progress', label: 'In Progress', color: 'bg-blue-500' }, { key: 'Open Issue', label: 'Open', color: 'bg-amber-500' }, { key: 'Failed', label: 'Failed', color: 'bg-red-500' }, { key: 'Deferred', label: 'Deferred', color: 'bg-slate-500' }, { key: 'Locked by Client', label: 'Locked', color: 'bg-purple-500' },
];
export default function AssetSummaryBar({ assets }) {
  if (assets.length === 0) return null;
  return <div className="flex flex-wrap gap-2 mb-4">{statuses.map((s) => { const count = assets.filter((a) => a.status === s.key).length; if (count === 0) return null; return <div key={s.key} className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5"><div className={`h-2 w-2 rounded-full ${s.color}`} /><span className="text-xs font-medium text-foreground">{count}</span><span className="text-xs text-muted-foreground">{s.label}</span></div>; })}</div>;
}