import React, { useState, useRef } from 'react';
import { fieldlog } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Upload, ClipboardCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import AssetSummaryBar from '@/components/assets/AssetSummaryBar';
import AssetCard from '@/components/assets/AssetCard';
import AssetFormDialog from '@/components/assets/AssetFormDialog';
import AssetFilterBar from '@/components/assets/AssetFilterBar';

export default function AssetChecklist() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const fileInputRef = useRef(null);

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: async () => { const projects = await fieldlog.entities.Project.filter({ id: projectId }); return projects[0]; } });
  const { data: assets = [], isLoading } = useQuery({ queryKey: ['assets', projectId], queryFn: () => fieldlog.entities.Asset.filter({ project_id: projectId }) });
  const createMutation = useMutation({ mutationFn: (data) => fieldlog.entities.Asset.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets', projectId] }); setShowForm(false); } });
  const bulkCreateMutation = useMutation({ mutationFn: (data) => fieldlog.entities.Asset.bulkCreate(data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', projectId] }) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => fieldlog.entities.Asset.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', projectId] }) });
  const deleteMutation = useMutation({ mutationFn: (id) => fieldlog.entities.Asset.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['assets', projectId] }) });

  const downloadTemplate = () => {
    // Minimal valid CSV matching the parser's expected column names
    const csv = [
      'asset_id,asset_name,asset_type,notes',
      '3725-1,Inlet Control Valve,Valve,Normally closed air-to-open',
      '3726-2,VFD - Pump P-101,Drive,PowerFlex 755 75HP',
      'TK-3001,Storage Tank 3001,Tank,10000 bbl floating roof',
      'FT-3101,Flow Transmitter FT-3101,Instrument,Rosemount 8700 4-20mA',
      'PNL-01,MCC Panel 01,Panel,Allen-Bradley 480V',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'FieldLog_Asset_Import_Template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const assetIdIdx = headers.findIndex((h) => h.includes('asset') && h.includes('id'));
      const nameIdx = headers.findIndex((h) => h.includes('name'));
      const typeIdx = headers.findIndex((h) => h.includes('type'));
      const newAssets = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        return { project_id: projectId, asset_id: cols[assetIdIdx >= 0 ? assetIdIdx : 0] || '', asset_name: cols[nameIdx >= 0 ? nameIdx : 1] || '', asset_type: cols[typeIdx >= 0 ? typeIdx : 2] || 'Other', status: 'In Progress' };
      }).filter((a) => a.asset_id && a.asset_name);
      if (newAssets.length > 0) bulkCreateMutation.mutate(newAssets);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredAssets = filter === 'all' ? assets : assets.filter((a) => a.status === filter);
  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to={`/project/${projectId}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"><ArrowLeft className="h-4 w-4" /> {project?.project_name || 'Back'}</Link>
      <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-foreground">Assets</h2><div className="flex gap-2"><Button size="sm" variant="outline" onClick={downloadTemplate} className="border-border text-muted-foreground h-10" title="Download CSV template"><Download className="h-4 w-4 mr-1" /> Template</Button><input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} /><Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="border-border text-muted-foreground h-10"><Upload className="h-4 w-4 mr-1" /> CSV</Button><Button size="sm" onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground h-10"><Plus className="h-4 w-4 mr-1" /> Add</Button></div></div>
      <AssetSummaryBar assets={assets} />
      <AssetFilterBar filter={filter} onFilterChange={setFilter} assets={assets} />
      {filteredAssets.length === 0 ? <EmptyState icon={ClipboardCheck} title={filter === 'all' ? 'No assets yet' : `No "${filter}" assets`} description={filter === 'all' ? 'Add assets manually or import from CSV.' : 'Try a different filter.'} /> : <div className="space-y-2">{filteredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} onUpdate={(data) => updateMutation.mutate({ id: asset.id, data })} onDelete={() => deleteMutation.mutate(asset.id)} />)}</div>}
      <AssetFormDialog open={showForm} onClose={() => setShowForm(false)} onSubmit={(data) => createMutation.mutate({ ...data, project_id: projectId })} isLoading={createMutation.isPending} />
    </div>
  );
}