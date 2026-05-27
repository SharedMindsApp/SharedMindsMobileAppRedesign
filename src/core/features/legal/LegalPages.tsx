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

/** Version string of the Privacy Policy + Terms of Service.
 *  Bump this whenever you materially change either document. Stored
 *  alongside accepted_privacy_at on profiles so we can detect when
 *  re-consent is needed after an update. */
export const LEGAL_DOCUMENT_VERSION = '2026-05-28b';

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
                Last updated 28 May 2026 · Version {LEGAL_DOCUMENT_VERSION}
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
        SharedMinds is a virtual coworking and accountability platform. These
        Terms form a binding contract between you and SharedMinds.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Plain English summary</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You must be 16+ to use SharedMinds.</li>
        <li>Be respectful. Don't harass, threaten, or expose other members.</li>
        <li>Don't record other people's sessions without their consent.</li>
        <li>You own what you create. We just need a licence to display it inside SharedMinds.</li>
        <li>We can suspend accounts that break these Terms.</li>
        <li>UK law governs these Terms.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">1. Agreement</h2>
      <p>
        By creating an account, ticking the consent checkbox, or otherwise
        using the Service, you agree to these Terms and to our{' '}
        <Link to="/privacy" className="text-primary font-bold">Privacy Policy</Link>.
        If you don't agree, don't use the Service.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">2. Eligibility</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You must be at least 16 years old.</li>
        <li>You must be legally able to enter a binding contract in your jurisdiction.</li>
        <li>You must not be barred from using the Service under applicable law.</li>
        <li>You must not have previously had a SharedMinds account terminated for a serious breach.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">3. Your account</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Provide accurate sign-up information and a real-person profile photo if uploaded.</li>
        <li>One person, one account. No bots or automated accounts without written consent.</li>
        <li>You're responsible for keeping your password secure and for all activity under your account.</li>
        <li>Tell us at <a href="mailto:hello@sharedminds.app" className="text-primary font-bold">hello@sharedminds.app</a> if you suspect unauthorised access.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">4. Community standards</h2>
      <p>You agree <strong>not</strong> to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Harass, bully, intimidate, dox, or threaten any other member</li>
        <li>Post hateful, sexually explicit, violent, or graphic content</li>
        <li>Impersonate another person or misrepresent your affiliation</li>
        <li>Promote self-harm, eating disorders, or suicide</li>
        <li>Advertise, solicit, or spam members for unrelated commercial purposes</li>
        <li>Record, screenshot, or screen-share any other member's video, audio, or chat without their explicit consent</li>
        <li>Scrape or extract data from SharedMinds via automated means</li>
        <li>Reverse-engineer, decompile, or extract the source code of the Service</li>
        <li>Bypass security, rate-limiting, or moderation features</li>
        <li>Upload viruses, malware, or disruptive code</li>
        <li>Use the Service to break any law</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">5. Reporting and enforcement</h2>
      <p>
        Report violations to <a href="mailto:safety@sharedminds.app" className="text-primary font-bold">safety@sharedminds.app</a> or via the in-app
        report buttons. Depending on severity we may warn, remove content,
        restrict features, suspend, or permanently terminate accounts. We
        will normally give notice and a chance to respond unless that would
        risk further harm.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">6. Sessions and video</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Video sessions use Daily.co. By joining a session you accept their terms.</li>
        <li>We do not record session contents — only metadata (start time, duration, who joined, your goal, the outcome you log).</li>
        <li>Don't record or capture other participants without their explicit, informed consent.</li>
        <li>Public sessions are visible to other signed-in members — your name, avatar, and goal are seen by others while the session is live or scheduled.</li>
        <li>Solo sessions are private and never appear in shared lists.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">7. Content you post</h2>
      <p>
        You retain ownership of your Content. You grant SharedMinds a
        worldwide, non-exclusive, royalty-free licence to host, store,
        display, distribute, and modify your Content <strong>solely to
        operate, secure, and improve the Service</strong>. This licence
        ends when you delete the Content or your account, except for
        content already shared with others, anonymised aggregated data,
        reasonable backups, and content we are legally required to keep.
      </p>
      <p>
        You confirm you own or have the rights to post your Content. We may
        remove Content that breaches these Terms or applicable law.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">8. Safety evidence</h2>
      <p>
        When you submit a report against another member <strong>from inside
        an active video session</strong>, we capture a single frame of that
        person's video tile and a snapshot of the session's chat from the
        previous 5 minutes. This evidence is stored privately, viewable
        only by SharedMinds moderation staff, and auto-deletes after 90
        days unless tied to an unresolved safety case.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">9. Intellectual property of SharedMinds</h2>
      <p>
        The Service — including branding, design, code, copy, and curated
        content — is owned by SharedMinds. You receive a personal, limited,
        non-exclusive, non-transferable, revocable licence to use the
        Service in accordance with these Terms. Nothing transfers IP rights
        to you. Don't copy, modify, distribute, sell, or create derivative
        works of the Service except as expressly permitted.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">10. Fees</h2>
      <p>
        SharedMinds is currently free to use. If we introduce paid plans
        we'll give advance notice and won't charge without your explicit
        consent. Existing free-tier accounts keep access to at least a
        baseline version of the Service.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">11. Termination</h2>
      <p>
        You can delete your account from Settings at any time. We may
        suspend or terminate accounts that breach these Terms, where
        legally required, or after extended inactivity (with email notice
        first). Serious breaches involving safety, fraud, or illegal
        activity may result in immediate termination without notice.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">12. Disclaimers</h2>
      <p>
        The Service is provided <strong>"as is" and "as available"</strong>.
        To the maximum extent permitted by law we disclaim all warranties,
        express or implied, including merchantability, fitness for purpose,
        and non-infringement. We don't warrant the Service will be
        uninterrupted, error-free, or that it will improve your productivity.
      </p>
      <p>
        SharedMinds is not a medical, mental-health, or professional
        advisory service. If you are in crisis, please contact local
        emergency services or an appropriate helpline.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">13. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law SharedMinds is not liable
        for any indirect, incidental, special, consequential, or punitive
        damages, or for loss of profits, data, or goodwill. Where we are
        held liable for direct damages, our total aggregate liability in
        any 12-month period will not exceed the greater of (a) the fees
        you paid us in that period or (b) GBP 100.
      </p>
      <p>
        Nothing in these Terms excludes liability that cannot be excluded
        by law, including liability for death or personal injury caused by
        negligence, or for fraud or fraudulent misrepresentation.
      </p>
      <p>
        <strong>If you are a consumer</strong> resident in the UK or EU,
        you have statutory rights that cannot be excluded by these Terms
        — including, in the UK, rights under the Consumer Rights Act
        2015. Nothing in these Terms affects those rights.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">14. Indemnification</h2>
      <p>
        You agree to indemnify SharedMinds from any claims, damages, and
        reasonable legal fees arising out of your breach of these Terms,
        your misuse of the Service, your Content (where it infringes a
        third party's rights), or your breach of applicable law. This
        clause does not require you to indemnify us for our own fault,
        negligence, or wilful misconduct.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">15. Changes to these Terms</h2>
      <p>
        We may update these Terms. The version number changes whenever the
        document is updated. For material changes we'll give in-app or
        email notice at least 14 days before they take effect. Continued
        use after a change means you accept the updated Terms; if you
        don't, stop using the Service and delete your account.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">16. Governing law</h2>
      <p>
        These Terms are governed by the laws of <strong>England and Wales</strong>.
        Disputes are subject to the exclusive jurisdiction of the courts of
        England and Wales, except that consumers resident elsewhere in the
        UK or EU retain the right to bring proceedings in their own
        country to the extent required by mandatory local law.
      </p>
      <p>
        Before starting formal proceedings, email us at <a href="mailto:hello@sharedminds.app" className="text-primary font-bold">hello@sharedminds.app</a> so
        we can try to resolve the issue informally.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">17. General</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Entire agreement</strong> — these Terms + Privacy Policy supersede any prior agreement.</li>
        <li><strong>Severability</strong> — if any part is unenforceable, the rest remains in force.</li>
        <li><strong>No waiver</strong> — failure to enforce a right is not a waiver of it.</li>
        <li><strong>Assignment</strong> — you may not assign your account; we may assign to a successor entity.</li>
        <li><strong>Force majeure</strong> — neither party is liable for failures caused by events outside reasonable control.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">18. Contact</h2>
      <p>
        General: <a href="mailto:hello@sharedminds.app" className="text-primary font-bold">hello@sharedminds.app</a><br />
        Safety: <a href="mailto:safety@sharedminds.app" className="text-primary font-bold">safety@sharedminds.app</a><br />
        Privacy: <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>
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

      <h2 className="text-lg font-bold mt-6 mb-2">Plain English summary</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You own your data — export or delete it any time.</li>
        <li>We don't sell your data and we don't run ad-tracking.</li>
        <li>Video sessions are peer-to-peer via Daily.co — we don't record them.</li>
        <li>Your projects and tasks are private by default.</li>
        <li>You control who can DM you and who sees your online status.</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Who we are</h2>
      <p>
        SharedMinds is the data controller for purposes of UK GDPR and EU
        GDPR, established in the United Kingdom. Contact us at <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>.
      </p>
      <p>
        <strong>DPO:</strong> not required — our core activities don't involve
        large-scale special-category processing or systematic monitoring.
      </p>
      <p>
        <strong>EU representative (Art. 27 EU GDPR):</strong> if you are an EU
        resident, contact us at the address above. We will appoint an
        EU-based representative before formally targeting the EU market.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">What we collect</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account data:</strong> email, display name, password hash, browser timezone</li>
        <li><strong>Profile data (optional):</strong> avatar, bio, work types, skills, location</li>
        <li><strong>Usage data:</strong> sessions you've started, your goals and outcomes, tasks, projects, intentions, reflections, DMs, community posts, connection requests, notification preferences, last-seen heartbeat</li>
        <li><strong>Technical data:</strong> browser/device type, approximate region from IP, error logs (no message contents)</li>
      </ul>
      <p>
        All data is collected <strong>directly from you</strong>. We do not buy
        data or receive it from third parties. The minimum data needed to
        provide the Service is your email, password, and display name —
        these are required by the contract.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Safety evidence</h2>
      <p>
        When you report another member <strong>from inside an active video
        session</strong>, we capture a single frame of that person's video
        tile and a snapshot of session chat from the previous 5 minutes.
        Stored privately, viewable only by moderation staff, auto-deletes
        after 90 days unless tied to an unresolved case. You can request
        deletion of any evidence concerning you by emailing <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Legal basis</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Contract</strong> — running the Service you signed up for</li>
        <li><strong>Legitimate interest</strong> — security, abuse prevention, bug diagnosis</li>
        <li><strong>Consent</strong> — non-essential notifications, opt-in features (withdrawable any time)</li>
        <li><strong>Legal obligation</strong> — responding to lawful requests</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">Sub-processors</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Supabase</strong> — database + auth, hosted in EU by default</li>
        <li><strong>Daily.co</strong> — peer-to-peer video for sessions (no recording)</li>
        <li><strong>Resend</strong> — transactional email delivery</li>
        <li><strong>Vercel</strong> — web hosting</li>
        <li><strong>OpenAI</strong> — avatar moderation (image sent for a safety + face check; not used for training)</li>
      </ul>

      <h2 className="text-lg font-bold mt-6 mb-2">International transfers</h2>
      <p>
        Some sub-processors are based in or operate infrastructure in the
        United States. We rely on appropriate Article 46 safeguards:
        <strong> Standard Contractual Clauses</strong> with the UK Addendum,
        and the <strong>EU–US Data Privacy Framework</strong> where the
        sub-processor is DPF-certified. Request the safeguards for a
        specific transfer at <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Automated decision-making</h2>
      <p>
        <strong>Avatar moderation</strong> is the only fully-automated decision
        we make. When you upload a profile photo, OpenAI's moderation
        service checks for a real human face and unsafe content. A
        rejection means the photo isn't stored and you're asked to upload
        a different one — nothing else about your account is affected.
      </p>
      <p>
        Under Article 22 you have the right to request human review,
        express your view, and contest the decision. Email <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a> within
        30 days of a rejection and a team member will manually review.
      </p>
      <p>
        Suggested connections, open-to-match pairing, and notification
        timing all use simple deterministic logic, not profiling, and you
        can override them.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Your rights (UK & EU GDPR)</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Access (Art. 15)</strong> — request a copy of your data</li>
        <li><strong>Rectification (Art. 16)</strong> — correct inaccurate data; most fields are editable on the Profile page</li>
        <li><strong>Erasure (Art. 17)</strong> — request account deletion; we complete within 30 days</li>
        <li><strong>Restriction (Art. 18)</strong> — pause processing while a complaint is resolved</li>
        <li><strong>Portability (Art. 20)</strong> — receive your data in JSON / CSV format</li>
        <li><strong>Object (Art. 21)</strong> — object to legitimate-interest processing</li>
        <li><strong>Withdraw consent (Art. 7(3))</strong> — for any consent-based processing</li>
        <li><strong>Automated decision-making (Art. 22)</strong> — request human review (see above)</li>
      </ul>
      <p>
        Exercise any right by emailing <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>. We respond within 30 days
        (extendable by two months for complex requests, with notice). We
        may verify your identity before fulfilling certain requests. No
        fee unless a request is manifestly unfounded or excessive.
      </p>
      <p>
        <strong>Right to complain.</strong> UK residents may complain to the <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary font-bold">ICO</a>; EU residents may complain to their national data protection
        authority. We'd always prefer the chance to put things right first.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Retention</h2>
      <p>
        Active account data is kept while your account is open. After
        deletion: profile + content removed within 30 days; chat messages
        are anonymised; safety/moderation records may be kept for up to 2
        years for legal and abuse-prevention purposes.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Security & breach notification</h2>
      <p>
        TLS in transit, encryption at rest, row-level security on the
        database, bcrypt-hashed passwords, least-privilege staff access.
        In the unlikely event of a breach likely to risk your rights, we
        will notify the ICO within 72 hours and affected users without
        undue delay where the risk is high.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Children</h2>
      <p>
        SharedMinds is not directed at children under 16. If you believe a
        child has created an account, tell us and we'll remove it.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Cookies</h2>
      <p>
        We use a small number of strictly necessary cookies and browser
        localStorage entries to keep you signed in, remember preferences,
        and detect your timezone on signup. No third-party advertising or
        analytics cookies. No cookie banner needed for strictly necessary
        storage under PECR.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Changes to this policy</h2>
      <p>
        We may update this Privacy Policy. The version number at the top
        of this page changes when we update it. For material changes
        we'll notify you in-app or by email at least 14 days before they
        take effect.
      </p>

      <h2 className="text-lg font-bold mt-6 mb-2">Contact</h2>
      <p>
        Data Protection: <a href="mailto:privacy@sharedminds.app" className="text-primary font-bold">privacy@sharedminds.app</a>
      </p>
    </LegalShell>
  );
}
