import React, { useState } from 'react';
import { base44 } from '@/api/pocketbaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';

export default function DailyLogs() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: async () => { const projects = await base44.entities.Project.filter({ id: projectId }); return projects[0]; } });
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['dailyLogs', projectId], queryFn: () => base44.entities.DailyLog.filter({ project_id: projectId }, '-log_date') });
  const createMutation = useMutation({ mutationFn: (data) => base44.entities.DailyLog.create(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyLogs', projectId] }) });

  const handleCreateLog = () => { const exists = logs.find((l) => l.log_date === newDate); if (exists) return; createMutation.mutate({ project_id: projectId, log_date: newDate }); };
  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to={`/project/${projectId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"><ArrowLeft className="h-4 w-4" /> {project?.project_name || 'Back'}</Link>
      <h2 className="text-2xl font-bold text-foreground mb-6">Daily Logs</h2>
      <div className="flex gap-2 mb-6"><Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-secondary border-border h-12 flex-1" /><Button onClick={handleCreateLog} disabled={createMutation.isPending} className="bg-primary text-primary-foreground h-12 px-5"><Plus className="h-5 w-5 mr-2" /> New Log</Button></div>
      {logs.length === 0 ? <EmptyState icon={FileText} title="No daily logs" description="Start a new daily log to begin recording activities." /> : <div className="space-y-3">{logs.map((log) => <Link key={log.id} to={`/project/${projectId}/log/${log.id}`} className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.98]"><div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"><Calendar className="h-5 w-5 text-muted-foreground" /></div><div><h3 className="font-semibold text-foreground">{format(new Date(log.log_date), 'EEEE, MMM d, yyyy')}</h3><p className="text-xs text-muted-foreground mt-0.5">{log.executive_summary ? 'Summary added' : 'No summary yet'}</p></div></Link>)}</div>}
    </div>
  );
}