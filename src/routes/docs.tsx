import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Calculator,
  Gauge,
  Coins,
  Layers,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "How it works — TokenSavvy Docs" },
      {
        name: "description",
        content:
          "Plain-English guide to AI estimates, calibration, per-platform credit logic, and everything you need to know about Generate Strategy.",
      },
      { property: "og:title", content: "How it works — TokenSavvy Docs" },
      {
        property: "og:description",
        content:
          "Understand AI estimates, calibration, and per-platform credit logic in TokenSavvy.",
      },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Documentation
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
          How TokenSavvy works
        </h1>
        <p className="mt-3 text-muted-foreground">
          A plain-English guide to estimates, calibration, and how we account for
          credits across different AI platforms.
        </p>

        <nav className="mt-6 grid sm:grid-cols-2 gap-2 text-sm">
          <TocLink href="#what-is-a-strategy" label="What is a strategy?" />
          <TocLink href="#what-is-a-credit" label="What is a credit?" />
          <TocLink href="#per-platform" label="Per-platform credit logic" />
          <TocLink href="#estimates" label="How AI estimates work" />
          <TocLink href="#calibration" label="Calibration explained" />
          <TocLink href="#tracking" label="Tracking actuals" />
          <TocLink href="#privacy" label="Privacy & data" />
          <TocLink href="#tips" label="Tips for accuracy" />
        </nav>
      </header>

      <div className="space-y-8">
        <Section
          id="what-is-a-strategy"
          icon={<Layers className="h-4 w-4" />}
          title="What is a strategy?"
        >
          <p>
            A <strong>strategy</strong> is an ordered plan that tells you exactly
            which AI platform to use for each step of building your idea —
            optimized to spend the fewest credits while still getting you to a
            working result.
          </p>
          <p>
            Each step includes the action to take, which platform to use (e.g.
            Lovable, Claude, ChatGPT), the mode (Build, Chat, etc.), an estimated
            cost in credits, and the exact prompt to copy-paste.
          </p>
        </Section>

        <Section
          id="what-is-a-credit"
          icon={<Coins className="h-4 w-4" />}
          title="What is a credit?"
        >
          <p>
            We normalize every cost into a single unit:{" "}
            <strong>1 credit ≈ 1 Lovable build credit ≈ ~$0.10 of API spend</strong>
            . This makes it possible to compare costs across very different
            platforms in one number.
          </p>
          <Callout>
            Credits are an <em>estimate of effort</em>, not a billing unit on the
            other platforms. Your actual bill on each platform still follows that
            platform's own pricing.
          </Callout>
        </Section>

        <Section
          id="per-platform"
          icon={<Gauge className="h-4 w-4" />}
          title="Per-platform credit logic"
        >
          <p>
            Different platforms charge in different units. We convert everything to
            credits using these rough conversions:
          </p>
          <table className="mt-3 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Platform</th>
                <th className="py-2 pr-3 font-medium">Mode</th>
                <th className="py-2 font-medium">≈ Credits per action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <Row p="Lovable" m="Build" c="1–3 credits per meaningful change" />
              <Row p="Lovable" m="Chat / Plan" c="1 credit per message" />
              <Row p="Claude / ChatGPT" m="Chat" c="$0.10 of usage ≈ 1 credit" />
              <Row p="Cursor / Bolt / v0" m="Various" c="Mapped to nearest equivalent" />
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">
            On the results page, the <em>Cost by platform</em> card sums the
            estimated credits for every step on that platform, so you can see at a
            glance where your effort (and money) goes.
          </p>
        </Section>

        <Section
          id="estimates"
          icon={<Calculator className="h-4 w-4" />}
          title="How AI estimates work"
        >
          <p>
            When you click <strong>Generate Strategy</strong>, we ask an AI to
            think about your idea, pick the cheapest combination of platforms and
            modes, and return per-step credit estimates. The AI is instructed to:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Always answer in <strong>credits</strong> (e.g. "1 credit", "2-4
              credits", "~5 credits") — never dollars or tokens.
            </li>
            <li>
              Make the sum of step costs land within ±20% of the headline total
              (a built-in sanity check).
            </li>
            <li>
              Prefer cheaper modes (Chat / Plan) for thinking, and Build mode only
              when code actually needs to change.
            </li>
          </ul>
          <Callout>
            These are <strong>rough estimates</strong>. Real spend depends on how
            many iterations you go through, how big your codebase grows, and how
            chatty you are with the AI.
          </Callout>
        </Section>

        <Section
          id="calibration"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Calibration explained"
        >
          <p>
            Every time you log what a step <em>actually</em> cost in the tracker,
            we learn a tiny bit more about your personal pattern. We compute one
            number per user:
          </p>
          <pre className="rounded-lg border border-border bg-card/60 p-3 text-xs font-mono overflow-x-auto">
            avgErrorPct = average of (actual / estimated − 1) across past
            strategies
          </pre>
          <p>
            If your actuals consistently run 30% over the AI's guesses, the next
            time you generate a strategy we quietly tell the AI:{" "}
            <em>"This user historically spends 30% more than estimated — bump
            your numbers up accordingly."</em>
          </p>
          <p>
            You'll see a small{" "}
            <span className="rounded-md border border-border bg-card px-1.5 py-0.5 text-xs">
              Calibrating estimates
            </span>{" "}
            toast when this kicks in. It only activates when:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>You have at least 2 past strategies with logged actuals</li>
            <li>Your average error is at least ±10%</li>
            <li>You haven't disabled calibration in Settings</li>
          </ul>
          <p>
            Want raw, unmodified AI estimates? Go to{" "}
            <Link to="/settings" className="text-primary underline-offset-2 hover:underline">
              Settings
            </Link>{" "}
            and switch off <em>Use historical calibration</em>.
          </p>
        </Section>

        <Section
          id="tracking"
          icon={<Gauge className="h-4 w-4" />}
          title="Tracking actuals"
        >
          <p>
            On the results page (and the dashboard), each step has a checkbox and
            a small "actual cost" field. Logging real numbers does two things:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Powers the <em>Estimate accuracy</em> widget on your dashboard.
            </li>
            <li>
              Feeds the calibration loop above, so future strategies get more
              accurate over time.
            </li>
          </ul>
        </Section>

        <Section
          id="privacy"
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Privacy & data"
        >
          <p>
            Your strategies, progress, and actuals are stored in your account and
            protected by row-level security — only you can read or modify them.
            The calibration signal never leaves your account; it's recomputed
            client-side and passed to the AI only as a single percentage number.
          </p>
          <p>
            TokenSavvy uses a managed AI gateway under the hood, so you don't
            need to bring or store your own API keys.
          </p>
        </Section>

        <Section
          id="tips"
          icon={<Lightbulb className="h-4 w-4" />}
          title="Tips for the most accurate estimates"
        >
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Be specific</strong> in the idea field — features,
              integrations, target users. Vague prompts get vague (and often
              optimistic) estimates.
            </li>
            <li>
              <strong>Pick the platforms you actually have access to.</strong>{" "}
              The AI won't route work to platforms you didn't tick.
            </li>
            <li>
              <strong>Log actuals as you go.</strong> Even rough numbers improve
              calibration after just 2-3 strategies.
            </li>
            <li>
              <strong>Treat the plan as a starting point</strong>, not a contract.
              Real software always involves a few unplanned iterations.
            </li>
          </ul>
        </Section>

        <div className="rounded-xl border border-border bg-gradient-to-br from-card to-card/40 p-6 shadow-card">
          <h3 className="text-base font-medium">Ready to try it?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate your first strategy in under a minute.
          </p>
          <Link
            to="/generate"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow hover:opacity-95"
          >
            Generate a strategy
            <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-xl border border-border bg-card p-6 shadow-card"
    >
      <header className="mb-4 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="text-lg font-medium">{title}</h2>
      </header>
      <div className="space-y-3 text-sm text-foreground/85 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function TocLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-border bg-card/60 px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
    >
      {label}
    </a>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-foreground/80">
      {children}
    </div>
  );
}

function Row({ p, m, c }: { p: string; m: string; c: string }) {
  return (
    <tr>
      <td className="py-2 pr-3 font-medium">{p}</td>
      <td className="py-2 pr-3 text-muted-foreground">{m}</td>
      <td className="py-2 text-muted-foreground">{c}</td>
    </tr>
  );
}
