import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const settledRef = useRef(false);

  useEffect(() => {
    // One-time cleanup: remove deprecated BYOK key from localStorage
    try {
      if (typeof window !== "undefined" && localStorage.getItem("ts:anthropicKey") !== null) {
        localStorage.removeItem("ts:anthropicKey");
      }
    } catch {}

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // Before the stored session has been read back, ignore empty events —
      // they'd otherwise flash a "signed out" state and bounce guarded pages.
      if (!settledRef.current && !s && event !== "SIGNED_OUT") return;
      setSession(s);
      if (s || event === "SIGNED_OUT") {
        settledRef.current = true;
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      settledRef.current = true;
      setSession((prev) => data.session ?? prev);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    loading,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    async signUp(email, password, displayName) {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: displayName ? { display_name: displayName } : undefined,
        },
      });
      return { error };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
