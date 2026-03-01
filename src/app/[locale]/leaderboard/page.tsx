'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

interface LeaderboardEntry {
  rank: number;
  profile_id: string;
  alias: string;
  roi_pct: number;
  win_rate: number;
  tip_count: number;
  badge: 'established' | 'rising' | 'inconsistent';
  monthly_roi?: number;
}

// Mock data - replace with API call
const MOCK_TIPSTERS: LeaderboardEntry[] = [
  { rank: 1, profile_id: '1', alias: 'GoalMaster', roi_pct: 24.5, win_rate: 58.2, tip_count: 312, badge: 'established', monthly_roi: 31.2 },
  { rank: 2, profile_id: '2', alias: 'LaLigaKing', roi_pct: 19.8, win_rate: 54.1, tip_count: 245, badge: 'established', monthly_roi: 22.4 },
  { rank: 3, profile_id: '3', alias: 'BundesligaPro', roi_pct: 17.2, win_rate: 52.8, tip_count: 189, badge: 'rising', monthly_roi: 18.9 },
  { rank: 4, profile_id: '4', alias: 'SerieAExpert', roi_pct: 15.6, win_rate: 51.4, tip_count: 156, badge: 'rising', monthly_roi: 14.2 },
  { rank: 5, profile_id: '5', alias: 'PLWizard', roi_pct: 14.1, win_rate: 50.8, tip_count: 278, badge: 'established', monthly_roi: 11.8 },
];

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const tNav = useTranslations('nav');
  const [tipsters, setTipsters] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    // const res = await fetch('/api/leaderboard');
    // const data = await res.json();
    setTimeout(() => {
      setTipsters(MOCK_TIPSTERS);
      setLoading(false);
    }, 500);
  }, []);

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'established': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rising': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'inconsistent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getBadgeEmoji = (badge: string) => {
    switch (badge) {
      case 'established': return '🟢';
      case 'rising': return '🟡';
      case 'inconsistent': return '🔴';
      default: return '';
    }
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
              <Link href="/pricing" className="text-gray-300 hover:text-white transition">
                {tNav('pricing')}
              </Link>
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                {tNav('login')}
              </Link>
              <LocaleSwitcher />
              <Link 
                href="/pricing" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                {tNav('startFree')}
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🏆 {t('title')}</h1>
          <p className="text-gray-400 max-w-xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex justify-center gap-4 mb-8">
          <select className="bg-white/5 border border-white/10 text-gray-300 rounded-lg px-4 py-2">
            <option>{t('allLeagues')}</option>
            <option>La Liga</option>
            <option>Premier League</option>
            <option>Bundesliga</option>
            <option>Serie A</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-white text-xl">Loading...</div>
          </div>
        ) : tipsters.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{t('noResults')}</h2>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-gray-400 text-sm border-b border-white/10">
                  <th className="text-left py-4 px-4">{t('rank')}</th>
                  <th className="text-left py-4 px-4">{t('tipster')}</th>
                  <th className="text-center py-4 px-4">{t('badge')}</th>
                  <th className="text-right py-4 px-4">{t('roi')}</th>
                  <th className="text-right py-4 px-4">{t('winRate')}</th>
                  <th className="text-right py-4 px-4">{t('tips')}</th>
                  <th className="text-right py-4 px-4">{t('monthlyRoi')}</th>
                </tr>
              </thead>
              <tbody>
                {tipsters.map((tipster) => (
                  <tr 
                    key={tipster.profile_id}
                    className="border-b border-white/5 hover:bg-white/5 transition"
                  >
                    <td className="py-4 px-4">
                      <span className="text-2xl">
                        {tipster.rank === 1 && '🥇'}
                        {tipster.rank === 2 && '🥈'}
                        {tipster.rank === 3 && '🥉'}
                        {tipster.rank > 3 && <span className="text-gray-500 text-lg">#{tipster.rank}</span>}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                          {tipster.alias.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{tipster.alias}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(tipster.badge)}`}>
                        {getBadgeEmoji(tipster.badge)} {t(tipster.badge)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-semibold ${tipster.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tipster.roi_pct >= 0 ? '+' : ''}{tipster.roi_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      {tipster.win_rate.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 text-right text-gray-300">
                      {tipster.tip_count}
                    </td>
                    <td className="py-4 px-4 text-right">
                      {tipster.monthly_roi !== undefined && (
                        <span className={`font-medium ${tipster.monthly_roi >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          {tipster.monthly_roi >= 0 ? '+' : ''}{tipster.monthly_roi.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-8">{t('minTips')}</p>
      </main>
    </div>
  );
}
