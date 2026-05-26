/**
 * Static legal pages — Terms of Service and Privacy Policy.
 *
 * Intentionally MVP-grade. The copy here is a placeholder anchored on
 * SharedMinds' actual data practices (Supabase, Daily.co, OpenAI for
 * moderation). Before public launch this MUST be reviewed by a lawyer
 * in the appropriate jurisdiction — search for "TODO LAWYER" below for
 * the sections most likely to need real legal language.
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Scale, Mail } from 'lucide-react';

function LegalShell({
  title, icon, children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-surface-container-low/30 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-xs font-bold stitch-text-secondary hover:stitch-text-primary mb-4 transition-colors"
        >
          <ArrowLeft size={11} /> Back
        </Link>
        <div className="rounded-2xl bg-white ring-1 ring-surface-container p-6 sm:p-10">
          <header className="flex items-center gap-3 mb-6 pb-6 border-b border-surface-container">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              {icon}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold stitch-text-primary">{title}</h1>
              <p className="text-xs stitch-text-secondary mt-1">
                Effective {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </header>
          <article className="prose prose-sm max-w-none stitch-text-primary leading-relaxed">
            {children}
          </article>
          <footer className="mt-10 pt-6 border-t border-surface-container text-xs stitch-text-secondary flex items-center gap-2">
            <Mail size={11} />
            Questions? <a href="mailto:legal@sharedminds.app" className="text-primary font-bold">legal@sharedminds.app</a>
          </footer>
        </div>
      </div>
    </div>
  );
}

// ── ToS ──────────────────────────────────────────────────────────────────

export function TermsOfServicePage() {
  return (
    <LegalShell title="Terms of Service" icon={<Scale size={22} />}>
      <p className="text-base">
        SharedMinds is a virtual coworking accountability platform. By creating
        an account, you agree to these terms.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">1. Eligibility</h2>
      <p>You must be 18 years or older to use SharedMinds.</p>

      <h2 className="text-lg font-bold mt-6 mb-2">2. Your account</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You're responsible for activity under your account, including content you post and sessions you join.</li>
        <li>You must provide accurate information and a real-person profile photo (we verify this).</li>
        <li>One person, one account. No bots or automated accounts without our written permission.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">3. Acceptable use</h2>
      <p>You will not:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Harass, threaten, or impersonate anyone</li>
        <li>Post hateful, sexually explicit, or violent content</li>
        <li>Use sessions to record or stream other members without consent</li>
        <li>Spam, scrape, or attempt to extract data from other users</li>
        <li>Use the platform for illegal activity</li>
      </ul>
      <p>
        Violations may result in warnings, suspension, or permanent ban.
        Severe violations may be reported to authorities.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">4. Sessions and video</h2>
      <p>
        Live video sessions are facilitated by a third-party provider
        (Daily.co). We don't record sessions by default. If you choose to
        record locally, you're responsible for obtaining consent from other
        participants and complying with applicable laws.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">5. Content you post</h2>
      <p>
        You retain ownership of content you post (chat messages, posts,
        bios). You grant SharedMinds a non-exclusive license to display
        that content within the platform.
      </p>
      <p>
        We may remove content that violates these terms. Reported content
        may be retained for safety and legal purposes even after deletion.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">6. Termination</h2>
      <p>
        You can delete your account at any time from Settings. We may
        suspend or terminate your account for terms violations. Some data
        (e.g. content you posted in shared spaces, moderation records) may
        be retained after termination.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">7. Disclaimer</h2>
      <p>
        {/* TODO LAWYER: jurisdiction-appropriate disclaimer + limitation of liability */}
        SharedMinds is provided "as is" without warranties of any kind.
        We're not liable for indirect, incidental, or consequential damages
        arising from your use of the platform, to the extent permitted by law.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">8. Changes</h2>
      <p>
        We may update these terms. We'll notify you of material changes by
        email or in-app notice at least 14 days before they take effect.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">9. Governing law</h2>
      <p>
        {/* TODO LAWYER: choose jurisdiction */}
        These terms are governed by the laws of the United Kingdom.
      </p>
    </LegalShell>
  );
}

// ── Privacy ──────────────────────────────────────────────────────────────

export function PrivacyPolicyPage() {
  return (
    <LegalShell title="Privacy Policy" icon={<ShieldCheck size={22} />}>
      <p className="text-base">
        We collect the minimum data needed to make SharedMinds work, and
        we don't sell your data to anyone. Ever.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">What we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account data:</strong> email, display name, profile photo, bio, location (optional), skills, work types</li>
        <li><strong>Session data:</strong> sessions you've joined, your goal and debrief outcomes, who you sat with</li>
        <li><strong>Connections:</strong> who you've connected with, sent requests to, blocked, or reported</li>
        <li><strong>Messages:</strong> DMs and community chat (retained for safety per our terms)</li>
        <li><strong>Device/usage:</strong> standard logs (IP, browser, page views) for diagnostics and abuse prevention</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Safety evidence</h2>
      <p>
        When you submit a report against another member <strong>from inside an
        active video session</strong>, we capture a single frame of that
        person's video tile and a snapshot of the session's chat from the
        previous 5 minutes. This evidence is stored privately and is only
        viewable by SharedMinds moderation staff.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Capture only happens at the moment of report — never preemptively or continuously.</li>
        <li>We never record sessions in full.</li>
        <li>Evidence auto-deletes after 90 days unless it's tied to an unresolved safety case.</li>
        <li>You can request deletion of any evidence concerning you by emailing privacy@sharedminds.app.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">What we don't collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>We don't track you across other websites</li>
        <li>We don't record video sessions by default</li>
        <li>We don't sell or share your data with advertisers</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Sub-processors</h2>
      <p>We use these third parties to run the service:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Supabase</strong> — database + auth (data hosted in the EU)</li>
        <li><strong>Daily.co</strong> — live video for sessions</li>
        <li><strong>OpenAI</strong> — automated content moderation (text + avatar verification)</li>
        <li><strong>Vercel</strong> — frontend hosting</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Your rights (GDPR / CCPA)</h2>
      <p>You have the right to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Access</strong> a copy of your data — request via Settings</li>
        <li><strong>Correct</strong> inaccurate data — edit on your Profile</li>
        <li><strong>Delete</strong> your account — Settings → Delete account</li>
        <li><strong>Object</strong> to processing — email us</li>
        <li><strong>Withdraw consent</strong> — unsubscribe links on every email</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Retention</h2>
      <p>
        Active account data is kept while your account is open. After
        deletion: profile data is removed within 30 days; chat messages
        are anonymised; safety/moderation records are kept for 2 years
        for legal and abuse-prevention purposes.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Cookies</h2>
      <p>
        We use a single cookie for session authentication. No advertising
        or analytics cookies. No cookie banner needed.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Contact</h2>
      <p>
        Data Protection: <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>
      </p>
      <p>
        {/* TODO LAWYER: appoint DPO + EU representative if required */}
      </p>
    </LegalShell>
  );
}
