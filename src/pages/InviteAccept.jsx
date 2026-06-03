/**
 * InviteAccept — handles /invite?project=<id>&email=<email>&role=<role>
 *
 * Flow:
 * 1. Not logged in → redirect to /login?redirect=/invite?...
 * 2. Logged in, email matches → auto-accept, redirect to project
 * 3. Logged in, email mismatch → show warning
 * 4. Already a member → just redirect to project
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Users, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InviteAccept() {
  const [searchParams]        = useSearchParams();
  const { user, session, loading } = useAuth();
  const navigate              = useNavigate();
  const [status, setStatus]   = useState('loading'); // loading | accepting | mismatch | already | error | done
  const [error,  setError]    = useState('');
  const [projectName, setProjectName] = useState('');

  const projectId    = searchParams.get('project');
  const invitedEmail = searchParams.get('email')?.toLowerCase();
  const role         = searchParams.get('role') || 'viewer';

  // Redirect to login if not authenticated, preserving the invite URL
  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`, { replace: true });
    }
  }, [session, loading, navigate]);

  useEffect(() => {
    if (loading || !session || !projectId) return;
    acceptInvite();
  }, [session, loading, projectId]);

  const acceptInvite = async () => {
    if (!projectId || !user) return;
    setStatus('accepting');

    try {
      // Load project name for display
      const { data: project } = await supabase
        .from('projects')
        .select('project_name')
        .eq('id', projectId)
        .maybeSingle();
      setProjectName(project?.project_name || 'this project');

      // Check email match if invite was for a specific email
      if (invitedEmail && user.email?.toLowerCase() !== invitedEmail) {
        setStatus('mismatch');
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('project_members')
        .select('id, role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setStatus('already');
        setTimeout(() => navigate(`/project/${projectId}`, { replace: true }), 1500);
        return;
      }

      // Add to project_members
      const { error: memberErr } = await supabase
        .from('project_members')
        .insert({ project_id: projectId, user_id: user.id, role });
      if (memberErr && memberErr.code !== '23505') throw memberErr;

      // Mark any matching invitation as accepted
      if (invitedEmail) {
        await supabase
          .from('invitations')
          .update({ status: 'accepted' })
          .eq('project_id', projectId)
          .eq('invited_email', invitedEmail);
      }

      setStatus('done');
      setTimeout(() => navigate(`/project/${projectId}`, { replace: true }), 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setStatus('error');
    }
  };

  if (loading || status === 'loading' || status === 'accepting') return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Accepting invite…</p>
      </div>
    </div>
  );

  if (status === 'done' || status === 'already') return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {status === 'already' ? 'Already a member' : 'Invite accepted!'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Redirecting you to <span className="text-foreground font-medium">{projectName}</span>…
        </p>
      </div>
    </div>
  );

  if (status === 'mismatch') return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Wrong account</h2>
        <p className="text-sm text-muted-foreground">
          This invite was sent to <span className="text-foreground font-medium">{invitedEmail}</span> but
          you're signed in as <span className="text-foreground font-medium">{user?.email}</span>.
        </p>
        <p className="text-sm text-muted-foreground">Sign in with the correct account to accept this invite.</p>
        <Button onClick={() => navigate('/login')} className="bg-primary text-primary-foreground w-full h-12">
          Sign in with a different account
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Invite error</h2>
        <p className="text-sm text-muted-foreground">{error || 'This invite link is invalid or has expired.'}</p>
        <Button onClick={() => navigate('/')} className="bg-primary text-primary-foreground w-full h-12">
          Go to Projects
        </Button>
      </div>
    </div>
  );
}
