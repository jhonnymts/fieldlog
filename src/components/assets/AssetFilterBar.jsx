import React from 'react';

const statusFilters = [
  { key: 'all',              label: 'All' },
  { key: 'Complete',         label: 'Complete' },
  { key: 'In Progress',      label: 'In Progress' },
  { key: 'Open Issue',       label: 'Open Issue' },
  { key: 'Failed',           label: 'Failed' },
  { key: 'Deferred',         label: 'Deferred' },
  { key: 'Locked by Client', label: 'Locked' },
];

export default function AssetFilterBar({ filter, onFilterChange, assets, tagFilter, onTagFilter }) {
  const allTags = [...new Set(assets.flatMap((a) => a.tags || []))].sort();

  return (
    <div className="space-y-2 mb-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {statusFilters.map((f) => {
          const count = f.key === 'all' ? assets.length : assets.filter((a) => a.status === f.key).length;
          return (
            <button key={f.key} onClick={() => onFilterChange(f.key)}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {tagFilter && (
            <button onClick={() => onTagFilter(null)}
              className="flex-shrink-0 text-xs font-medium px-3 py-1 rounded-full border bg-primary/10 text-primary border-primary/30 transition-colors">
              × clear tag
            </button>
          )}
          {allTags.map((tag) => (
            <button key={tag} onClick={() => onTagFilter(tagFilter === tag ? null : tag)}
              className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${tagFilter === tag ? 'bg-primary/20 text-primary border-primary/40' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}>
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
