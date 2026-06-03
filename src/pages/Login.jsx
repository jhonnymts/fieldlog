import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, Loader2, UserPlus, LogIn } from 'lucide-react';

export default function Login() {
  const { signIn, signUp }    = useAuth();
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const redirectTo            = searchParams.get('redirect') || '/';

  const [mode,     setMode]     = useState('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl font-mono">FL</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">FieldLog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address" required autoFocus
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Password (min 6 chars)' : 'Password'}
              required minLength={mode === 'signup' ? 6 : undefined}
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
              <p className="text-xs text-emerald-400">{success}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : mode === 'signin'
                ? <><LogIn className="h-4 w-4" /> Sign In</>
                : <><UserPlus className="h-4 w-4" /> Create Account</>}
          </button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-5">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
            className="text-primary font-medium hover:underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
