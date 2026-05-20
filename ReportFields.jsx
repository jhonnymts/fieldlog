import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const allStatuses = ['In Progress', 'Open Issue', 'Complete', 'Failed', 'Deferred', 'Locked by Client'];
const quickStatuses = [
  { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { label: 'Open Issue', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { label: 'Complete', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
];

export default function AssetCard({ asset, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer active:bg-secondary/50" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5"><span className="text-xs font-mono text-primary font-medium">{asset.asset_id}</span><span className="text-xs text-muted-foreground">·</span><span className="text-xs text-muted-foreground">{asset.asset_type}</span></div>
          <p className="text-sm font-medium text-foreground truncate">{asset.asset_name}</p>
        </div>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {quickStatuses.map((s) => <button key={s.label} onClick={() => onUpdate({ status: s.label })} className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-all ${asset.status === s.label ? s.color + ' ring-1 ring-current' : 'bg-transparent text-muted-foreground border-border'}`}>{s.label === 'In Progress' ? '⏳' : s.label === 'Open Issue' ? '🔶' : '✅'}</button>)}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </div>
      {expanded && <div className="border-t border-border p-3 space-y-3 bg-secondary/30">
        <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Status</label><Select value={asset.status} onValueChange={(v) => onUpdate({ status: v })}><SelectTrigger className="bg-secondary border-border mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>{allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        <div><label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</label><Textarea value={asset.notes || ''} onChange={(e) => onUpdate({ notes: e.target.value })} placeholder="Add notes..." className="bg-secondary border-border mt-1 min-h-[60px] resize-none" /></div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 transition-colors"><Trash2 className="h-3 w-3" /> Remove Asset</button>
      </div>}
    </div>
  );
}