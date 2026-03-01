'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

// Mock data for live ticker
const RECENT_RESULTS = [
  { tipster: 'GoalMaster', match: 'Real Madrid vs Barcelona', pick: 'Over 2.5', odds: 1.85, won: true },
  { tipster: 'LaLigaKing', match: 'Man City vs Arsenal', pick: 'Home Win', odds: 1.72, won: true },
  { tipster: 'BundesligaPro', match: 'Bayern vs Dortmund', pick: 'BTTS Yes', odds: 1.65, won: false },
  { tipster: 'SerieAExpert', match: 'Inter vs Juventus', pick: 'Draw', odds: 3.20, won: true },
  { tipster: 'PLWizard', match: 'Liverpool vs Chelsea', pick: 'Under 2.5', odds: 2.10, won: false },
];

// Mock leaderboard data
const TOP_TIPSTERS = [
  { rank: 1, alias: 'GoalMaster', roi: 24.5, winRate: 58.2, tips: 312, badge: 'established' },
  { rank: 2, alias: 'LaLigaKing', roi: 19.8, winRate: 54.1, tips: 245, badge: 'established' },
  { rank: 3, alias: 'BundesligaPro', roi: 17.2, winRate: 52.8, tips: 189, badge: 'rising' },
  { rank: 4, alias: 'SerieAExpert', roi: 15.6, winRate: 51.4, tips: 156, badge: 'rising' },
  { rank: 5, alias: 'PLWizard', roi: 14.1, winRate: 50.8, tips: 278, badge: 'established' },
];

