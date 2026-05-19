/**
 * AuthContext — Supabase Auth wrapper
 * Replaces PasswordGate. Provides session, user, and auth actions
 * to the entire app via useAuth() hook.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined); // undefined = loading
  const [user, setUser]         = useState(null);

  useEffect(() => {
    // Grab existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
    });

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = (email, password) =>
    supabase.auth.signUp({ email, password });

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });

  const signOut = () => supabase.auth.signOut();

  // session === undefined means we haven't heard back from Supabase yet
  const loading = session === undefined;

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
