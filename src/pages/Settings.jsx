import React, { useState, useEffect } from 'react';
import { fieldlog, supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Settings as SettingsIcon, ImagePlus, Trash2, Users, Check, X, Crown, Pencil, Eye } from 'lucide-react';
import { toast } from 'sonner';

// ─── Cached profile for PDF export ───────────────────────────────────────────
let _cachedProfile = {};
export function getSettings() { return _cachedProfile; }

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ROLE_LABELS = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' };
const ROLE_ICONS  = { owner: Crown, editor: Pencil, viewer: Eye };
const ROLE_COLORS = {
  owner:  'text-amber-400 bg-amber-400/10',
  editor: 'text-blue-400 bg-blue-400/10',
  viewer: 'text-slate-400 bg-slate-400/10',
};

export default function Settings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [engineerName, setEngineerName] = useState('');
  const [companyName,  setCompanyName]  = useState('');
  const [logoDataUrl,  setLogoDataUrl]  = useState('');
  const [saving, setSaving] = useState(false);

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fieldlog.entities.UserProfile.filter({ user_id: user.id }).then((rows) => {
      const profile = rows?.[0] || {};
      setEngineerName(profile.engineer_name || '');
      setCompanyName(profile.company_name   || '');
      setLogoDataUrl(profile.logo_data_url  || '');
      _cachedProfile = {
        engineerName: profile.engineer_name || '',
        companyName:  profile.company_name  || '',
        logoDataUrl:  profile.logo_data_url || '',
      };
    });
  }, [user]);

  // ── Pending invitations for the current user ───────────────────────────────
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['myInvitations', user?.id],
    enabled:  !!user?.email,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('id, project_id, role, invited_by, created, projects(project_name, client_name)')
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .order('created', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Projects I'm a member of (editor/viewer) ───────────────────────────────
  const { data: memberships = [] } = useQuery({
    queryKey: ['myMemberships', user?.id],
    enabled:  !!user?.id,
    queryFn:  async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select('id, role, created, project_id, projects(project_name, client_name, activity_type)')
        .eq('user_id', user.id)
        .neq('role', 'owner')
        .order('created', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── Accept invitation ──────────────────────────────────────────────────────
  const acceptMutation = useMutation({
    mutationFn: async (invite) => {
      // 1. Add to project_members
      const { error: memberErr } = await supabase.from('project_members').insert({
        project_id: invite.project_id,
        user_id:    user.id,
        role:       invite.role,
        invited_by: invite.invited_by,
      });
      if (memberErr && memberErr.code !== '23505') throw memberErr; // ignore duplicate

      // 2. Mark invitation accepted
      const { error: invErr } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invite.id);
      if (invErr) throw invErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myInvitations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myMemberships', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sharedProjects', user?.id] });
      toast.success('Invitation accepted — project added to your list');
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Decline invitation ─────────────────────────────────────────────────────
  const declineMutation = useMutation({
    mutationFn: async (inviteId) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'declined' })
        .eq('id', inviteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myInvitations', user?.id] });
      toast.success('Invitation declined');
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Leave project ──────────────────────────────────────────────────────────
  const leaveMutation = useMutation({
    mutationFn: async (membershipId) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMemberships', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sharedProjects', user?.id] });
      toast.success('Left project');
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Logo handlers ──────────────────────────────────────────────────────────
  const handleLogoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/'))   { toast.error('Please select an image file'); return; }
    if (file.size > 750 * 1024)            { toast.error('Logo image is too large. Use an image under 750 KB.'); return; }
    try {
      const dataUrl = await readImageAsDataUrl(file);
      setLogoDataUrl(dataUrl);
      toast.success('Logo loaded. Save settings to keep it.');
    } catch { toast.error('Unable to read the selected logo image'); }
  };

  const handleRemoveLogo = () => {
    setLogoDataUrl('');
    toast.success('Logo removed. Save settings to keep the change.');
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const existing = await fieldlog.entities.UserProfile.filter({ user_id: user.id });
      const payload  = { user_id: user.id, engineer_name: engineerName, company_name: companyName, logo_data_url: logoDataUrl };
      if (existing?.length > 0) {
        await fieldlog.entities.UserProfile.update(existing[0].id, payload);
      } else {
        await fieldlog.entities.UserProfile.create(payload);
      }
      _cachedProfile = { engineerName, companyName, logoDataUrl };
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          {user?.email && <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>}
        </div>
      </div>

      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Engineer Name</Label>
          <p className="text-xs text-muted-foreground mb-2">Your name as it appears in PDF report headers</p>
          <Input value={engineerName} onChange={(e) => setEngineerName(e.target.value)} className="bg-secondary border-border h-12" placeholder="e.g. Jhonny Matos" />
        </div>

        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Company Name</Label>
          <p className="text-xs text-muted-foreground mb-2">Shown in PDF report headers as "Prepared by"</p>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="bg-secondary border-border h-12" placeholder="e.g. Burrow Global LLC" />
        </div>

        <div>
          <Label className="text-muted-foreground text-xs uppercase tracking-wider">Company Logo</Label>
          <p className="text-xs text-muted-foreground mb-2">Optional image shown in the PDF report header</p>
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <label className="flex items-center justify-center gap-2 h-12 px-4 rounded-lg border border-border bg-secondary cursor-pointer hover:bg-secondary/80 transition-colors text-sm font-medium text-foreground">
              <ImagePlus className="h-4 w-4" />
              Choose Logo
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
            {logoDataUrl && (
              <div className="flex items-center gap-3">
                <div className="h-14 w-28 rounded-lg bg-white border border-border flex items-center justify-center overflow-hidden p-2">
                  <img src={logoDataUrl} alt="Company logo preview" className="max-h-full max-w-full object-contain" />
                </div>
                <Button type="button" variant="ghost" onClick={handleRemoveLogo} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4 mr-2" /> Remove
                </Button>
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* ── Pending Invitations ───────────────────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Pending Invitations</h3>
              <p className="text-xs text-muted-foreground">Accept to gain access to shared projects</p>
            </div>
          </div>
          <div className="space-y-2">
            {pendingInvites.map((inv) => {
              const RoleIcon = ROLE_ICONS[inv.role] || Eye;
              return (
                <div key={inv.id} className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {inv.projects?.project_name || 'Unknown Project'}
                    </p>
                    {inv.projects?.client_name && (
                      <p className="text-xs text-muted-foreground">{inv.projects.client_name}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[inv.role]}`}>
                    <RoleIcon className="h-3 w-3" />
                    {ROLE_LABELS[inv.role]}
                  </span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => acceptMutation.mutate(inv)}
                      disabled={acceptMutation.isPending}
                      className="h-8 px-3 bg-primary text-primary-foreground text-xs"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineMutation.mutate(inv.id)}
                      disabled={declineMutation.isPending}
                      className="h-8 px-3 border-border text-muted-foreground text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Shared Projects I'm a member of ──────────────────────────────── */}
      {memberships.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Shared Projects</h3>
              <p className="text-xs text-muted-foreground">Projects shared with you by others</p>
            </div>
          </div>
          <div className="space-y-2">
            {memberships.map((m) => {
              const RoleIcon = ROLE_ICONS[m.role] || Eye;
              return (
                <div key={m.id} className="flex items-center gap-3 bg-secondary rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {m.projects?.project_name || 'Unknown Project'}
                    </p>
                    {m.projects?.client_name && (
                      <p className="text-xs text-muted-foreground">{m.projects.client_name}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[m.role]}`}>
                    <RoleIcon className="h-3 w-3" />
                    {ROLE_LABELS[m.role]}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm(`Leave "${m.projects?.project_name}"?`)) {
                        leaveMutation.mutate(m.id);
                      }
                    }}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs flex-shrink-0"
                  >
                    Leave
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Settings are saved to your account and available on any device.
      </p>
    </div>
  );
}
