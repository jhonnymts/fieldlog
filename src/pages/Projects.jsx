import React, { useState } from 'react';
import { base44 } from '@/api/pocketbaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import EmptyState from '@/components/shared/EmptyState';
import ProjectFormDialog from '@/components/projects/ProjectFormDialog';

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => base44.entities.Project.list('-created_date') });
  const createMutation = useMutation({ mutationFn: (data) => base44.entities.Project.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); } });

  const activityColors = { FAT: 'bg-blue-500/20 text-blue-400', SAT: 'bg-emerald-500/20 text-emerald-400', 'T&C': 'bg-amber-500/20 text-amber-400', Commissioning: 'bg-purple-500/20 text-purple-400' };

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6"><div><h2 className="text-2xl font-bold text-foreground">Projects</h2><p className="text-sm text-muted-foreground mt-1">{projects.length} active project{projects.length !== 1 ? 's' : ''}</p></div><Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-5"><Plus className="h-5 w-5 mr-2" />New Project</Button></div>
      {projects.length === 0 ? <EmptyState icon={FolderOpen} title="No projects yet" description="Create your first project to start logging field activities." action={<Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> Create Project</Button>} /> : (
        <div className="space-y-3">{projects.map((project) => <Link key={project.id} to={`/project/${project.id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.98]"><div className="flex items-start justify-between"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-foreground truncate">{project.project_name}</h3><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activityColors[project.activity_type] || 'bg-muted text-muted-foreground'}`}>{project.activity_type}</span></div><p className="text-sm text-muted-foreground truncate">{project.client_name}</p><div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">{project.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {project.location}</span>}{project.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(project.start_date), 'MMM d, yyyy')}</span>}</div></div><ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" /></div></Link>)}</div>
      )}
      <ProjectFormDialog open={showForm} onClose={() => setShowForm(false)} onSubmit={(data) => createMutation.mutate(data)} isLoading={createMutation.isPending} />
    </div>
  );
}