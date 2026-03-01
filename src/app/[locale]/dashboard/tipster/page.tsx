'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

// Types
interface Match {
  id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  deadline: string;
  deadline_display: string;
  minutes_until_deadline: number;
  leagues: {
    name: string;
  };
}

interface Tip {
  id: number;
  market_type: string;
  pick: string;
  odds: number;
  tip_timestamp: string;
  status: 'pending' | 'won' | 'lost' | 'void';
  matches: {
    home_team: string;
    away_team: string;
    kickoff_time: string;
    leagues: {
      name: string;
    };
  };
}

interface Stats {
  alias: string;
  totalTips: number;
  pendingTips: number;
  hasPayoutSetup: boolean;
  monthlyRank: number | null;
  stats90d: {
    roi_pct: number;
    win_rate: number;
    tip_count: number;
    profit_units: number;
  } | null;
  statsMonthly: {
    roi_pct: number;
    win_rate: number;
    tip_count: number;
  } | null;
}

const MARKETS = [
  { type: '1X2', picks: ['home', 'draw', 'away'], labels: ['Home Win', 'Draw', 'Away Win'] },
  { type: 'over_2.5', picks: ['over'], labels: ['Over 2.5 Goals'] },
  { type: 'under_2.5', picks: ['under'], labels: ['Under 2.5 Goals'] },
  { type: 'btts_yes', picks: ['yes'], labels: ['BTTS Yes'] },
  { type: 'btts_no', picks: ['no'], labels: ['BTTS No'] },
];

// Mock profile ID for demo - in real app, get from auth
const DEMO_PROFILE_ID = 'demo-tipster-id';

