import React from 'react';
import { Badge } from '@/components/ui/badge';

const assetStatusConfig = {
  'Complete': { emoji: '✅', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  'Open Issue': { emoji: '🔶', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'Failed': { emoji: '❌', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'Deferred': { emoji: '⏸', className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  'Locked by Client': { emoji: '🔒', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'In Progress': { emoji: '🔄', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};
const punchStatusConfig = {
  'Open': { className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  'In Progress': { className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'Closed': { className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};
export default function StatusBadge({ status, type = 'asset' }) {
  const config = type === 'asset' ? assetStatusConfig : punchStatusConfig;
  const statusInfo = config[status] || { className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={`${statusInfo.className} text-xs font-medium border`}>
      {type === 'asset' && statusInfo.emoji && <span className="mr-1">{statusInfo.emoji}</span>}
      {status}
    </Badge>
  );
}