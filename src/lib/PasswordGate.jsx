/**
 * PasswordGate
 * Replaces Base44 AuthContext. No server auth — just a shared passphrase
 * stored in sessionStorage so the team doesn't re-enter every tab open.
 * The correct password is set via VITE_APP_PASSWORD env var at build time.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const GateContext = createContext({ unlocked: false });
export const useGate = () => useContext(GateContext);

const SESSION_KEY = 'fieldlog_unlocked';
const CORRECT = import.meta.env.VITE_APP_PASSWORD || 'fieldlog';

export function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === 'yes') setUnlocked(true);
    setChecking(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === CORRECT) {
      sessionStorage.setItem(SESSION_KEY, 'yes');
      setUnlocked(true);
    } else {
      setError(true);
      setInput('');
      setTimeout(() => setError(false), 1500);
    }
  };

  if (checking) return null;

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl font-mono">FL</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">FieldLog</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter team password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Password"
                autoFocus
                className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-destructive ring-destructive/30'
                    : 'border-border focus:ring-primary/30 focus:border-primary'
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive text-center">Incorrect password</p>
            )}
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <GateContext.Provider value={{ unlocked }}>
      {children}
    </GateContext.Provider>
  );
}
