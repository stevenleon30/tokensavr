import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { PLATFORM_LIST } from "@/lib/platforms";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — TokenSavvy" },
      { name: "description", content: "Configure preferences and account settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [dailyBudget, setDailyBudget] = useState(5);
  const [preferred, setPreferred] = useState<string[]>([]);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [calibrationEnabled, setCalibrationEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,daily_budget_credits,preferred_platforms")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName(data.display_name ?? "");
        setDailyBudget(data.daily_budget_credits ?? 5);
        setPreferred((data.preferred_platforms as string[]) ?? []);
      }
      try {
        setAnthropicKey(localStorage.getItem("ts:anthropicKey") ?? "");
        setCalibrationEnabled(localStorage.getItem("ts:calibrationDisabled") !== "1");
      } catch {}
      setLoading(false);
    })();
  }, [user]);

  const togglePref = (id: string) => {
    setPreferred((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        daily_budget_credits: dailyBudget,
        preferred_platforms: preferred,
      })
      .eq("user_id", user.id);
    try {
      if (anthropicKey) localStorage.setItem("ts:anthropicKey", anthropicKey);
      else localStorage.removeItem("ts:anthropicKey");
    } catch {}
    setSaving(false);
    if (error) toast.error("Couldn't save settings.");
    else toast.success("Settings saved.");
  };

  const onDeleteAccount = async () => {
    if (!user) return;
    // Delete strategies; auth user deletion requires admin — sign out as best UX
    const { error } = await supabase.from("strategies").delete().eq("user_id", user.id);
    if (error) toast.error("Couldn't clear data.");
    await signOut();
    toast.message("Account data cleared. Contact support to fully delete your login.");
    navigate({ to: "/" });
  };

  if (authLoading || !user || loading) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        Personalize TokenSavvy and manage your account.
      </p>

      <div className="mt-8 space-y-6">
        <Section title="Profile" desc="How we address you in the app.">
          <Field label="Display name">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-card border-border"
            />
          </Field>
          <Field label="Email">
            <Input value={user.email ?? ""} readOnly className="bg-muted border-border" />
          </Field>
        </Section>

        <Section
          title="Defaults"
          desc="Used to pre-fill the strategy generator and tracker."
        >
          <Field label="Daily strategy budget">
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={1000}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(parseInt(e.target.value) || 1)}
                className="w-32 bg-card border-border"
              />
              <span className="text-xs text-muted-foreground">strategies / day</span>
            </div>
          </Field>
          <Field label="Preferred platforms">
            <div className="flex flex-wrap gap-2">
              {PLATFORM_LIST.map((p) => {
                const active = preferred.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePref(p.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
                      active
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold text-background"
                      style={{ backgroundColor: p.color }}
                      aria-hidden
                    >
                      {p.initial}
                    </span>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </Field>
        </Section>

        <Section title="Appearance" desc="Dark mode is on by default.">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Dark mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toggle the editor's color scheme.
              </p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
            />
          </div>
        </Section>

        <Section
          title="API keys (optional)"
          desc="TokenSavvy uses managed AI by default. You can supply your own key for full control."
        >
          <Field label="Anthropic API key (saved locally only)">
            <Input
              type="password"
              placeholder="sk-ant-…"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="bg-card border-border"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Stored in your browser only. We don't send this to our servers in this version.
            </p>
          </Field>
        </Section>

        <div className="flex items-center gap-3">
          <Button onClick={onSave} disabled={saving} className="bg-gradient-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
          <Button variant="ghost" onClick={() => signOut().then(() => navigate({ to: "/" }))}>
            Sign out
          </Button>
        </div>

        <Section title="Danger zone" desc="Permanently remove your saved data.">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes every saved strategy and signs you out. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAccount}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card">
      <header className="mb-5">
        <h2 className="text-base font-medium">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-1">{desc}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
