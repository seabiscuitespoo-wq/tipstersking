import Link from "next/link";

export default function TipstersPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            👑 TipstersKing
          </Link>
          <div className="space-x-4">
            <Link href="/pricing" className="text-gray-300 hover:text-white transition">
              Pricing
            </Link>
            <Link href="/login" className="text-gray-300 hover:text-white transition">
              Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Become a Tipster 🎯
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Monetize your betting tips. We handle everything — you just tip.
          </p>
        </div>

        {/* Value Props */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-xl font-semibold text-white mb-2">Keep 70%</h3>
            <p className="text-gray-400">
              You keep 70% of all subscriber revenue. We handle payments, support, and tech.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">Zero Setup</h3>
            <p className="text-gray-400">
              No website needed. No payment integration. No Telegram bot setup. We do it all.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 text-center">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold text-white mb-2">Just Tip</h3>
            <p className="text-gray-400">
              Post your tips to Telegram. That's it. We handle subscribers and payments.
            </p>
          </div>
        </div>

        {/* Commission Structure */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            How It Works
          </h2>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            {/* Trial */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  TRIAL
                </span>
                <span className="text-white font-semibold">First 3 Months</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/20 rounded-xl p-4 text-center">
                  <div className="text-4xl font-bold text-green-400">100%</div>
                  <div className="text-gray-400">You keep</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-4xl font-bold text-gray-500">0%</div>
                  <div className="text-gray-400">Our fee</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-4">
                Test the platform risk-free. Keep everything you earn for 3 months.
              </p>
            </div>

            {/* After Trial */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-purple-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  STANDARD
                </span>
                <span className="text-white font-semibold">After 3 Months</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-500/20 rounded-xl p-4 text-center">
                  <div className="text-4xl font-bold text-purple-400">70%</div>
                  <div className="text-gray-400">You keep</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-4xl font-bold text-gray-400">30%</div>
                  <div className="text-gray-400">Platform fee</div>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-4">
                Still one of the best splits in the industry. Paid monthly to your bank.
              </p>
            </div>
          </div>
        </div>

        {/* Example Earnings */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Example Earnings 💰
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 py-3 px-4">Subscribers</th>
                  <th className="text-right text-gray-400 py-3 px-4">Revenue</th>
                  <th className="text-right text-gray-400 py-3 px-4">Your Share (70%)</th>
                </tr>
              </thead>
              <tbody className="text-white">
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4">50</td>
                  <td className="text-right py-3 px-4">€495/mo</td>
                  <td className="text-right py-3 px-4 text-green-400 font-semibold">€346/mo</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4">100</td>
                  <td className="text-right py-3 px-4">€990/mo</td>
                  <td className="text-right py-3 px-4 text-green-400 font-semibold">€693/mo</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-3 px-4">250</td>
                  <td className="text-right py-3 px-4">€2,475/mo</td>
                  <td className="text-right py-3 px-4 text-green-400 font-semibold">€1,732/mo</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">500</td>
                  <td className="text-right py-3 px-4">€4,950/mo</td>
                  <td className="text-right py-3 px-4 text-green-400 font-semibold">€3,465/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-sm text-center mt-4">
            Based on average subscription price of €9.90/mo
          </p>
        </div>

        {/* Requirements */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Requirements
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">✅ What We Need</h3>
              <ul className="text-gray-400 space-y-2">
                <li>• Minimum 20 tips per month</li>
                <li>• Honest results tracking</li>
                <li>• Respond to subscriber questions</li>
                <li>• Telegram account</li>
              </ul>
            </div>
            
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">❌ What We Don't Need</h3>
              <ul className="text-gray-400 space-y-2">
                <li>• No website required</li>
                <li>• No coding skills</li>
                <li>• No payment setup</li>
                <li>• No minimum followers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-8 border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-gray-300 mb-6">
              Apply now. We'll get back to you within 24 hours.
            </p>
            
            <a 
              href="https://t.me/TipstersKingBot" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-8 py-4 rounded-xl font-semibold transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Apply on Telegram
            </a>

            <p className="text-gray-500 text-sm mt-4">
              Or email us: support@tipstersking.com
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-8">FAQ</h2>
          
          <div className="space-y-4">
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">How do I get paid?</summary>
              <p className="text-gray-400 mt-2">We pay monthly by the 5th via bank transfer, PayPal, or Wise. Minimum payout is €50.</p>
            </details>
            
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">Can I run my own channel too?</summary>
              <p className="text-gray-400 mt-2">Yes! There's no exclusivity. You can have your own channels alongside TipstersKing.</p>
            </details>

            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">What sports can I tip?</summary>
              <p className="text-gray-400 mt-2">Any sport! Football, basketball, tennis, esports, horse racing — if people bet on it, you can tip it.</p>
            </details>

            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">How do subscribers find me?</summary>
              <p className="text-gray-400 mt-2">You get a unique referral link to share. We also promote top tipsters on our homepage and social media.</p>
            </details>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-20">
        <div className="container mx-auto px-6 text-center text-gray-500">
          <p>© 2026 TipstersKing. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
