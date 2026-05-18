import React from 'react';
import { base44 } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { generateDailyReportPDF } from '@/lib/pdfExport';
import { getSettings } from '@/pages/Settings';
import EntryFeed from '@/components/dailylog/EntryFeed';
import IssuesSection from '@/components/dailylog/IssuesSection';
import ReportFields from '@/components/dailylog/ReportFields';

export default function DailyLogDetail() {
  const { projectId, logId } = useParams();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => { const r = await base44.entities.Project.filter({ id: projectId }); return r[0]; },
  });
  const { data: log } = useQuery({
    queryKey: ['dailyLog', logId],
    queryFn: async () => { const r = await base44.entities.DailyLog.filter({ id: logId }); return r[0]; },
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['logEntries', logId],
    queryFn: () => base44.entities.LogEntry.filter({ daily_log_id: logId }, 'sort_order'),
  });
  const { data: issues = [] } = useQuery({
    queryKey: ['logIssues', logId],
    queryFn: () => base44.entities.IssueItem.filter({ daily_log_id: logId }, 'issue_number'),
  });
  const { data: punchItems = [] } = useQuery({
    queryKey: ['punchItems', projectId],
    queryFn: () => base44.entities.PunchItem.filter({ project_id: projectId }, 'item_number'),
  });

  const updateLogMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyLog.update(logId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyLog', logId] }),
  });

  const handleGenerateReport = () => {
    if (!project || !log) return;
    const { companyName, engineerName, logoDataUrl } = getSettings();
    generateDailyReportPDF({ project, log, entries, issues, companyName: companyName || engineerName || '', logoDataUrl });
  };

  if (!log || !project) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to={`/project/${projectId}/logs`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Daily Logs
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">{format(new Date(log.log_date), 'EEEE, MMM d')}</h2>
          <p className="text-sm text-muted-foreground">{project.project_name}</p>
        </div>
        <Button onClick={handleGenerateReport} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 font-semibold">
          <FileDown className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>
      <EntryFeed logId={logId} entries={entries} />
      <IssuesSection
        logId={logId}
        projectId={projectId}
        issues={issues}
        punchItems={punchItems}
      />
      <ReportFields
        log={log}
        project={project}
        entries={entries}
        issues={issues}
        punchItems={punchItems}
        onUpdate={(data) => updateLogMutation.mutate(data)}
      />
    </div>
  );
}
