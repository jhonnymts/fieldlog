import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2, Crown, Pencil, Eye, Clock, X, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const ROLE_ICONS  = { owner: Crown, editor: Pencil, viewer: Eye };
const ROLE_COLORS = {
  owner:  'text-amber-400 bg-amber-400/10',
  editor: 'text-blue-400 bg-blue-400/10',
  viewer: 'text-slate-400 bg-slate-400/10',
};

function buildInviteLink(projectId, email, role) {
  const base = window.location.origin;
  const params = new URLSearchParams({ project: projectId, email: email.trim().toLowerCase(), role });
  return `${base}/invite?${params.toString()}`;
}

export default function TeamPanel({ projectId }) {
  const { user }        = useAuth();
  const queryClient     = useQueryClient();
  const [email,   setEmail]   = useState('');
  const [role,    setRole]    = useState('editor');
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null); // tracks which invite link was just copied

  // ── Members ────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['projectMembers', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('id, user_id, role, created')
        .eq('project_id', projectId)
        .order('created');
      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        isSelf:       m.user_id === user?.id,
        displayEmail: m.user_id === user?.id ? user?.email : `Member ${m.user_id.slice(0, 6)}…`,
      }));
    },
  });

  // ── Pending invitations ────────────────────────────────────────────────────
  const { data: invitations = [] } = useQuery({
    queryKey: ['projectInvitations', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, invited_email, role, status, created')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('created');
      if (error) throw error;
      return data || [];
    },
  });

  // ── Copy invite link ────────────────────────────────────────────────────────
  const handleCopyLink = (invEmail, invRole, id) => {
    const link = buildInviteLink(projectId, invEmail, invRole);
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      toast.success('Invite link copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Fallback for browsers that block clipboard without HTTPS
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      toast.success('Invite link copied');
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ── Invite ─────────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Enter a valid email address');
      return;
    }
    setSending(true);
    try {
      // Try to find user by email via RPC
      const { data: userId } = await supabase
        .rpc('get_user_id_by_email', { p_email: trimmed });

      if (userId) {
        // User exists — add directly to project_members
        const { error } = await supabase.from('project_members').insert({
          project_id: projectId, user_id: userId, role, invited_by: user.id,
        });
        if (error) {
          if (error.code === '23505') toast.error('This user is already a member');
          else throw error;
        } else {
          toast.success(`${trimmed} added as ${ROLE_LABELS[role]}`);
          queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
        }
      } else {
        // User not found — create pending invitation
        const { error } = await supabase.from('invitations').insert({
          project_id: projectId, invited_email: trimmed,
          role, invited_by: user.id, status: 'pending',
        });
        if (error) {
          if (error.code === '23505') {
            // Invitation already exists — still copy the link
            toast.success('Invitation already sent — link copied to clipboard');
            handleCopyLink(trimmed, role, 'new');
          } else throw error;
        } else {
          queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] });
          // Auto-copy the invite link so owner can share it immediately
          handleCopyLink(trimmed, role, 'new');
          toast.success(`Invite link copied! Send it to ${trimmed}`);
        }
      }
      setEmail('');
    } catch (err) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  // ── Change role ─────────────────────────────────────────────────────────────
  const changeRoleMutation = useMutation({
    mutationFn: async ({ memberId, newRole }) => {
      const { error } = await supabase.from('project_members').update({ role: newRole }).eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] }),
    onError:   (e) => toast.error(e.message),
  });

  // ── Remove member ───────────────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: async (memberId) => {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] }); toast.success('Member removed'); },
    onError:   (e) => toast.error(e.message),
  });

  // ── Cancel invitation ───────────────────────────────────────────────────────
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const { error } = await supabase.from('invitations').delete().eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] }); toast.success('Invitation cancelled'); },
    onError:   (e) => toast.error(e.message),
  });

  if (loadingMembers) return (
    <div className="flex items-center justify-center py-6">
      <div className="w-5 h-5 border-2 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Invite form ──────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          placeholder="colleague@email.com"
          className="bg-secondary border-border h-10 flex-1"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="bg-secondary border-border h-10 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleInvite}
          disabled={sending || !email.trim()}
          className="bg-primary text-primary-foreground h-10 px-3"
          title="Add member / create invite"
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <UserPlus className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Helper text ──────────────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        If the person doesn't have a FieldLog account yet, an invite link will be copied automatically — paste it into an email or Slack message.
      </p>

      {/* ── Member list ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        {members.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role] || Eye;
          return (
            <div key={member.id} className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {member.displayEmail}
                  {member.isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
              </div>
              {member.role === 'owner' || member.isSelf ? (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role]}`}>
                  <RoleIcon className="h-3 w-3" />
                  {ROLE_LABELS[member.role]}
                </span>
              ) : (
                <Select
                  value={member.role}
                  onValueChange={(v) => changeRoleMutation.mutate({ memberId: member.id, newRole: v })}
                >
                  <SelectTrigger className="bg-card border-border h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {!member.isSelf && member.role !== 'owner' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeMutation.mutate(member.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Pending invitations ───────────────────────────────────────────── */}
      {invitations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-3 mb-2">
            Pending Invitations
          </p>
          {invitations.map((inv) => (
            <div key={inv.id} className="flex items-center gap-2 bg-secondary/50 border border-dashed border-border rounded-lg px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1 truncate">{inv.invited_email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[inv.role]}`}>
                {ROLE_LABELS[inv.role]}
              </span>
              {/* Copy invite link */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 flex-shrink-0 transition-colors ${copiedId === inv.id ? 'text-emerald-400' : 'text-muted-foreground hover:text-primary'}`}
                onClick={() => handleCopyLink(inv.invited_email, inv.role, inv.id)}
                title="Copy invite link"
              >
                {copiedId === inv.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              {/* Cancel */}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => cancelInviteMutation.mutate(inv.id)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
