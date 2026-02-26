import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="container mx-auto px-6 py-6">
        <nav className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            👑 TipstersKing
          </Link>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-8">Terms of Service</h1>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-6 text-gray-300">
          <p className="text-sm text-gray-400">Last updated: February 2026</p>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using TipstersKing ("Service"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Description of Service</h2>
            <p>
              TipstersKing provides sports betting tips, analysis, and community features. Our Service includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access to betting tips and predictions</li>
              <li>Community channels on Telegram and Discord</li>
              <li>Statistics and performance tracking</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Disclaimer</h2>
            <p>
              <strong className="text-white">Important:</strong> Sports betting involves financial risk. 
              TipstersKing provides tips for entertainment and informational purposes only. We do not guarantee 
              any profits or outcomes. Past performance does not guarantee future results.
            </p>
            <p>
              You are solely responsible for your betting decisions. Only bet what you can afford to lose. 
              If you have a gambling problem, please seek help at <a href="https://www.begambleaware.org" className="text-purple-400 hover:underline">BeGambleAware.org</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Subscription and Payments</h2>
            <p>
              Premium subscriptions are billed monthly or annually through Stripe. You may cancel your 
              subscription at any time. Refunds are handled on a case-by-case basis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Share your subscription access with others</li>
              <li>Redistribute our tips or content without permission</li>
              <li>Harass other community members</li>
              <li>Use the Service for any illegal purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your access to the Service at our discretion, 
              without notice, for conduct that we believe violates these Terms or is harmful to other users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Contact</h2>
            <p>
              For questions about these Terms, contact us at: support@tipstersking.com
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link href="/" className="text-purple-400 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
