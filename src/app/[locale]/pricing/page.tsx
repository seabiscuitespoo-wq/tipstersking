'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

interface PricingData {
  country: string | null;
  currency: 'eur' | 'usd' | 'gbp';
  price: string;
  amount: number;
}

const CURRENCY_INFO = {
  eur: { flag: '🇪🇺', name: 'EUR' },
  usd: { flag: '🇺🇸', name: 'USD' },
  gbp: { flag: '🇬🇧', name: 'GBP' },
};

export default function PricingPage() {
  const t = useTranslations('pricing');
  const tNav = useTranslations('nav');
  const tFaq = useTranslations('faq');
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<'eur' | 'usd' | 'gbp'>('eur');

  // Fetch geo-pricing on mount
  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch('/api/stripe/checkout');
        if (res.ok) {
          const data = await res.json();
          setPricing(data);
          setSelectedCurrency(data.currency);
        }
      } catch (err) {
        // Default to EUR on error
        setPricing({ country: null, currency: 'eur', price: '€9.99', amount: 999 });
      }
    }
    fetchPricing();
  }, []);

  const handleSubscribe = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: selectedCurrency,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayPrice = () => {
    const prices = {
      eur: '€9.99',
      usd: '$9.99',
      gbp: '£8.99',
    };
    return prices[selectedCurrency];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              👑 TipstersKing
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/leaderboard" className="text-gray-300 hover:text-white transition">
                {tNav('leaderboard')}
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                {tNav('login')}
              </Link>
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('title')}</h1>
          <p className="text-xl text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-green-500/30 shadow-xl shadow-green-500/10">
            <div className="text-center mb-8">
              <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-sm font-medium rounded-full mb-4">
                {t('trialText')}
              </div>
              
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold text-white">{getDisplayPrice()}</span>
                <span className="text-gray-400">{t('perMonth')}</span>
              </div>
              
              {/* Currency Selector */}
              <div className="flex justify-center gap-2 mt-4">
                {(['eur', 'usd', 'gbp'] as const).map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setSelectedCurrency(curr)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 ${
                      selectedCurrency === curr
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span>{CURRENCY_INFO[curr].flag}</span>
                    <span>{CURRENCY_INFO[curr].name}</span>
                  </button>
                ))}
              </div>
              
              {pricing?.country && (
                <p className="text-gray-500 text-xs mt-2">
                  Detected: {pricing.country}
                </p>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {['feature1', 'feature2', 'feature3', 'feature4'].map((key) => (
                <li key={key} className="flex items-center gap-3 text-gray-300">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  {t(key)}
                </li>
              ))}
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-4 rounded-xl font-semibold text-lg transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </span>
              ) : (
                t('cta')
              )}
            </button>
            
            <p className="text-center text-gray-500 text-sm mt-4">{t('guarantee')}</p>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-12 text-center">
          <div className="flex justify-center items-center gap-6 text-gray-500 text-sm">
            <span>🔒 SSL Secured</span>
            <span>💳 Stripe</span>
            <span>🔄 Cancel Anytime</span>
          </div>
        </div>

        {/* Comparison */}
        <div className="mt-12 max-w-md mx-auto">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h3 className="text-white font-medium text-center mb-3">All Currencies</h3>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-2xl mb-1">🇪🇺</div>
                <div className="text-white font-bold">€9.99</div>
                <div className="text-gray-500">EUR</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🇺🇸</div>
                <div className="text-white font-bold">$9.99</div>
                <div className="text-gray-500">USD</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🇬🇧</div>
                <div className="text-white font-bold">£8.99</div>
                <div className="text-gray-500">GBP</div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">{tFaq('title')}</h2>
          
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <details key={i} className="bg-white/5 rounded-lg border border-white/10 group">
                <summary className="px-6 py-4 cursor-pointer text-white font-medium list-none flex justify-between items-center">
                  {tFaq(`q${i}`)}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-6 pb-4 text-gray-400">
                  {tFaq(`a${i}`)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-20">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} TipstersKing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
