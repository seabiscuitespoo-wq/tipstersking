'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

const LEAGUES = [
  'La Liga', 'Premier League', 'Champions League', 'Europa League',
  'Bundesliga', 'Serie A', 'Ligue 1', 'Eredivisie', 
  'Primeira Liga', 'Brasileirão', 'MLS'
];

export default function ApplyPage() {
  const t = useTranslations('tipster.apply');
  const tNav = useTranslations('nav');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    alias: '',
    email: '',
    leagues: [] as string[],
    experience: '',
    trackRecord: '',
    telegram: '',
  });

  const handleLeagueToggle = (league: string) => {
    setForm(prev => ({
      ...prev,
      leagues: prev.leagues.includes(league)
        ? prev.leagues.filter(l => l !== league)
        : [...prev.leagues, league]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implement API call
      // const res = await fetch('/api/tipsters/apply', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(form),
      // });
      
      // Simulate success for now
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch (err) {
      setError(t('form.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-4">Application Submitted!</h1>
          <p className="text-gray-400 mb-8">{t('form.success')}</p>
          <Link 
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

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
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">{t('title')}</h1>
            <p className="text-gray-400 text-lg">{t('subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Benefits sidebar */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-amber-500/10 rounded-xl p-6 border border-amber-500/20">
                <h3 className="text-amber-400 font-semibold mb-4">{t('benefits.title')}</h3>
                <ul className="space-y-3 text-sm">
                  {['benefit1', 'benefit2', 'benefit3', 'benefit4', 'benefit5'].map((key) => (
                    <li key={key} className="flex items-start gap-2 text-gray-300">
                      <span className="text-amber-400 mt-0.5">✓</span>
                      {t(`benefits.${key}`)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold mb-4">{t('requirements.title')}</h3>
                <ul className="space-y-3 text-sm">
                  {['req1', 'req2', 'req3', 'req4', 'req5'].map((key) => (
                    <li key={key} className="flex items-start gap-2 text-gray-400">
                      <span className="text-gray-500 mt-0.5">•</span>
                      {t(`requirements.${key}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Application form */}
            <div className="md:col-span-2">
              <form onSubmit={handleSubmit} className="bg-white/5 rounded-xl p-8 border border-white/10 space-y-6">
                {error && (
                  <div className="bg-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Alias */}
                <div>
                  <label className="block text-white font-medium mb-2">{t('form.alias')}</label>
                  <input
                    type="text"
                    value={form.alias}
                    onChange={(e) => setForm({ ...form, alias: e.target.value })}
                    placeholder={t('form.aliasPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <p className="text-gray-500 text-sm mt-1">{t('form.aliasHint')}</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">{t('form.email')}</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <p className="text-gray-500 text-sm mt-1">{t('form.emailHint')}</p>
                </div>

                {/* Telegram */}
                <div>
                  <label className="block text-white font-medium mb-2">{t('form.telegram')}</label>
                  <input
                    type="text"
                    value={form.telegram}
                    onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                    placeholder={t('form.telegramPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <p className="text-gray-500 text-sm mt-1">{t('form.telegramHint')}</p>
                </div>

                {/* Leagues */}
                <div>
                  <label className="block text-white font-medium mb-2">{t('form.leagues')}</label>
                  <div className="flex flex-wrap gap-2">
                    {LEAGUES.map((league) => (
                      <button
                        key={league}
                        type="button"
                        onClick={() => handleLeagueToggle(league)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                          form.leagues.includes(league)
                            ? 'bg-amber-500 text-black'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {league}
                      </button>
                    ))}
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{t('form.leaguesHint')}</p>
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-white font-medium mb-2">{t('form.experience')}</label>
                  <textarea
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    placeholder={t('form.experiencePlaceholder')}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    required
                  />
                  <p className="text-gray-500 text-sm mt-1">{t('form.experienceHint')}</p>
                </div>

                {/* Track Record */}
                <div>
                  <label className="block text-white font-medium mb-2">{t('form.trackRecord')}</label>
                  <input
                    type="url"
                    value={form.trackRecord}
                    onChange={(e) => setForm({ ...form, trackRecord: e.target.value })}
                    placeholder={t('form.trackRecordPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-gray-500 text-sm mt-1">{t('form.trackRecordHint')}</p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-semibold text-lg transition bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('form.submitting') : t('form.submit')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
