import React from 'react';
import { base44 } from '@/api/pocketbaseClient';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, ClipboardCheck, AlertTriangle, MapPin, Calendar, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { data: project, isLoading } = useQuery({ queryKey: ['project', projectId], queryFn: async () => { const projects = await base44.entities.Project.filter({ id: projectId }); return projects[0]; } });
  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  if (!project) return <div className="max-w-4xl mx-auto px-4 py-6"><p className="text-muted-foreground">Project not found.</p></div>;

  const activityColors = { FAT: 'bg-blue-500/20 text-blue-400', SAT: 'bg-emerald-500/20 text-emerald-400', 'T&C': 'bg-amber-500/20 text-amber-400', Commissioning: 'bg-purple-500/20 text-purple-400' };
  const sections = [
    { label: 'Daily Logs', icon: FileText, path: `/project/${projectId}/logs`, description: 'Timestamped activity entries' },
    { label: 'Asset Checklist', icon: ClipboardCheck, path: `/project/${projectId}/assets`, description: 'Equipment testing status' },
    { label: 'Punch List', icon: AlertTriangle, path: `/project/${projectId}/punch`, description: 'Outstanding items tracker' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"><ArrowLeft className="h-4 w-4" /> All Projects</Link>
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between mb-3"><h2 className="text-xl font-bold text-foreground">{project.project_name}</h2><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${activityColors[project.activity_type] || 'bg-muted text-muted-foreground'}`}>{project.activity_type}</span></div>
        {project.client_name && <p className="text-sm text-muted-foreground mb-3">{project.client_name}</p>}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">{project.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {project.location}</span>}{project.project_number && <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> {project.project_number}</span>}{project.start_date && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {format(new Date(project.start_date), 'MMM d, yyyy')}</span>}</div>
      </div>
      <div className="space-y-3">{sections.map((section) => <Link key={section.path} to={section.path} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.98]"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><section.icon className="h-6 w-6 text-primary" /></div><div className="flex-1 min-w-0"><h3 className="font-semibold text-foreground">{section.label}</h3><p className="text-xs text-muted-foreground">{section.description}</p></div></Link>)}</div>
    </div>
  );
}