export default function Home() {
  const t = useTranslations();
  const [subscribers, setSubscribers] = useState(1000);

  // Revenue calculator
  const monthlyRevenue = subscribers * 9.99;
  const tipsterPool = monthlyRevenue * 0.70;
  const shares = [0.25, 0.18, 0.13, 0.10, 0.08];

  const getBadgeEmoji = (badge: string) => {
    switch (badge) {
      case 'established': return '🟢';
      case 'rising': return '🟡';
      default: return '🔴';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 bg-slate-900/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              👑 TipstersKing
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <Link href="/leaderboard" className="text-gray-300 hover:text-white transition">
                {t('nav.leaderboard')}
              </Link>
              <a href="#how-it-works" className="text-gray-300 hover:text-white transition">
                {t('nav.howItWorks')}
              </a>
              <a href="#faq" className="text-gray-300 hover:text-white transition">
                {t('nav.faq')}
              </a>
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                {t('nav.login')}
              </Link>
              <LocaleSwitcher />
              <Link 
                href="/pricing" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                {t('nav.startFree')}
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero - Split CTA */}
      <main className="container mx-auto px-6 pt-12 pb-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Tipster Path */}
          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-8 border border-amber-500/30 hover:border-amber-500/50 transition">
            <div className="text-amber-400 text-sm font-semibold uppercase tracking-wide mb-2">
              {t('nav.applyAsTipster')}
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('hero.tipsterTitle')}
            </h2>
            <p className="text-gray-300 mb-6">
              {t('hero.tipsterSubtitle')}
            </p>
            <Link 
              href="/apply"
              className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg transition"
            >
              {t('hero.tipsterCta')} →
            </Link>
          </div>

          {/* Subscriber Path */}
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-2xl p-8 border border-green-500/30 hover:border-green-500/50 transition">
            <div className="text-green-400 text-sm font-semibold uppercase tracking-wide mb-2">
              {t('nav.startFree')}
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('hero.subscriberTitle')}
            </h2>
            <p className="text-gray-300 mb-6">
              {t('hero.subscriberSubtitle')}
            </p>
            <Link 
              href="/pricing"
              className="inline-block bg-green-500 hover:bg-green-600 text-black font-semibold px-6 py-3 rounded-lg transition"
            >
              {t('hero.subscriberCta')} →
            </Link>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-amber-400">24</div>
            <div className="text-gray-400 text-sm mt-1">{t('hero.statsActive')}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-green-400">1,247</div>
            <div className="text-gray-400 text-sm mt-1">{t('hero.statsSubscribers')}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-blue-400">+18.4%</div>
            <div className="text-gray-400 text-sm mt-1">{t('hero.statsAvgRoi')}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10">
            <div className="text-3xl font-bold text-purple-400">11</div>
            <div className="text-gray-400 text-sm mt-1">{t('hero.statsLeagues')}</div>
          </div>
        </div>
      </main>

      {/* Live Ticker */}
      <section className="bg-slate-900/50 py-4 border-y border-white/10 overflow-hidden">
        <div className="flex animate-scroll">
          {[...RECENT_RESULTS, ...RECENT_RESULTS].map((result, i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 px-6 whitespace-nowrap text-sm"
            >
              <span className={`${result.won ? 'text-green-400' : 'text-red-400'}`}>
                {result.won ? '✓' : '✗'}
              </span>
              <span className="text-gray-400">{result.tipster}</span>
              <span className="text-white">{result.match}</span>
              <span className="text-gray-300">{result.pick}</span>
              <span className="text-amber-400">@{result.odds}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-2">🏆 {t('leaderboard.title')}</h2>
            <p className="text-gray-400">{t('leaderboard.subtitle')}</p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-white/10">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">{t('leaderboard.tipster')}</th>
                    <th className="text-right py-3 px-4">{t('leaderboard.roi')}</th>
                    <th className="text-right py-3 px-4 hidden sm:table-cell">{t('leaderboard.winRate')}</th>
                    <th className="text-right py-3 px-4 hidden sm:table-cell">{t('leaderboard.tips')}</th>
                  </tr>
                </thead>
                <tbody>
                  {TOP_TIPSTERS.map((tipster) => (
                    <tr key={tipster.rank} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4">
                        {tipster.rank === 1 && '🥇'}
                        {tipster.rank === 2 && '🥈'}
                        {tipster.rank === 3 && '🥉'}
                        {tipster.rank > 3 && <span className="text-gray-500">{tipster.rank}</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">{tipster.alias}</span>
                        <span className="ml-2">{getBadgeEmoji(tipster.badge)}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-green-400 font-semibold">
                        +{tipster.roi.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300 hidden sm:table-cell">
                        {tipster.winRate.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-gray-300 hidden sm:table-cell">
                        {tipster.tips}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-6">
              <Link 
                href="/leaderboard"
                className="text-green-400 hover:text-green-300 font-medium"
              >
                {t('cta.browseLeaderboard')} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-slate-900/50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            {t('howItWorks.title')}
          </h2>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Tipster Journey */}
            <div>
              <h3 className="text-xl font-semibold text-amber-400 mb-6 flex items-center gap-2">
                <span className="text-2xl">👑</span> {t('howItWorks.tipsterTitle')}
              </h3>
              <div className="space-y-6">
                {['Step1', 'Step2', 'Step3', 'Step4'].map((step, i) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center font-bold border border-amber-500/30">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white">{t(`howItWorks.tipster${step}Title`)}</div>
                      <div className="text-gray-400 text-sm mt-1">{t(`howItWorks.tipster${step}Desc`)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscriber Journey */}
            <div>
              <h3 className="text-xl font-semibold text-green-400 mb-6 flex items-center gap-2">
                <span className="text-2xl">⚽</span> {t('howItWorks.subscriberTitle')}
              </h3>
              <div className="space-y-6">
                {['Step1', 'Step2', 'Step3', 'Step4'].map((step, i) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center font-bold border border-green-500/30">
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white">{t(`howItWorks.subscriber${step}Title`)}</div>
                      <div className="text-gray-400 text-sm mt-1">{t(`howItWorks.subscriber${step}Desc`)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Revenue Calculator */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">{t('calculator.title')}</h2>
              <p className="text-gray-400">{t('calculator.subtitle')}</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
              <div className="mb-8">
                <label className="block text-gray-400 text-sm mb-2">{t('calculator.subscribers')}</label>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="100"
                  value={subscribers}
                  onChange={(e) => setSubscribers(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500"
                />
                <div className="text-center text-3xl font-bold text-white mt-2">
                  {subscribers.toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm">{t('calculator.monthlyPool')}</div>
                  <div className="text-2xl font-bold text-green-400">
                    €{tipsterPool.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-amber-500/10 rounded-lg p-4 text-center border border-amber-500/20">
                  <div className="text-amber-400 text-sm">{t('calculator.rank1')}</div>
                  <div className="text-2xl font-bold text-white">
                    €{(tipsterPool * shares[0]).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-xs">{t('calculator.rank5')}</div>
                  <div className="text-lg font-semibold text-white">
                    €{(tipsterPool * shares[4]).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-xs">{t('calculator.rank10')}</div>
                  <div className="text-lg font-semibold text-white">
                    €{(tipsterPool * 0.04).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              <p className="text-gray-500 text-xs text-center mt-4">{t('calculator.note')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Telegram Preview */}
      <section className="bg-slate-900/50 py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">{t('telegram.previewTitle')}</h2>
              <p className="text-gray-400">{t('telegram.previewSubtitle')}</p>
            </div>

            <div className="bg-[#1a2836] rounded-2xl p-6 max-w-md mx-auto border border-white/10">
              {/* Telegram header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-black font-bold">
                  👑
                </div>
                <div>
                  <div className="text-white font-medium">TipstersKing VIP</div>
                  <div className="text-gray-400 text-xs">1,247 subscribers</div>
                </div>
              </div>

              {/* Sample tip message */}
              <div className="bg-[#0e1621] rounded-lg p-4 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-semibold">👑 GoalMaster</span>
                  <span className="text-green-400 text-xs">🟢 Established | ROI +24.5%</span>
                </div>
                <div className="text-white mb-2">
                  ⚽ <span className="font-medium">Real Madrid vs Barcelona</span>
                </div>
                <div className="text-gray-400 text-xs mb-3">
                  🏆 La Liga | 📅 Sat 21:00 CET
                </div>
                <div className="text-white mb-1">
                  📌 Pick: <span className="font-semibold text-green-400">Over 2.5 Goals</span>
                </div>
                <div className="text-white mb-3">
                  💰 Odds: <span className="font-semibold text-amber-400">1.85</span>
                </div>
                <div className="text-gray-400 text-xs">
                  🔒 Locked at 2026-03-01T19:00:00Z
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <a 
                  href="#" 
                  className="flex-1 bg-[#0088cc] hover:bg-[#0077b5] text-white text-center py-2 rounded-lg text-sm font-medium transition"
                >
                  {t('telegram.joinVip')}
                </a>
                <a 
                  href="#" 
                  className="flex-1 border border-white/20 hover:border-white/40 text-white text-center py-2 rounded-lg text-sm font-medium transition"
                >
                  {t('telegram.joinFree')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-lg mx-auto bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-green-500/20 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">{t('pricing.title')}</h2>
            <p className="text-gray-400 mb-6">{t('pricing.subtitle')}</p>
            
            <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full mb-4">
              {t('pricing.trialText')}
            </div>
            
            <div className="text-5xl font-bold text-white mb-2">
              {t('pricing.priceEur')}
              <span className="text-lg font-normal text-gray-400">{t('pricing.perMonth')}</span>
            </div>
            
            <ul className="text-left text-gray-300 space-y-3 my-6 max-w-xs mx-auto">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.feature1')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.feature2')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.feature3')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.feature4')}
              </li>
            </ul>
            
            <Link 
              href="/pricing"
              className="block w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
            >
              {t('pricing.cta')}
            </Link>
            <p className="text-gray-500 text-sm mt-3">{t('pricing.guarantee')}</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-900/50 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-12">{t('faq.title')}</h2>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <details key={i} className="bg-white/5 rounded-lg border border-white/10 group">
                <summary className="px-6 py-4 cursor-pointer text-white font-medium list-none flex justify-between items-center">
                  {t(`faq.q${i}`)}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-gray-400">
                  {t(`faq.a${i}`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to start?
          </h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
            Join thousands of football fans getting winning picks every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/apply"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 py-3 rounded-lg transition"
            >
              {t('cta.applyTipster')}
            </Link>
            <Link 
              href="/pricing"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg transition"
            >
              {t('cta.startTrial')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/terms" className="text-gray-500 hover:text-gray-300">{t('footer.terms')}</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-300">{t('footer.privacy')}</Link>
          </div>
        </div>
      </footer>

      {/* CSS for ticker animation */}
      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
