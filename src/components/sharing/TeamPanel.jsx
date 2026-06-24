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
  const base   = import.meta.env.VITE_APP_URL || window.location.origin;
  const params = new URLSearchParams({ project: projectId, email: email.trim().toLowerCase(), role });
  return `${base}/invite?${params.toString()}`;
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export default function TeamPanel({ projectId }) {
  const { user }    = useAuth();
  const queryClient = useQueryClient();

  const [email,      setEmail]      = useState('');
  const [role,       setRole]       = useState('editor');
  const [sending,    setSending]    = useState(false);
  const [copiedId,   setCopiedId]   = useState(null);
  const [lastInvite, setLastInvite] = useState(null);

  // ── Members ────────────────────────────────────────────────────────────────
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['projectMembers', projectId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('id, user_id, role, member_email, created')
        .eq('project_id', projectId)
        .order('created');
      if (error) throw error;
      return (data || []).map(m => ({
        ...m,
        isSelf:       m.user_id === user?.id,
        displayEmail: m.member_email || (m.user_id === user?.id ? user?.email : `Member ${m.user_id.slice(0, 8)}…`),
      }));
    },
  });

  // ── Pending invitations ────────────────────────────────────────────────────
  const { data: invitations = [] } = useQuery({
    queryKey: ['projectInvitations', projectId],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, invited_email, role, status, created')
        .eq('project_id', projectId)
        .eq('status', 'pending')
        .order('created');
      if (error) { console.warn('invitations query error:', error.message); return []; }
      return data || [];
    },
  });

  // ── Copy link ──────────────────────────────────────────────────────────────
  const handleCopyLink = async (invEmail, invRole, id) => {
    const link = buildInviteLink(projectId, invEmail, invRole);
    const ok   = await copyToClipboard(link);
    if (ok) {
      setCopiedId(id);
      toast.success('Invite link copied — paste it into email or Slack');
      setTimeout(() => setCopiedId(null), 3000);
    } else {
      toast.success(`Invite link for ${invEmail}`, { description: link, duration: 20000 });
    }
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
      // Step 1: Always upsert an invitation row
      const { error: invErr } = await supabase.from('invitations').upsert(
        { project_id: projectId, invited_email: trimmed, role, invited_by: user.id, status: 'pending' },
        { onConflict: 'project_id,invited_email' }
      );
      if (invErr) throw invErr;
      queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] });

      // Step 2: If user already has an account, add to project_members directly
      try {
        const { data: existingUserId } = await supabase.rpc('get_user_id_by_email', { p_email: trimmed });
        if (existingUserId) {
          const { error: memberErr } = await supabase.from('project_members').insert({
            project_id:   projectId,
            user_id:      existingUserId,
            role,
            invited_by:   user.id,
            member_email: trimmed,
          });
          if (memberErr && memberErr.code !== '23505') {
            console.warn('project_members insert warning:', memberErr.message);
          }
          queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
        }
      } catch {
        // RPC not available — invitation row still created, link still works
      }

      setLastInvite({ email: trimmed, role });
      setEmail('');
      await handleCopyLink(trimmed, role, 'banner');
    } catch (err) {
      toast.error(err.message || 'Failed to invite');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      toast.success('Member removed');
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Cancel invitation ───────────────────────────────────────────────────────
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const { error } = await supabase.from('invitations').delete().eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectInvitations', projectId] });
      toast.success('Invitation cancelled');
    },
    onError: (e) => toast.error(e.message),
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
          <SelectTrigger className="bg-secondary border-border h-10 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleInvite}
          disabled={sending || !email.trim()}
          className="bg-primary text-primary-foreground h-10 px-3"
          title="Invite member"
        >
          {sending
            ? <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            : <UserPlus className="h-4 w-4" />}
        </Button>
      </div>

      {/* ── Invite link banner ────────────────────────────────────────────── */}
      {lastInvite && (
        <div className="rounded-lg border border-primary/30 bg-secondary p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">Invite link ready</p>
              <p className="text-xs text-muted-foreground truncate">
                {lastInvite.email} · {ROLE_LABELS[lastInvite.role]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Send this link via email or Slack so they can join.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => handleCopyLink(lastInvite.email, lastInvite.role, 'banner')}
              className="h-8 px-3 bg-primary text-primary-foreground text-xs flex-shrink-0"
            >
              {copiedId === 'banner'
                ? <><Check className="h-3.5 w-3.5 mr-1" /> Copied</>
                : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy Link</>}
            </Button>
          </div>
        </div>
      )}

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
                <Select value={member.role} onValueChange={(v) => changeRoleMutation.mutate({ memberId: member.id, newRole: v })}>
                  <SelectTrigger className="bg-card border-border h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {!member.isSelf && member.role !== 'owner' && (
                <Button variant="ghost" size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Pending invitations
          </p>
          {invitations.map((inv) => (
            <div key={inv.id}
              className="flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 bg-secondary/40">
              <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground flex-1 truncate">{inv.invited_email}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[inv.role]}`}>
                {ROLE_LABELS[inv.role]}
              </span>
              <Button variant="ghost" size="icon"
                className={`h-7 w-7 flex-shrink-0 transition-colors ${copiedId === inv.id ? 'text-emerald-400' : 'text-muted-foreground hover:text-primary'}`}
                onClick={() => handleCopyLink(inv.invited_email, inv.role, inv.id)}
                title="Copy invite link">
                {copiedId === inv.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => cancelInviteMutation.mutate(inv.id)}
                title="Cancel invitation">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Paste the copied link in an email or Slack. They must sign in to FieldLog to accept.
      </p>
    </div>
  );
}
