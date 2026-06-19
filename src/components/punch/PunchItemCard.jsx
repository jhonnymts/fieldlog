import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import TagInput from '@/components/shared/TagInput';

const statusStyles = {
  'Open':        { pill: 'bg-red-500/20 text-red-400 border-red-500/30',              dot: 'bg-red-400' },
  'In Progress': { pill: 'bg-amber-500/20 text-amber-400 border-amber-500/30',        dot: 'bg-amber-400' },
  'Closed':      { pill: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',  dot: 'bg-emerald-400' },
};

export default function PunchItemCard({ item, onUpdate, onDelete, readOnly = false }) {
  const [expanded, setExpanded] = useState(false);
  const isClosed = item.status === 'Closed';
  const style    = statusStyles[item.status] || statusStyles['Open'];

  const handleStatusChange = (newStatus) => {
    if (readOnly || !onUpdate) return;
    const updateData = { status: newStatus };
    if (newStatus === 'Closed' && !item.date_closed) {
      updateData.date_closed = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
    }
    if (newStatus !== 'Closed') updateData.date_closed = '';
    onUpdate(updateData);
  };

  return (
    <div className={`bg-card border rounded-lg overflow-hidden transition-all ${isClosed ? 'border-emerald-500/30 opacity-75' : 'border-border'}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer active:bg-secondary/50" onClick={() => setExpanded(!expanded)}>
        <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-primary font-medium">#{item.item_number}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${style.pill}`}>{item.status}</span>
          </div>
          <p className={`text-sm text-foreground ${isClosed ? 'line-through text-muted-foreground' : ''}`}>{item.description}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            {item.owner       && <span>Owner: {item.owner}</span>}
            {item.target_date && <span>Target: {item.target_date}</span>}
            {item.date_closed && <span>Closed: {item.date_closed}</span>}
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className="mt-1.5">
              <TagInput tags={item.tags} onChange={() => {}} readOnly size="xs" />
            </div>
          )}
        </div>

        {!readOnly && onUpdate && (
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {!isClosed ? (
              <button onClick={(e) => { e.stopPropagation(); handleStatusChange('Closed'); }} title="Mark as Done"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/25 transition-colors">
                <CheckCircle2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Done</span>
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); handleStatusChange('Open'); }} title="Reopen"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground border border-border text-xs font-medium hover:text-foreground transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Reopen</span>
              </button>
            )}
          </div>
        )}

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-secondary/30">
          {readOnly ? (
            <div className="space-y-2 text-sm">
              {item.owner       && <p className="text-muted-foreground">Owner: <span className="text-foreground">{item.owner}</span></p>}
              {item.target_date && <p className="text-muted-foreground">Target: <span className="text-foreground">{item.target_date}</span></p>}
              {item.date_closed && <p className="text-muted-foreground">Closed: <span className="text-foreground">{item.date_closed}</span></p>}
              {item.tags && item.tags.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Tags</p>
                  <TagInput tags={item.tags} onChange={() => {}} readOnly />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label>
                  <Select value={item.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="bg-secondary border-border mt-1 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Owner</label>
                  <Input value={item.owner || ''} onChange={(e) => onUpdate({ owner: e.target.value })}
                    className="bg-secondary border-border mt-1 h-11" placeholder="Assign..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Target Date</label>
                  <Input type="date" value={item.target_date || ''} onChange={(e) => onUpdate({ target_date: e.target.value })}
                    className="bg-secondary border-border mt-1 h-11" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider">Date Closed</label>
                  <Input type="date" value={item.date_closed || ''} onChange={(e) => onUpdate({ date_closed: e.target.value })}
                    className="bg-secondary border-border mt-1 h-11" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Tags</label>
                <TagInput tags={item.tags || []} onChange={(tags) => onUpdate({ tags })} />
              </div>
              {onDelete && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors">
                  <Trash2 className="h-3 w-3" /> Remove Item
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
