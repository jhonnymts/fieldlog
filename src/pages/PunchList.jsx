import React, { useState } from 'react';
import { base44 } from '@/api/pocketbaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileDown, AlertTriangle, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePunchListPDF } from '@/lib/pdfExport';
import { getSettings } from '@/pages/Settings';
import { draftPunchNarrative } from '@/lib/gemini';
import EmptyState from '@/components/shared/EmptyState';
import PunchItemCard from '@/components/punch/PunchItemCard';
import PunchFormDialog from '@/components/punch/PunchFormDialog';

const punchFilters = ['all', 'Open', 'In Progress', 'Closed'];
const filterStyles = { all: 'text-foreground', Open: 'text-red-400', 'In Progress': 'text-amber-400', Closed: 'text-emerald-400' };

export default function PunchList() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [narrative, setNarrative] = useState('');
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [narrativeError, setNarrativeError] = useState('');

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: async () => { const r = await base44.entities.Project.filter({ id: projectId }); return r[0]; } });
  const { data: items = [], isLoading } = useQuery({ queryKey: ['punchItems', projectId], queryFn: () => base44.entities.PunchItem.filter({ project_id: projectId }, 'item_number') });
  const createMutation = useMutation({ mutationFn: (data) => base44.entities.PunchItem.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['punchItems', projectId] }); setShowForm(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.PunchItem.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['punchItems', projectId] }) });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.PunchItem.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['punchItems', projectId] }) });

  const handleExportPDF = () => {
    if (!project) return;
    const { companyName, engineerName } = getSettings();
    generatePunchListPDF({ project, items, companyName: companyName || engineerName || '' });
  };

  const handleDraftNarrative = async () => {
    setLoadingNarrative(true);
    setNarrativeError('');
    setNarrative('');
    try {
      const text = await draftPunchNarrative({ projectName: project?.project_name || '', items });
      setNarrative(text);
    } catch (e) {
      setNarrativeError(e.message);
    } finally {
      setLoadingNarrative(false);
    }
  };

  const statusCounts = {
    Open: items.filter(i => i.status === 'Open').length,
    'In Progress': items.filter(i => i.status === 'In Progress').length,
    Closed: items.filter(i => i.status === 'Closed').length,
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to={`/project/${projectId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> {project?.project_name || 'Back'}
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-foreground">Punch List</h2>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDraftNarrative}
              disabled={loadingNarrative}
              className="border-primary/30 text-primary h-10 text-xs"
            >
              {loadingNarrative
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Drafting...</>
                : <><Sparkles className="h-3.5 w-3.5 mr-1" /> AI Summary</>}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="border-primary/30 text-primary h-10">
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground h-10">
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* AI narrative output */}
      {(narrative || narrativeError) && (
        <div className={`rounded-xl p-4 mb-4 relative ${narrative ? 'bg-primary/5 border border-primary/20' : 'bg-destructive/10 border border-destructive/30'}`}>
          <button
            onClick={() => { setNarrative(''); setNarrativeError(''); }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          {narrative && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI-drafted narrative</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed pr-6">{narrative}</p>
              <p className="text-xs text-muted-foreground mt-2">Review and edit before using in a report. Copy and paste wherever needed.</p>
            </>
          )}
          {narrativeError && <p className="text-sm text-destructive">{narrativeError}</p>}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {punchFilters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${filter === f ? 'bg-secondary border-primary/40 ' + filterStyles[f] : 'bg-transparent border-border text-muted-foreground hover:border-primary/30'}`}
            >
              {f === 'all' ? `All (${items.length})` : `${f} (${statusCounts[f] ?? 0})`}
            </button>
          ))}
        </div>
      )}

      {items.length === 0
        ? <EmptyState icon={AlertTriangle} title="No punch items" description="Add items to track outstanding issues." action={<Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> Add Item</Button>} />
        : <div className="space-y-2">{items.filter(i => filter === 'all' || i.status === filter).map(item => (
            <PunchItemCard key={item.id} item={item} onUpdate={(data) => updateMutation.mutate({ id: item.id, data })} onDelete={() => deleteMutation.mutate(item.id)} />
          ))}</div>
      }

      <PunchFormDialog open={showForm} onClose={() => setShowForm(false)} onSubmit={(data) => createMutation.mutate({ ...data, project_id: projectId, item_number: items.length + 1 })} isLoading={createMutation.isPending} />
    </div>
  );
}