export default function TipsterDashboard() {
  const t = useTranslations('dashboard.tipster');
  const tNav = useTranslations('nav');

  const [activeTab, setActiveTab] = useState<'matches' | 'tips' | 'stats'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  // Tip submission state
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [selectedPick, setSelectedPick] = useState<string | null>(null);
  const [odds, setOdds] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchesRes, tipsRes, statsRes] = await Promise.all([
        fetch('/api/tipster/matches'),
        fetch(`/api/tipster/tips?profileId=${DEMO_PROFILE_ID}`),
        fetch(`/api/tipster/stats?profileId=${DEMO_PROFILE_ID}`),
      ]);

      if (matchesRes.ok) {
        const matchesData = await matchesRes.json();
        setMatches(matchesData);
      }

      if (tipsRes.ok) {
        const tipsData = await tipsRes.json();
        setTips(tipsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTip = async () => {
    if (!selectedMatch || !selectedMarket || !selectedPick || !odds) return;

    const oddsNum = parseFloat(odds);
    if (isNaN(oddsNum) || oddsNum < 1.30 || oddsNum > 10.00) {
      setSubmitError('Odds must be between 1.30 and 10.00');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch('/api/tipster/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: DEMO_PROFILE_ID,
          matchId: selectedMatch.id,
          marketType: selectedMarket,
          pick: selectedPick,
          odds: oddsNum,
          analysis: analysis || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || 'Failed to submit tip');
        return;
      }

      setSubmitSuccess(true);
      setSelectedMatch(null);
      setSelectedMarket(null);
      setSelectedPick(null);
      setOdds('');
      setAnalysis('');

      // Refresh data
      loadData();

      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      setSubmitError('Failed to submit tip');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-green-400 bg-green-500/20';
      case 'lost': return 'text-red-400 bg-red-500/20';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20';
      case 'void': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400';
    }
  };

  const formatPick = (marketType: string, pick: string) => {
    const market = MARKETS.find(m => m.type === marketType);
    if (!market) return `${marketType}: ${pick}`;
    const idx = market.picks.indexOf(pick);
    return market.labels[idx] || pick;
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
              <span className="text-amber-400 font-medium">
                {stats?.alias || 'Tipster'} Dashboard
              </span>
              <LocaleSwitcher />
              <Link href="/logout" className="text-gray-400 hover:text-white text-sm">
                Logout
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-sm">{t('roi')} (90d)</div>
            <div className={`text-2xl font-bold ${(stats?.stats90d?.roi_pct ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats?.stats90d ? `${stats.stats90d.roi_pct >= 0 ? '+' : ''}${stats.stats90d.roi_pct.toFixed(1)}%` : '—'}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-sm">{t('winRate')}</div>
            <div className="text-2xl font-bold text-white">
              {stats?.stats90d ? `${stats.stats90d.win_rate.toFixed(1)}%` : '—'}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-sm">{t('totalTips')}</div>
            <div className="text-2xl font-bold text-white">{stats?.totalTips || 0}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-gray-400 text-sm">{t('monthlyRank')}</div>
            <div className="text-2xl font-bold text-amber-400">
              {stats?.monthlyRank ? `#${stats.monthlyRank}` : t('notRanked')}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['matches', 'tips', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-amber-500 text-black'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab === 'matches' && `📅 ${t('matches.title')}`}
              {tab === 'tips' && `📝 ${t('tips.title')}`}
              {tab === 'stats' && `📊 ${t('stats')}`}
            </button>
          ))}
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-4">
            ✅ {t('submit.success')}
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Match List */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('matches.subtitle')}</h3>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 rounded-full mx-auto"></div>
                </div>
              ) : matches.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{t('matches.noMatches')}</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {matches.map((match) => (
                    <button
                      key={match.id}
                      onClick={() => {
                        setSelectedMatch(match);
                        setSelectedMarket(null);
                        setSelectedPick(null);
                      }}
                      className={`w-full text-left p-4 rounded-lg border transition ${
                        selectedMatch?.id === match.id
                          ? 'bg-amber-500/20 border-amber-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-medium">
                            {match.home_team} vs {match.away_team}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {match.leagues?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            match.minutes_until_deadline < 60 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            ⏰ {match.deadline_display}
                          </div>
                          <div className="text-gray-500 text-xs">
                            {new Date(match.kickoff_time).toLocaleString('en-GB', {
                              weekday: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tip Form */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('submit.title')}</h3>

              {!selectedMatch ? (
                <p className="text-gray-400 text-center py-8">{t('submit.selectMatch')}</p>
              ) : (
                <div className="space-y-4">
                  {/* Selected Match */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white font-medium">
                      {selectedMatch.home_team} vs {selectedMatch.away_team}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {selectedMatch.leagues?.name} • ⏰ {selectedMatch.deadline_display} left
                    </div>
                  </div>

                  {/* Market Selection */}
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">{t('submit.selectMarket')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MARKETS.map((market) => (
                        <button
                          key={market.type}
                          onClick={() => {
                            setSelectedMarket(market.type);
                            setSelectedPick(market.picks.length === 1 ? market.picks[0] : null);
                          }}
                          className={`p-2 rounded-lg text-sm font-medium transition ${
                            selectedMarket === market.type
                              ? 'bg-amber-500 text-black'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          {market.type === '1X2' ? 'Match Result' : market.labels[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pick Selection (for 1X2) */}
                  {selectedMarket === '1X2' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Pick</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['home', 'draw', 'away'].map((pick, idx) => (
                          <button
                            key={pick}
                            onClick={() => setSelectedPick(pick)}
                            className={`p-2 rounded-lg text-sm font-medium transition ${
                              selectedPick === pick
                                ? 'bg-green-500 text-black'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {['Home', 'Draw', 'Away'][idx]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Odds Input */}
                  {selectedMarket && (selectedPick || selectedMarket !== '1X2') && (
                    <>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">{t('submit.enterOdds')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="1.30"
                          max="10.00"
                          value={odds}
                          onChange={(e) => setOdds(e.target.value)}
                          placeholder="e.g., 1.85"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">{t('submit.analysis')}</label>
                        <textarea
                          value={analysis}
                          onChange={(e) => setAnalysis(e.target.value)}
                          placeholder={t('submit.analysisPlaceholder')}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white resize-none"
                        />
                      </div>

                      {submitError && (
                        <div className="text-red-400 text-sm">{submitError}</div>
                      )}

                      <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm p-3 rounded-lg">
                        ⚠️ {t('submit.warning')}
                      </div>

                      <button
                        onClick={handleSubmitTip}
                        disabled={submitting || !odds}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 rounded-lg transition disabled:opacity-50"
                      >
                        {submitting ? '...' : t('submit.confirm')} 🔒
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tips Tab */}
        {activeTab === 'tips' && (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            {tips.length === 0 ? (
              <p className="text-gray-400 text-center py-12">{t('tips.noTips')}</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-gray-400 text-sm border-b border-white/10 bg-white/5">
                    <th className="text-left py-3 px-4">{t('tips.match')}</th>
                    <th className="text-left py-3 px-4">{t('tips.pick')}</th>
                    <th className="text-right py-3 px-4">{t('tips.odds')}</th>
                    <th className="text-center py-3 px-4">{t('tips.status')}</th>
                    <th className="text-right py-3 px-4 hidden md:table-cell">{t('tips.submitted')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tips.map((tip) => (
                    <tr key={tip.id} className="border-b border-white/5">
                      <td className="py-3 px-4">
                        <div className="text-white">{tip.matches?.home_team} vs {tip.matches?.away_team}</div>
                        <div className="text-gray-500 text-xs">{tip.matches?.leagues?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {formatPick(tip.market_type, tip.pick)}
                      </td>
                      <td className="py-3 px-4 text-right text-amber-400 font-medium">
                        {tip.odds.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tip.status)}`}>
                          {t(`tips.${tip.status}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 text-sm hidden md:table-cell">
                        {new Date(tip.tip_timestamp).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 90-day Stats */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('stats')} (90 days)</h3>
              {stats?.stats90d ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('roi')}</span>
                    <span className={`font-bold ${stats.stats90d.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.stats90d.roi_pct >= 0 ? '+' : ''}{stats.stats90d.roi_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('winRate')}</span>
                    <span className="text-white font-bold">{stats.stats90d.win_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('totalTips')}</span>
                    <span className="text-white font-bold">{stats.stats90d.tip_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('profitUnits')}</span>
                    <span className={`font-bold ${stats.stats90d.profit_units >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.stats90d.profit_units >= 0 ? '+' : ''}{stats.stats90d.profit_units.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">No data yet</p>
              )}
            </div>

            {/* Monthly Stats */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">{t('thisMonth')}</h3>
              {stats?.statsMonthly ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('roi')}</span>
                    <span className={`font-bold ${stats.statsMonthly.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.statsMonthly.roi_pct >= 0 ? '+' : ''}{stats.statsMonthly.roi_pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('winRate')}</span>
                    <span className="text-white font-bold">{stats.statsMonthly.win_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('totalTips')}</span>
                    <span className="text-white font-bold">{stats.statsMonthly.tip_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('monthlyRank')}</span>
                    <span className="text-amber-400 font-bold">
                      {stats.monthlyRank ? `#${stats.monthlyRank}` : 'Not ranked yet'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Need 10+ tips this month</p>
              )}
            </div>

            {/* Payout Setup */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6 md:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-4">{t('payoutSetup')}</h3>
              {stats?.hasPayoutSetup ? (
                <div className="flex items-center gap-2 text-green-400">
                  <span>✅</span> {t('payoutsConfigured')}
                </div>
              ) : (
                <div>
                  <p className="text-gray-400 mb-4">Set up your Stripe account to receive monthly commissions.</p>
                  <button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-2 rounded-lg transition">
                    {t('setupPayouts')} →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
