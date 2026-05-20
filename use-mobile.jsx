import React from 'react';
const filters = [
  { key: 'all', label: 'All' }, { key: 'Complete', label: 'Complete' }, { key: 'In Progress', label: 'In Progress' },
  { key: 'Open Issue', label: 'Open Issue' }, { key: 'Failed', label: 'Failed' }, { key: 'Deferred', label: 'Deferred' }, { key: 'Locked by Client', label: 'Locked' },
];
export default function AssetFilterBar({ filter, onFilterChange, assets }) {
  return <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 -mx-1 px-1 scrollbar-hide">{filters.map((f) => {
    const count = f.key === 'all' ? assets.length : assets.filter((a) => a.status === f.key).length;
    return <button key={f.key} onClick={() => onFilterChange(f.key)} className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>{f.label} ({count})</button>;
  })}</div>;
}