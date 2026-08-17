import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — TokenSavr" },
      {
        name: "description",
        content:
          "TokenSavr's Privacy Policy explains what data we collect, how we handle your inputs, and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — TokenSavr" },
      {
        property: "og:description",
        content:
          "Learn what data TokenSavr collects and how we protect your project ideas and account information.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const updated = "August 2026";

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
        <Section title="1. Overview">
          <p>
            TokenSavr (“we”, “us”, “the Service") helps you plan software builds across
            AI coding platforms. This Privacy Policy explains what information we collect,
            how we use it, who we share it with, and the choices you have. If you have
            questions, contact us through the support channel on our{" "}
            <Link to="/" className="text-primary hover:underline">
              homepage
            </Link>
            .
          </p>
        </Section>

        <Section title="2. Information we collect">
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>
              <strong>Account information.</strong> When you sign up, we collect your
              email address and, if you choose to provide it, a display name. We use this
              to identify you, secure your account, and send service-related messages.
            </li>
            <li>
              <strong>Project inputs.</strong> When you enter an idea, budget, preferred
              platforms, or other build details, we process those inputs to generate your
              strategy.
            </li>
            <li>
              <strong>Generated strategies.</strong> We store the step-by-step plans,
              cost estimates, and platform recommendations produced for you so you can
              view, copy, or share them.
            </li>
            <li>
              <strong>Usage data.</strong> We collect basic analytics about how you
              interact with the Service, such as page views, feature usage, and errors.
              This helps us improve performance and user experience.
            </li>
            <li>
              <strong>Technical data.</strong> We may collect your IP address, browser
              type, device information, and cookies or similar identifiers needed to
              keep you signed in and protect the Service.
            </li>
          </ul>
        </Section>

        <Section title="3. Anonymous use">
          <p>
            You can generate a strategy without creating an account. When you do, your
            inputs are processed in real time to produce a result. We do not permanently
            store anonymous inputs or generated strategies unless you choose to sign in
            and save them. If you close the page before saving, the strategy is not
            recoverable.
          </p>
        </Section>

        <Section title="4. How we use your information">
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Generate, display, and save your strategies.</li>
            <li>Provide cost estimates and platform recommendations.</li>
            <li>Keep your account secure and authenticate you.</li>
            <li>Communicate important service updates or respond to support requests.</li>
            <li>Monitor usage, fix bugs, and improve the Service.</li>
            <li>Prevent abuse, fraud, and unauthorized access.</li>
          </ul>
        </Section>

        <Section title="5. AI providers and third-party services">
          <p>
            To generate strategies, your project idea and selected parameters are sent
            to third-party AI providers. We do not send unrelated personal information.
            These providers process data under their own terms and privacy policies. We
            also use backend hosting, authentication, and analytics services that may
            process technical data on our behalf under strict confidentiality and
            security obligations.
          </p>
        </Section>

        <Section title="6. Cookies and tracking">
          <p>
            We use cookies and similar technologies to keep you signed in, remember your
            theme preference, and understand how the Service is used. You can disable
            non-essential cookies through your browser settings, but some features may not
            work correctly.
          </p>
        </Section>

        <Section title="7. Data retention">
          <p>
            We keep your account information and saved strategies for as long as your
            account is active. Anonymous strategy sessions are not retained after the
            session ends. If you delete your account, your saved strategies and profile
            data are removed within a reasonable period, except where we are required to
            keep minimal records for legal or security purposes.
          </p>
        </Section>

        <Section title="8. Data security">
          <p>
            We protect data in transit using encryption and apply access controls,
            including row-level security in our database. No system is completely secure,
            and we cannot guarantee absolute protection. You are responsible for keeping
            your account credentials safe.
          </p>
        </Section>

        <Section title="9. Your rights and choices">
          <p>
            Depending on your location, you may have the right to access, correct, or
            delete your personal information, or to object to or restrict certain uses.
            You can update your display name or delete your account from Settings. To
            exercise other rights, contact us through the support channel on our{" "}
            <Link to="/" className="text-primary hover:underline">
              homepage
            </Link>
            .
          </p>
        </Section>

        <Section title="10. Children's privacy">
          <p>
            TokenSavr is not intended for children under 13. We do not knowingly collect
            personal information from children under 13. If you believe we have collected
            such information, contact us so we can delete it.
          </p>
        </Section>

        <Section title="11. Changes to this policy">
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated through the Service or by email. Continued use of TokenSavr after
            changes means you accept the updated policy.
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
