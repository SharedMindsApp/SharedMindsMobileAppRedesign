import SharedMindsLogo from './assets/shared_minds_logo_2.svg';

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="text-lg text-slate-600">
            Last updated: December 19, 2025
          </p>
        </header>

        <section className="prose prose-lg max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Agreement to Terms</h2>
            <p>
              By accessing our website and joining our waitlist, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please do not use our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Pre-Launch Status</h2>
            <p>
              SharedMinds is currently in pre-launch status. This website serves as an information and waitlist platform. The product described is under development and features may change before launch.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Waitlist Terms</h2>
            <p className="mb-4">
              By joining our waitlist:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You consent to receive email updates about SharedMinds</li>
              <li>You understand that waitlist placement does not guarantee access</li>
              <li>You can unsubscribe from communications at any time</li>
              <li>Your information will be handled according to our Privacy Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Intellectual Property</h2>
            <p>
              All content on this website, including text, graphics, logos, and software, is the property of SharedMinds and is protected by copyright and intellectual property laws. You may not reproduce, distribute, or create derivative works without express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">User Conduct</h2>
            <p className="mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the website for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the website or servers</li>
              <li>Submit false or misleading information</li>
              <li>Use automated systems to access the website without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">No Medical or Professional Advice</h2>
            <p>
              SharedMinds is a productivity and executive function support tool, not a medical device or substitute for professional mental health care. Information provided on this website is for general informational purposes only and should not be considered medical, therapeutic, or professional advice.
            </p>
            <p className="mt-4">
              If you are experiencing mental health difficulties, please consult with a qualified healthcare professional.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Disclaimers and Limitations of Liability</h2>
            <p className="mb-4">
              The website and all information provided are offered "as is" without warranties of any kind. SharedMinds disclaims all warranties, express or implied, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Accuracy or completeness of information</li>
            </ul>
            <p className="mt-4">
              SharedMinds shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Beta Testing</h2>
            <p>
              If you are selected for beta testing, you may be subject to additional terms and conditions. Beta features are provided for testing purposes and may contain bugs or errors. You agree to provide feedback and understand that beta access may be terminated at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to Terms</h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Changes will be posted on this page with an updated "Last updated" date. Your continued use of the website after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Termination</h2>
            <p>
              We reserve the right to terminate or suspend access to our website immediately, without prior notice, for any reason, including breach of these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Information</h2>
            <p>
              If you have questions about these Terms of Service, please contact us at:
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
            These terms of service are effective as of December 19, 2025 and apply to all users of the SharedMinds website.
          </p>
        </footer>
      </div>
    </article>
  );
}
