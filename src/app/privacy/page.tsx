import Link from "next/link";

export default function PrivacyPage() {
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
        <h1 className="text-4xl font-bold text-white mb-8">Privacy Policy</h1>
        
        <div className="prose prose-invert prose-purple max-w-none space-y-6 text-gray-300">
          <p className="text-sm text-gray-400">Last updated: February 2026</p>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Information We Collect</h2>
            <p>We collect information you provide directly to us:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Account Information:</strong> Email address, Telegram username</li>
              <li><strong className="text-white">Payment Information:</strong> Processed securely by Stripe (we don't store card details)</li>
              <li><strong className="text-white">Usage Data:</strong> How you interact with our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain our Service</li>
              <li>Process your subscription payments</li>
              <li>Send you tips and updates</li>
              <li>Grant access to premium channels</li>
              <li>Respond to your questions and requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Information Sharing</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Stripe:</strong> For payment processing</li>
              <li><strong className="text-white">Telegram/Discord:</strong> For community access</li>
              <li><strong className="text-white">Legal Requirements:</strong> If required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your personal information. 
              However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Cancel your subscription at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and preferences. 
              We do not use tracking cookies for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Third-Party Services</h2>
            <p>
              Our Service integrates with third-party platforms (Telegram, Discord, Stripe). 
              Please review their privacy policies for information on how they handle your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any 
              changes by posting the new policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at: support@tipstersking.com
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
