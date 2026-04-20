import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — TokenSavvy" },
      {
        name: "description",
        content:
          "How TokenSavvy collects, uses, and protects your data when you generate AI coding strategies.",
      },
      { property: "og:title", content: "Privacy Policy — TokenSavvy" },
      {
        property: "og:description",
        content: "How TokenSavvy handles your data and AI prompts.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "April 2026";

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Legal</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
      </header>

      <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
        <Section title="1. Summary">
          <p>
            TokenSavvy is a planning tool for AI coding workflows. We collect the minimum
            data needed to run your account, generate strategies, and improve estimate
            accuracy. We do not sell your data. We do not use your project ideas to train
            our own models.
          </p>
        </Section>

        <Section title="2. What we collect">
          <ul className="mt-2 list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Account data:</strong> email address,
              optional display name, and authentication tokens managed by our backend
              provider.
            </li>
            <li>
              <strong className="text-foreground">Strategy content:</strong> the project
              ideas, budgets, and platform preferences you submit, plus the AI-generated
              steps and your progress notes.
            </li>
            <li>
              <strong className="text-foreground">Usage signals:</strong> step
              completions, actual credit costs you log, and aggregated accuracy metrics
              used to calibrate future estimates.
            </li>
            <li>
              <strong className="text-foreground">Preferences:</strong> theme, daily
              budget, preferred platforms, and the calibration toggle.
            </li>
            <li>
              <strong className="text-foreground">Local-only data:</strong> optional API
              keys you enter in Settings are stored in your browser's localStorage and
              never sent to our servers in this version.
            </li>
          </ul>
        </Section>

        <Section title="3. How we use it">
          <ul className="mt-2 list-disc pl-5 space-y-1.5">
            <li>To authenticate you and operate your account.</li>
            <li>
              To send your prompt to a third-party AI model and stream the generated
              strategy back to you.
            </li>
            <li>
              To calibrate future estimates against your historical over/under-spend
              pattern (you can disable this in Settings).
            </li>
            <li>
              To debug errors, prevent abuse, and improve the quality of the Service.
            </li>
          </ul>
        </Section>

        <Section title="4. AI providers">
          <p>
            Strategies are generated using third-party AI models (e.g. via the Lovable AI
            Gateway). When you generate a strategy, your prompt and any calibration
            signals are sent to the model provider for processing. Providers may retain
            request data for abuse monitoring per their own policies. We do not authorize
            providers to use your prompts for training.
          </p>
        </Section>

        <Section title="5. Data storage & security">
          <p>
            Your account data, profiles, strategies, and step progress are stored in our
            managed backend (Lovable Cloud). Access is protected by row-level security so
            each user can only read and write their own records. Connections use TLS in
            transit. No system is perfectly secure — please use a strong, unique password.
          </p>
        </Section>

        <Section title="6. Cookies & local storage">
          <p>
            We use essential cookies and browser localStorage to keep you signed in,
            remember your theme, and store opt-in preferences such as the calibration
            toggle and any API key you provide. We do not use third-party advertising
            cookies.
          </p>
        </Section>

        <Section title="7. Sharing">
          <p>We do not sell your personal data. We share data only:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>With AI providers strictly to fulfill your strategy generation request.</li>
            <li>
              With our infrastructure providers (hosting, database, authentication) under
              contractual confidentiality.
            </li>
            <li>When required by law, valid legal process, or to protect our rights.</li>
          </ul>
        </Section>

        <Section title="8. Your rights">
          <p>You can:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Access and update your profile from the Settings page.</li>
            <li>
              Delete every saved strategy and step record from Settings → Danger zone.
            </li>
            <li>
              Request full account deletion (including the underlying auth record) by
              contacting support.
            </li>
            <li>Opt out of historical calibration at any time in Settings.</li>
          </ul>
          <p className="mt-2">
            Depending on where you live (EEA, UK, California, etc.), you may have
            additional rights such as portability or to lodge a complaint with a
            supervisory authority.
          </p>
        </Section>

        <Section title="9. Data retention">
          <p>
            We retain your data while your account is active. When you delete strategy
            data from Settings, it is removed promptly. Backups may persist for a short
            period before being overwritten.
          </p>
        </Section>

        <Section title="10. Children">
          <p>
            TokenSavvy is not intended for children under 13. We do not knowingly collect
            data from children. If you believe a child has created an account, contact us
            so we can remove it.
          </p>
        </Section>

        <Section title="11. International transfers">
          <p>
            Our infrastructure and AI providers may process data in countries outside your
            own. By using the Service you consent to such transfers, subject to applicable
            safeguards.
          </p>
        </Section>

        <Section title="12. Changes">
          <p>
            We may update this policy as the Service evolves. Material changes will be
            announced via the Service or email. The "Last updated" date above always
            reflects the current version.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Questions about your privacy? Reach out via the support contact listed on our{" "}
            <Link to="/" className="text-primary hover:underline">
              homepage
            </Link>
            .
          </p>
        </Section>
      </div>

      <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
        See also our{" "}
        <Link to="/terms" className="text-primary hover:underline">
          Terms of Service
        </Link>
        .
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium text-foreground mb-2">{title}</h2>
      {children}
    </section>
  );
}
