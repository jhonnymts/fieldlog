import React, { useState } from 'react';
import { fieldlog } from '@/api/supabaseClient';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderOpen, MapPin, Calendar, ChevronRight, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import ProjectFormDialog from '@/components/projects/ProjectFormDialog';

async function deleteProjectWithRelatedRecords(projectId) {
  const dailyLogs = await fieldlog.entities.DailyLog.filter({ project_id: projectId });
  for (const log of dailyLogs) {
    const [entries, issues] = await Promise.all([
      fieldlog.entities.LogEntry.filter({ daily_log_id: log.id }),
      fieldlog.entities.IssueItem.filter({ daily_log_id: log.id }),
    ]);
    await Promise.all([
      ...entries.map((e) => fieldlog.entities.LogEntry.delete(e.id)),
      ...issues.map((i) => fieldlog.entities.IssueItem.delete(i.id)),
    ]);
  }
  const [assets, punchItems] = await Promise.all([
    fieldlog.entities.Asset.filter({ project_id: projectId }),
    fieldlog.entities.PunchItem.filter({ project_id: projectId }),
  ]);
  await Promise.all([
    ...assets.map((a) => fieldlog.entities.Asset.delete(a.id)),
    ...punchItems.map((p) => fieldlog.entities.PunchItem.delete(p.id)),
    ...dailyLogs.map((l) => fieldlog.entities.DailyLog.delete(l.id)),
  ]);
  return fieldlog.entities.Project.delete(projectId);
}

const activityColors = {
  FAT:          'bg-blue-500/20 text-blue-400',
  SAT:          'bg-emerald-500/20 text-emerald-400',
  'T&C':        'bg-amber-500/20 text-amber-400',
  Commissioning:'bg-purple-500/20 text-purple-400',
};

const roleColors = {
  owner:  'bg-amber-400/10 text-amber-400',
  editor: 'bg-blue-400/10 text-blue-400',
  viewer: 'bg-slate-400/10 text-slate-400',
};

function ProjectCard({ project, role, onDelete, deleteDisabled }) {
  const isOwner = role === 'owner';
  return (
    <Link
      to={`/project/${project.id}`}
      className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-foreground truncate">{project.project_name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activityColors[project.activity_type] || 'bg-muted text-muted-foreground'}`}>
              {project.activity_type}
            </span>
            {role && role !== 'owner' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${roleColors[role]}`}>
                <Users className="h-2.5 w-2.5" />
                {role === 'editor' ? 'Editor' : 'Viewer'}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{project.client_name}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            {project.location  && <span className="flex items-center gap-1"><MapPin   className="h-3 w-3" /> {project.location}</span>}
            {project.start_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(new Date(project.start_date + 'T12:00:00'), 'MMM d, yyyy')}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {isOwner && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={deleteDisabled}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(project); }}
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // My projects (where I am owner in project_members)
  const { data: myProjects = [], isLoading: loadingMine } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn:  () => fieldlog.entities.Project.filter({ user_id: user.id }, '-created'),
    enabled:  !!user,
  });

  // Shared projects (where I am editor/viewer in project_members)
  const { data: sharedProjects = [], isLoading: loadingShared } = useQuery({
    queryKey: ['sharedProjects', user?.id],
    enabled:  !!user,
    queryFn:  async () => {
      const { data: memberships, error } = await supabase
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user.id)
        .in('role', ['editor', 'viewer']);
      if (error) throw error;
      if (!memberships?.length) return [];

      const projectIds = memberships.map(m => m.project_id);
      const { data: projects, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created', { ascending: false });
      if (pErr) throw pErr;

      // Attach role to each project
      return (projects || []).map(p => ({
        ...p,
        _role: memberships.find(m => m.project_id === p.id)?.role || 'viewer',
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Create the project
      const project = await fieldlog.entities.Project.create({ ...data, user_id: user.id });
      // 2. Seed owner row in project_members
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id:    user.id,
        role:       'owner',
      });
      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      setShowForm(false);
      toast.success('Project created');
    },
    onError: (error) => {
      console.error('Create project error:', error);
      toast.error(error?.message || 'Failed to create project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjectWithRelatedRecords,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', user?.id] });
      toast.success('Project deleted');
    },
    onError: (error) => toast.error(error?.message || 'Unable to delete project'),
  });

  const handleDeleteProject = (project) => {
    const confirmed = window.confirm(
      `Delete project "${project.project_name}"?\n\nThis will also delete its daily logs, activity entries, issues, asset checklist items, and punch list items.`
    );
    if (confirmed) deleteMutation.mutate(project.id);
  };

  const isLoading = loadingMine || loadingShared;
  const totalCount = myProjects.length + sharedProjects.length;

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} project{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-5">
          <Plus className="h-5 w-5 mr-2" /> New Project
        </Button>
      </div>

      {totalCount === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create your first project to start logging field activities."
          action={
            <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* My projects */}
          {myProjects.length > 0 && (
            <div className="space-y-3">
              {sharedProjects.length > 0 && (
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">My Projects</p>
              )}
              {myProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  role="owner"
                  onDelete={handleDeleteProject}
                  deleteDisabled={deleteMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Shared with me */}
          {sharedProjects.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">Shared with Me</p>
              {sharedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  role={project._role}
                  onDelete={handleDeleteProject}
                  deleteDisabled={deleteMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ProjectFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
