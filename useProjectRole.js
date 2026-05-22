/**
 * useProjectRole — returns the current user's role on a given project.
 *
 * Strategy:
 * 1. Check projects.user_id — if it matches, user is 'owner' regardless of
 *    whether a project_members row exists yet.
 * 2. If not the direct owner, check project_members for a shared role.
 *
 * This two-step approach means owners always get full access even if the
 * project_members seed row is missing or the table doesn't exist yet.
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

export function useProjectRole(projectId) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['projectRole', projectId, user?.id],
    enabled:   !!projectId && !!user?.id,
    staleTime: 30_000,
    queryFn:   async () => {
      if (!projectId || !user?.id) return null;

      // Step 1 — am I the direct owner of this project?
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .maybeSingle();

      if (pErr) throw pErr;
      if (project?.user_id === user.id) return 'owner';

      // Step 2 — am I a shared member?
      try {
        const { data: member, error: mErr } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (mErr) {
          // project_members table may not exist yet — treat as no access
          console.warn('project_members query failed:', mErr.message);
          return null;
        }
        return member?.role ?? null;
      } catch {
        return null;
      }
    },
  });

  const role = isLoading ? null : (data ?? null);

  return {
    role,
    loading:  isLoading,
    isOwner:  role === 'owner',
    canEdit:  role === 'owner' || role === 'editor',
    isViewer: role === 'viewer',
  };
}
