import React, { useState } from 'react';
import { fieldlog } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { useProjectRole } from '@/lib/useProjectRole';

async function deleteDailyLogWithChildren(logId) {
  const [entries, issues] = await Promise.all([
    fieldlog.entities.LogEntry.filter({ daily_log_id: logId }),
    fieldlog.entities.IssueItem.filter({ daily_log_id: logId }),
  ]);
  await Promise.all([
    ...entries.map((e) => fieldlog.entities.LogEntry.delete(e.id)),
    ...issues.map((i) => fieldlog.entities.IssueItem.delete(i.id)),
  ]);
  await fieldlog.entities.DailyLog.delete(logId);
}

export default function DailyLogs() {
  const { projectId } = useParams();
  const queryClient   = useQueryClient();
  const { canEdit }   = useProjectRole(projectId);

  const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [newDate,    setNewDate]    = useState(todayLocal());
  const [confirmId,  setConfirmId]  = useState(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn:  async () => { const r = await fieldlog.entities.Project.filter({ id: projectId }); return r[0]; },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['dailyLogs', projectId],
    queryFn:  () => fieldlog.entities.DailyLog.filter({ project_id: projectId }, '-log_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => fieldlog.entities.DailyLog.create(data),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['dailyLogs', projectId] }),
    onError:    (err) => toast.error(err?.message || 'Failed to create log'),
  });

  const deleteMutation = useMutation({
    mutationFn: (logId) => deleteDailyLogWithChildren(logId),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['dailyLogs', projectId] }); setConfirmId(null); toast.success('Daily log deleted'); },
    onError:    (err) => { toast.error(err?.message || 'Failed to delete log'); setConfirmId(null); },
  });

  const handleCreateLog = () => {
    const exists = logs.find((l) => l.log_date === newDate);
    if (exists) { toast.error('A log for this date already exists'); return; }
    createMutation.mutate({ project_id: projectId, log_date: newDate });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to={`/project/${projectId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {project?.project_name || 'Back'}
      </Link>
      <h2 className="text-2xl font-bold text-foreground mb-6">Daily Logs</h2>

      {/* New log row — editors/owners only */}
      {canEdit && (
        <div className="flex gap-2 mb-6">
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-secondary border-border h-12 flex-1" />
          <Button onClick={handleCreateLog} disabled={createMutation.isPending} className="bg-primary text-primary-foreground h-12 px-5">
            <Plus className="h-5 w-5 mr-2" /> New Log
          </Button>
        </div>
      )}

      {logs.length === 0
        ? <EmptyState icon={FileText} title="No daily logs" description="Start a new daily log to begin recording activities." />
        : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                <Link
                  to={`/project/${projectId}/log/${log.id}`}
                  className={`flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.98] ${canEdit ? 'pr-24' : ''}`}
                >
                  <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {format(new Date(log.log_date + 'T12:00:00'), 'EEEE, MMM d, yyyy')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.executive_summary ? 'Summary added' : 'No summary yet'}
                    </p>
                  </div>
                </Link>

                {/* Delete — editors/owners only */}
                {canEdit && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {confirmId === log.id ? (
                      <>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteMutation.mutate(log.id); }}
                          disabled={deleteMutation.isPending}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmId(null); }}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmId(log.id); }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        title="Delete log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
