import SharedMindsLogo from './assets/shared_minds_logo_2.svg';

export default function PrivacyPolicy() {
  return (
    <article className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-white">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 text-xl font-semibold text-blue-600">
              <img src={SharedMindsLogo} alt="SharedMinds Logo" className="w-10 h-10" />
              SharedMinds
            </a>
            <a href="/" className="text-slate-600 hover:text-blue-600 transition-colors font-medium">
              Back to home
            </a>
          </div>
        </nav>
      </header>

      <div className="max-w-4xl mx-auto py-20 px-6">
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-lg text-slate-600">
            Last updated: December 19, 2025
          </p>
        </header>

        <section className="prose prose-lg max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
            <p>
              SharedMinds is committed to protecting your privacy and handling your data with transparency and care. This Privacy Policy explains how we collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>
            <h3 className="text-xl font-semibold text-slate-800 mb-3">Waitlist Information</h3>
            <p className="mb-4">
              When you join our waitlist, we collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 mb-4">
              <li>Your email address</li>
              <li>Your interest in beta access</li>
              <li>Your interest in collaboration opportunities</li>
            </ul>

            <h3 className="text-xl font-semibold text-slate-800 mb-3">Usage Information</h3>
            <p>
              We may collect anonymous usage data to improve our website, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pages visited</li>
              <li>Time spent on pages</li>
              <li>Device and browser information</li>
              <li>General location (country/region)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
            <p className="mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Send you updates about SharedMinds</li>
              <li>Notify you when the platform launches</li>
              <li>Contact you about beta testing opportunities if you expressed interest</li>
              <li>Reach out regarding collaboration if you expressed interest</li>
              <li>Improve our website and user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption. We use Supabase for data storage, which provides enterprise-grade security and compliance. We will never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights</h2>
            <p className="mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request correction of your data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of communications at any time</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Cookies</h2>
            <p>
              We use minimal cookies necessary for website functionality. We do not use tracking cookies or third-party advertising cookies. Essential cookies help us remember your preferences and improve your experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Third-Party Services</h2>
            <p>
              We use the following third-party services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Supabase:</strong> Database and authentication services</li>
              <li>These services have their own privacy policies and security measures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify waitlist members of any significant changes via email. Continued use of our website after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or want to exercise your rights, please contact us at:
            </p>
            <p className="mt-4">
              <strong>Email:</strong>{' '}
              <a href="mailto:support@sharedminds.app" className="text-blue-600 hover:text-blue-700 underline">
                support@sharedminds.app
              </a>
            </p>
          </section>
        </section>

        <footer className="mt-16 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            This privacy policy is effective as of December 19, 2025 and applies to all information collected through the SharedMinds website.
          </p>
        </footer>
      </div>
    </article>
  );
}
