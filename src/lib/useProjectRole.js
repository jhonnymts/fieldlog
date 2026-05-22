import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

export function useProjectRole(projectId) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey:  ['projectRole', projectId, user?.id],
    enabled:   !!projectId && !!user?.id,
    staleTime: 30_000,
    retry:     false,
    queryFn:   async () => {
      // Check if user owns this project directly
      const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .maybeSingle();

      if (project?.user_id === user.id) return 'owner';

      // Check project_members for shared access
      try {
        const { data: member } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();
        return member?.role ?? null;
      } catch {
        return null;
      }
    },
  });

  const role = data ?? null;

  return {
    role,
    loading:  isLoading,
    isOwner:  role === 'owner',
    canEdit:  role === 'owner' || role === 'editor',
    isViewer: role === 'viewer',
  };
}
