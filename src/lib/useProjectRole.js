/**
 * useProjectRole — returns the current user's role on a given project.
 *
 * role values: 'owner' | 'editor' | 'viewer' | null (not a member / loading)
 *
 * Convenience booleans:
 *   canEdit  — owner or editor (can create/update/delete records)
 *   isOwner  — owner only (can invite/remove members, delete project)
 *   loading  — query in flight
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';

export function useProjectRole(projectId) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['projectRole', projectId, user?.id],
    enabled: !!projectId && !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      // Check project_members table for shared membership
      const { data: member, error } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return member?.role ?? null;
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
