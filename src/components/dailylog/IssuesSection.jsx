import React, { useState } from 'react';
import { fieldlog } from '@/api/supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/shared/StatusBadge';
import { useProjectRole } from '@/lib/useProjectRole';

export default function IssuesSection({ logId, projectId, issues, punchItems = [] }) {
  const queryClient     = useQueryClient();
  const { canEdit }     = useProjectRole(projectId);
  const [showForm,      setShowForm]  = useState(false);
  const [promoting,     setPromoting] = useState(null);
  const [form,          setForm]      = useState({ description: '', status: 'Open', owner: '', target_date: '' });

  const createIssueMutation = useMutation({
    mutationFn: (data) => fieldlog.entities.IssueItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logIssues', logId] });
      setForm({ description: '', status: 'Open', owner: '', target_date: '' });
      setShowForm(false);
    },
  });

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }) => fieldlog.entities.IssueItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logIssues', logId] }),
  });

  const deleteIssueMutation = useMutation({
    mutationFn: (id) => fieldlog.entities.IssueItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logIssues', logId] }),
  });

  const promoteMutation = useMutation({
    mutationFn: async (issue) => {
      const existing = await fieldlog.entities.PunchItem.filter({ project_id: projectId });
      const nextNum  = (existing?.length ?? 0) + 1;
      return fieldlog.entities.PunchItem.create({
        project_id: projectId, item_number: nextNum,
        description: issue.description, owner: issue.owner || '',
        target_date: issue.target_date || '', status: 'Open',
      });
    },
    onSuccess: (_, issue) => {
      updateIssueMutation.mutate({ id: issue.id, data: { status: 'In Progress' } });
      queryClient.invalidateQueries({ queryKey: ['punchItems', projectId] });
      setPromoting(null);
    },
  });

  const handleAdd = () => {
    if (!form.description.trim()) return;
    createIssueMutation.mutate({ daily_log_id: logId, issue_number: issues.length + 1, ...form });
  };

  const isPromoted = (issue) =>
    punchItems.some((p) => p.description?.trim().toLowerCase() === issue.description?.trim().toLowerCase());

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Issues & Action Items</h3>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => setShowForm(!showForm)} className="text-primary h-8">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {canEdit && showForm && (
        <div className="bg-card border border-border rounded-lg p-4 mb-3 space-y-3">
          <Input placeholder="Issue description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border h-11" />
          <div className="grid grid-cols-3 gap-2">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="bg-secondary border-border h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="bg-secondary border-border h-11" />
            <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} className="bg-secondary border-border h-11" />
          </div>
          <Button onClick={handleAdd} disabled={createIssueMutation.isPending} className="bg-primary text-primary-foreground h-10 w-full">Add Issue</Button>
        </div>
      )}

      <div className="space-y-2">
        {issues.map((issue) => {
          const promoted       = isPromoted(issue);
          const isBeingPromoted = promoting === issue.id;
          return (
            <div key={issue.id} className={`bg-card border rounded-lg p-3 transition-colors ${promoted ? 'border-amber-500/40' : 'border-border'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">#{issue.issue_number}</span>
                    <StatusBadge status={issue.status} type="punch" />
                    {promoted && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" /> On Punch List
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground">{issue.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    {issue.owner && <span>Owner: {issue.owner}</span>}
                    {issue.target_date && <span>Target: {issue.target_date}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Status quick-toggle — editors/owners only */}
                  {canEdit ? (
                    <Select value={issue.status} onValueChange={(v) => updateIssueMutation.mutate({ id: issue.id, data: { status: v } })}>
                      <SelectTrigger className="bg-secondary border-border h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusBadge status={issue.status} type="punch" />
                  )}

                  {canEdit && !promoted && (
                    <button onClick={() => { setPromoting(issue.id); promoteMutation.mutate(issue); }}
                      disabled={isBeingPromoted || promoteMutation.isPending}
                      title="Send to Punch List" className="p-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canEdit && (
                    <button onClick={() => deleteIssueMutation.mutate(issue.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {issues.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-6">No issues logged.</p>
      )}
    </div>
  );
}
