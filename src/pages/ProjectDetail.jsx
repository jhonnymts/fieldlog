import React from 'react';
import { fieldlog } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, ClipboardCheck, AlertTriangle, MapPin, Calendar, Hash, Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';

// ─── Tiny SVG ring chart ───────────────────────────────────────────────────────
function RingChart({ pct, color, size = 80, stroke = 8 }) {
  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct, color }) {
  const clamp = Math.min(100, Math.max(0, pct));
  return (
    <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${clamp}%`, backgroundColor: color }} />
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => { const p = await fieldlog.entities.Project.filter({ id: projectId }); return p[0]; }
  });

  const { data: logs    = [] } = useQuery({ queryKey: ['dailyLogs',  projectId], queryFn: () => fieldlog.entities.DailyLog.filter({ project_id: projectId }, '-log_date') });
  const { data: assets  = [] } = useQuery({ queryKey: ['assets',     projectId], queryFn: () => fieldlog.entities.Asset.filter({ project_id: projectId }) });
  const { data: punch   = [] } = useQuery({ queryKey: ['punchItems', projectId], queryFn: () => fieldlog.entities.PunchItem.filter({ project_id: projectId }) });

  // Most recent entries across all logs for the activity feed
  const { data: recentEntries = [] } = useQuery({
    queryKey: ['recentEntries', projectId],
    queryFn: async () => {
      if (!logs.length) return [];
      const latest = logs.slice(0, 3);
      const all = await Promise.all(latest.map(l => fieldlog.entities.LogEntry.filter({ daily_log_id: l.id }, '-sort_order')));
      return all.flat().slice(0, 5).map(e => {
        const log = latest.find(l => l.id === e.daily_log_id);
        return { ...e, log_date: log?.log_date };
      });
    },
    enabled: logs.length > 0,
  });

  if (projectLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="max-w-4xl mx-auto px-4 py-6"><p className="text-muted-foreground">Project not found.</p></div>;

  // ─── Derived metrics ─────────────────────────────────────────────────────────
  const totalAssets    = assets.length;
  const completeAssets = assets.filter(a => a.status === 'Complete').length;
  const assetPct       = totalAssets > 0 ? Math.round((completeAssets / totalAssets) * 100) : 0;

  const totalPunch  = punch.length;
  const closedPunch = punch.filter(p => p.status === 'Closed').length;
  const openPunch   = punch.filter(p => p.status === 'Open').length;
  const inProgPunch = punch.filter(p => p.status === 'In Progress').length;
  const punchPct    = totalPunch > 0 ? Math.round((closedPunch / totalPunch) * 100) : 0;

  const daysOnSite      = logs.length;
  const contractedDays  = project.contracted_days || null;
  const daysPct         = contractedDays ? Math.round((daysOnSite / contractedDays) * 100) : null;
  const daysColor       = !daysPct ? '#6b7280' : daysPct >= 100 ? '#ef4444' : daysPct >= 80 ? '#f59e0b' : '#1D9E75';

  const activityColors = {
    FAT: 'bg-blue-500/20 text-blue-400',
    SAT: 'bg-emerald-500/20 text-emerald-400',
    'T&C': 'bg-amber-500/20 text-amber-400',
    Commissioning: 'bg-purple-500/20 text-purple-400'
  };

  const sections = [
    { label: 'Daily Logs',      icon: FileText,       path: `/project/${projectId}/logs`,   description: 'Timestamped activity entries', count: `${logs.length} log${logs.length !== 1 ? 's' : ''}` },
    { label: 'Asset Checklist', icon: ClipboardCheck, path: `/project/${projectId}/assets`, description: 'Equipment testing status',      count: `${completeAssets}/${totalAssets} complete` },
    { label: 'Punch List',      icon: AlertTriangle,  path: `/project/${projectId}/punch`,  description: 'Outstanding items tracker',     count: `${openPunch} open` },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

      {/* Back nav */}
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> All Projects
      </Link>

      {/* Project header */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-xl font-bold text-foreground">{project.project_name}</h2>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${activityColors[project.activity_type] || 'bg-muted text-muted-foreground'}`}>{project.activity_type}</span>
        </div>
        {project.client_name && <p className="text-sm text-muted-foreground mb-3">{project.client_name}</p>}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {project.location      && <span className="flex items-center gap-1.5"><MapPin    className="h-3.5 w-3.5" /> {project.location}</span>}
          {project.project_number && <span className="flex items-center gap-1.5"><Hash      className="h-3.5 w-3.5" /> {project.project_number}</span>}
          {project.start_date    && <span className="flex items-center gap-1.5"><Calendar  className="h-3.5 w-3.5" /> {format(new Date(project.start_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
        </div>
      </div>

      {/* ── Dashboard cards ── */}
      <div className="grid grid-cols-3 gap-3">

        {/* Asset completion ring */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Assets</p>
          <div className="relative flex items-center justify-center">
            <RingChart pct={assetPct} color="#1D9E75" />
            <span className="absolute text-sm font-bold text-foreground">{assetPct}%</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">{completeAssets} of {totalAssets} complete</p>
        </div>

        {/* Punch list progress */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Punch List</p>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-semibold text-foreground">{closedPunch}/{totalPunch}</span>
            </div>
            <ProgressBar pct={punchPct} color="#1D9E75" />
            <div className="flex gap-3 text-xs mt-1">
              <span className="text-red-400">● {openPunch} open</span>
              <span className="text-amber-400">● {inProgPunch} in prog</span>
            </div>
          </div>
        </div>

        {/* Days tracker */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Days</p>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">On-site</span>
              <span className="font-semibold text-foreground">
                {daysOnSite}{contractedDays ? `/${contractedDays}` : ''}
              </span>
            </div>
            {contractedDays
              ? <ProgressBar pct={daysPct} color={daysColor} />
              : <p className="text-xs text-muted-foreground italic">No contracted days set</p>
            }
            {contractedDays && (
              <p className="text-xs" style={{ color: daysColor }}>
                {daysPct >= 100 ? 'Over contracted days' : daysPct >= 80 ? `${contractedDays - daysOnSite}d remaining — watch schedule` : `${contractedDays - daysOnSite} days remaining`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Activity feed ── */}
      {recentEntries.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3">
                <div className="flex items-center gap-1 text-xs text-primary font-mono w-20 flex-shrink-0 pt-0.5">
                  <Clock className="h-3 w-3" />{entry.time_stamp}
                </div>
                <p className="text-sm text-foreground leading-snug flex-1 truncate">{entry.content}</p>
                {entry.log_date && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {format(new Date(entry.log_date + 'T12:00:00'), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-3 gap-2">
        <Link to={`/project/${projectId}/logs`}
          className="flex flex-col items-center gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl p-3 transition-colors">
          <Plus className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-primary">New Log</span>
        </Link>
        <Link to={`/project/${projectId}/assets`}
          className="flex flex-col items-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl p-3 transition-colors">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Assets</span>
        </Link>
        <Link to={`/project/${projectId}/punch`}
          className="flex flex-col items-center gap-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl p-3 transition-colors">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Punch List</span>
        </Link>
      </div>

      {/* ── Section nav ── */}
      <div className="space-y-3">
        {sections.map((section) => (
          <Link key={section.path} to={section.path}
            className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.98]">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <section.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{section.label}</h3>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            <span className="text-xs font-medium text-muted-foreground flex-shrink-0">{section.count}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
