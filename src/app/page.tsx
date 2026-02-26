import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold text-white">
            👑 TipstersKing
          </div>
          <div className="space-x-4">
            <Link href="/leaderboard" className="text-gray-300 hover:text-white transition">
              Leaderboard
            </Link>
            <Link href="/pricing" className="text-gray-300 hover:text-white transition">
              Pricing
            </Link>
            <Link href="/login" className="text-gray-300 hover:text-white transition">
              Login
            </Link>
            <Link 
              href="/pricing" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              Subscribe
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Monetize your betting
            <span className="text-purple-400"> tips</span> in seconds
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Create a paid Telegram/Discord community, track your stats automatically, 
            and display your ROI on your landing page. All in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4 rounded-lg transition font-semibold"
            >
              Start Free →
            </Link>
            <Link 
              href="#features"
              className="border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 text-lg px-8 py-4 rounded-lg transition"
            >
              See Features
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-4xl font-bold text-purple-400">$29</div>
            <div className="text-gray-400 mt-2">/ month</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-4xl font-bold text-green-400">2%</div>
            <div className="text-gray-400 mt-2">transaction fee</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
            <div className="text-4xl font-bold text-blue-400">∞</div>
            <div className="text-gray-400 mt-2">subscribers</div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="bg-slate-900/50 py-24">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Everything tipsters need
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Automatic ROI Tracking
              </h3>
              <p className="text-gray-400">
                Log your bets and the system automatically calculates ROI, win rate, and yield.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Telegram & Discord
              </h3>
              <p className="text-gray-400">
                Automatic member management. Subscribers are added and removed automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Stripe Payments
              </h3>
              <p className="text-gray-400">
                Connect your Stripe account and receive payments directly. No middlemen.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Landing Page
              </h3>
              <p className="text-gray-400">
                Ready-made templates for tipster landing pages. Display your stats professionally.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-4">🔔</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Signal Alerts
              </h3>
              <p className="text-gray-400">
                Send your bets directly to Telegram/Discord with one click.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-gray-400">
                Track subscribers, revenue, and conversions in real-time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to start?
          </h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Create an account for free and start collecting subscribers today.
          </p>
          <Link 
            href="/register"
            className="bg-purple-600 hover:bg-purple-700 text-white text-lg px-8 py-4 rounded-lg transition font-semibold inline-block"
          >
            Start Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500">
          <p>© 2026 TipstersKing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
