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
  monthly_roi: number | null;
  badge: 'established' | 'rising' | 'inconsistent';
}

const LEAGUES = [
  'All Leagues',
  'La Liga',
  'Premier League',
  'Champions League',
  'Europa League',
  'Bundesliga',
  'Serie A',
  'Ligue 1',
  'Eredivisie',
  'Primeira Liga',
  'Brasileirão',
  'MLS',
];

type SortOption = 'roi' | 'winRate' | 'tips' | 'monthlyRoi';

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const tNav = useTranslations('nav');
  
  const [tipsters, setTipsters] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [league, setLeague] = useState('All Leagues');
  const [sortBy, setSortBy] = useState<SortOption>('roi');

  useEffect(() => {
    fetchLeaderboard();
  }, [league, sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (league !== 'All Leagues') params.set('league', league);
      params.set('sort', sortBy);
      params.set('limit', '50');

      const res = await fetch(`/api/leaderboard?${params}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await res.json();
      setTipsters(data);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setError('Failed to load leaderboard');
      // Use mock data as fallback
      setTipsters(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeStyle = (badge: string) => {
    switch (badge) {
      case 'established':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rising':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'inconsistent':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return <span className="text-gray-500 text-lg">#{rank}</span>;
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
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-4">🏆 {t('title')}</h1>
          <p className="text-gray-400 max-w-xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {/* League Filter */}
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="bg-white/5 border border-white/10 text-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {LEAGUES.map((l) => (
              <option key={l} value={l} className="bg-slate-800">
                {l === 'All Leagues' ? t('allLeagues') : l}
              </option>
            ))}
          </select>

          {/* Sort Options */}
          <div className="flex gap-2">
            {[
              { key: 'roi', label: t('roi') },
              { key: 'winRate', label: t('winRate') },
              { key: 'tips', label: t('tips') },
              { key: 'monthlyRoi', label: t('monthlyRoi') },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSortBy(key as SortOption)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  sortBy === key
                    ? 'bg-green-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            <p className="text-gray-400 mt-4">Loading...</p>
          </div>
        ) : error && tipsters.length === 0 ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : tipsters.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-semibold text-white mb-2">{t('noResults')}</h2>
            <p className="text-gray-400">{t('minTips')}</p>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-white/10 bg-white/5">
                    <th className="text-left py-4 px-4 font-medium">{t('rank')}</th>
                    <th className="text-left py-4 px-4 font-medium">{t('tipster')}</th>
                    <th className="text-center py-4 px-4 font-medium">{t('badge')}</th>
                    <th className="text-right py-4 px-4 font-medium">
                      <button
                        onClick={() => setSortBy('roi')}
                        className={sortBy === 'roi' ? 'text-green-400' : ''}
                      >
                        {t('roi')} (90d) {sortBy === 'roi' && '↓'}
                      </button>
                    </th>
                    <th className="text-right py-4 px-4 font-medium hidden md:table-cell">
                      <button
                        onClick={() => setSortBy('winRate')}
                        className={sortBy === 'winRate' ? 'text-green-400' : ''}
                      >
                        {t('winRate')} {sortBy === 'winRate' && '↓'}
                      </button>
                    </th>
                    <th className="text-right py-4 px-4 font-medium hidden sm:table-cell">
                      <button
                        onClick={() => setSortBy('tips')}
                        className={sortBy === 'tips' ? 'text-green-400' : ''}
                      >
                        {t('tips')} {sortBy === 'tips' && '↓'}
                      </button>
                    </th>
                    <th className="text-right py-4 px-4 font-medium hidden lg:table-cell">
                      <button
                        onClick={() => setSortBy('monthlyRoi')}
                        className={sortBy === 'monthlyRoi' ? 'text-green-400' : ''}
                      >
                        {t('monthlyRoi')} {sortBy === 'monthlyRoi' && '↓'}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tipsters.map((tipster, idx) => (
                    <tr
                      key={tipster.profile_id}
                      className={`border-b border-white/5 hover:bg-white/5 transition ${
                        idx < 3 ? 'bg-gradient-to-r from-amber-500/5 to-transparent' : ''
                      }`}
                    >
                      <td className="py-4 px-4">
                        <span className="text-2xl">{getRankDisplay(tipster.rank)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                            {tipster.alias.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white font-medium">{tipster.alias}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getBadgeStyle(
                            tipster.badge
                          )}`}
                        >
                          {getBadgeEmoji(tipster.badge)} {t(tipster.badge)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span
                          className={`font-semibold text-lg ${
                            tipster.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {tipster.roi_pct >= 0 ? '+' : ''}
                          {tipster.roi_pct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right text-gray-300 hidden md:table-cell">
                        {tipster.win_rate.toFixed(1)}%
                      </td>
                      <td className="py-4 px-4 text-right text-gray-300 hidden sm:table-cell">
                        {tipster.tip_count}
                      </td>
                      <td className="py-4 px-4 text-right hidden lg:table-cell">
                        {tipster.monthly_roi !== null ? (
                          <span
                            className={`font-medium ${
                              tipster.monthly_roi >= 0 ? 'text-blue-400' : 'text-red-400'
                            }`}
                          >
                            {tipster.monthly_roi >= 0 ? '+' : ''}
                            {tipster.monthly_roi.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-gray-500 text-sm">{t('minTips')}</p>
          <div className="flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1">
              <span className="text-green-400">🟢</span>
              <span className="text-gray-400">{t('established')}: 200+ tips, 6+ months</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">🟡</span>
              <span className="text-gray-400">{t('rising')}: Building track record</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-400">🔴</span>
              <span className="text-gray-400">{t('inconsistent')}: High variance</span>
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-400 mb-4">Want to join the leaderboard?</p>
          <Link
            href="/apply"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-lg transition"
          >
            Apply as Tipster →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} TipstersKing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

// Mock data for development/fallback
const MOCK_DATA: LeaderboardEntry[] = [
  { rank: 1, profile_id: '1', alias: 'GoalMaster', roi_pct: 24.5, win_rate: 58.2, tip_count: 312, badge: 'established', monthly_roi: 31.2 },
  { rank: 2, profile_id: '2', alias: 'LaLigaKing', roi_pct: 19.8, win_rate: 54.1, tip_count: 245, badge: 'established', monthly_roi: 22.4 },
  { rank: 3, profile_id: '3', alias: 'BundesligaPro', roi_pct: 17.2, win_rate: 52.8, tip_count: 189, badge: 'rising', monthly_roi: 18.9 },
  { rank: 4, profile_id: '4', alias: 'SerieAExpert', roi_pct: 15.6, win_rate: 51.4, tip_count: 156, badge: 'rising', monthly_roi: 14.2 },
  { rank: 5, profile_id: '5', alias: 'PLWizard', roi_pct: 14.1, win_rate: 50.8, tip_count: 278, badge: 'established', monthly_roi: 11.8 },
  { rank: 6, profile_id: '6', alias: 'UCLHunter', roi_pct: 12.8, win_rate: 49.5, tip_count: 134, badge: 'rising', monthly_roi: 8.5 },
  { rank: 7, profile_id: '7', alias: 'Ligue1Boss', roi_pct: 11.4, win_rate: 48.9, tip_count: 167, badge: 'rising', monthly_roi: 15.2 },
  { rank: 8, profile_id: '8', alias: 'DutchMaster', roi_pct: 10.2, win_rate: 47.8, tip_count: 98, badge: 'rising', monthly_roi: -2.1 },
  { rank: 9, profile_id: '9', alias: 'BrazilianBet', roi_pct: 8.9, win_rate: 46.5, tip_count: 112, badge: 'inconsistent', monthly_roi: 25.3 },
  { rank: 10, profile_id: '10', alias: 'MLSAnalyst', roi_pct: 7.5, win_rate: 45.2, tip_count: 87, badge: 'rising', monthly_roi: 4.8 },
];
