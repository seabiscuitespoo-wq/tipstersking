'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  home_team_logo: string | null;
  away_team_logo: string | null;
  kickoff_time: string;
  deadline: string;
  deadline_display: string;
  minutes_until_deadline: number;
  leagues: {
    name: string;
    logo_url: string | null;
  };
}

interface Tip {
  id: number;
  match_id: number;
  market_type: string;
  pick: string;
  odds: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  tip_timestamp: string;
  analysis: string | null;
  matches: {
    home_team: string;
    away_team: string;
    kickoff_time: string;
    leagues: { name: string };
  };
}

interface Stats {
  alias: string;
  totalTips: number;
  pendingTips: number;
  hasPayoutSetup: boolean;
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
  monthlyRank: number | null;
  earningsHistory: Array<{
    period_year: number;
    period_month: number;
    rank: number;
    net_amount: number;
  }>;
}

interface ConnectStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

interface PayoutData {
  commissions: Array<{
    id: number;
    period_year: number;
    period_month: number;
    rank: number;
    roi_pct: number;
    net_amount: number;
    paid_at: string | null;
  }>;
  totals: {
    total: number;
    pending: number;
    paid: number;
  };
}

const MARKET_TYPES = [
  { value: '1X2_home', label: 'Home Win' },
  { value: '1X2_draw', label: 'Draw' },
  { value: '1X2_away', label: 'Away Win' },
  { value: 'over_2.5', label: 'Over 2.5 Goals' },
  { value: 'under_2.5', label: 'Under 2.5 Goals' },
  { value: 'btts_yes', label: 'BTTS Yes' },
  { value: 'btts_no', label: 'BTTS No' },
];

// Mock profile ID - in real app this comes from auth
// TODO: Replace with actual auth user ID
const MOCK_PROFILE_ID = '0af31417-869d-48c8-ac35-f095717c5006';

export default function TipsterDashboardPage() {
  const t = useTranslations('dashboard.tipster');
  const tNav = useTranslations('nav');
  
  const [activeTab, setActiveTab] = useState<'matches' | 'tips' | 'submit' | 'earnings'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Submit form state
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedMarket, setSelectedMarket] = useState('');
  const [odds, setOdds] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  // Connect/Payouts state
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const [matchesRes, tipsRes, statsRes, connectRes, payoutsRes] = await Promise.all([
        fetch('/api/tipster/matches?hours=48'),
        fetch(`/api/tipster/tips?profileId=${MOCK_PROFILE_ID}&limit=20`),
        fetch(`/api/tipster/stats?profileId=${MOCK_PROFILE_ID}`),
        fetch('/api/tipster/connect'),
        fetch('/api/tipster/payouts'),
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
      
      if (connectRes.ok) {
        const connectData = await connectRes.json();
        setConnectStatus(connectData);
      }
      
      if (payoutsRes.ok) {
        const payoutsData = await payoutsRes.json();
        setPayoutData(payoutsData);
      }
      
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetupConnect = async () => {
    setConnectLoading(true);
    
    try {
      const res = await fetch('/api/tipster/connect', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to setup payouts');
        return;
      }
      
      if (data.alreadyComplete) {
        alert('Payouts already configured!');
        fetchData();
        return;
      }
      
      // Redirect to Stripe onboarding
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
      
    } catch (err) {
      alert('Failed to setup payouts');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleSubmitTip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedMarket || !odds) return;
    
    setSubmitting(true);
    setSubmitSuccess(false);
    
    try {
      const [marketType, pick] = selectedMarket.includes('1X2') 
        ? ['1X2', selectedMarket.split('_')[1]]
        : [selectedMarket, selectedMarket];
      
      const res = await fetch('/api/tipster/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: MOCK_PROFILE_ID,
          matchId: selectedMatch.id,
          marketType,
          pick,
          odds: parseFloat(odds),
          analysis: analysis || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || t('submit.error'));
        return;
      }
      
      setSubmitSuccess(true);
      setSelectedMatch(null);
      setSelectedMarket('');
      setOdds('');
      setAnalysis('');
      fetchData(); // Refresh
      
      setTimeout(() => setSubmitSuccess(false), 3000);
      
    } catch (err) {
      alert(t('submit.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'bg-green-500/20 text-green-400';
      case 'lost': return 'bg-red-500/20 text-red-400';
      case 'void': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-yellow-500/20 text-yellow-400';
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
              <Link href="/leaderboard" className="text-gray-300 hover:text-white transition">
                {tNav('leaderboard')}
              </Link>
              <LocaleSwitcher />
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title + Stats Overview */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
            {stats && (
              <p className="text-gray-400">
                Welcome back, <span className="text-amber-400">{stats.alias}</span>
              </p>
            )}
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-gray-400 text-sm mb-1">{t('roi')}</div>
                <div className={`text-2xl font-bold ${
                  stats.stats90d && stats.stats90d.roi_pct >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stats.stats90d ? `${stats.stats90d.roi_pct.toFixed(1)}%` : '—'}
                </div>
                <div className="text-gray-500 text-xs">90 days</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-gray-400 text-sm mb-1">{t('winRate')}</div>
                <div className="text-2xl font-bold text-white">
                  {stats.stats90d ? `${stats.stats90d.win_rate.toFixed(0)}%` : '—'}
                </div>
                <div className="text-gray-500 text-xs">90 days</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-gray-400 text-sm mb-1">{t('totalTips')}</div>
                <div className="text-2xl font-bold text-white">{stats.totalTips}</div>
                <div className="text-gray-500 text-xs">{stats.pendingTips} pending</div>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-gray-400 text-sm mb-1">{t('monthlyRank')}</div>
                <div className="text-2xl font-bold text-amber-400">
                  {stats.monthlyRank ? `#${stats.monthlyRank}` : '—'}
                </div>
                <div className="text-gray-500 text-xs">{t('notRanked')}</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-white/10 pb-2 overflow-x-auto">
            {(['matches', 'tips', 'submit', 'earnings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === tab
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'matches' && t('matches.title')}
                {tab === 'tips' && t('tips.title')}
                {tab === 'submit' && t('submit.title')}
                {tab === 'earnings' && t('earnings')}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/20 text-red-400 px-6 py-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : (
            <>
              {/* Matches Tab */}
              {activeTab === 'matches' && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm mb-4">{t('matches.subtitle')}</p>
                  
                  {matches.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      {t('matches.noMatches')}
                    </div>
                  ) : (
                    matches.map((match) => (
                      <div
                        key={match.id}
                        className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <div className="text-xs text-amber-400 mb-1">
                            {match.leagues?.name}
                          </div>
                          <div className="text-white font-medium">
                            {match.home_team} vs {match.away_team}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {formatDate(match.kickoff_time)}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-gray-400 text-sm">{t('matches.deadline')}</div>
                          <div className={`font-medium ${
                            match.minutes_until_deadline < 60 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {match.deadline_display}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setActiveTab('submit');
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition"
                        >
                          {t('matches.submitTip')}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tips Tab */}
              {activeTab === 'tips' && (
                <div className="space-y-3">
                  {tips.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      {t('tips.noTips')}
                    </div>
                  ) : (
                    tips.map((tip) => (
                      <div
                        key={tip.id}
                        className="bg-white/5 rounded-xl p-4 border border-white/10"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex-1 min-w-[200px]">
                            <div className="text-xs text-amber-400 mb-1">
                              {tip.matches?.leagues?.name}
                            </div>
                            <div className="text-white font-medium">
                              {tip.matches?.home_team} vs {tip.matches?.away_team}
                            </div>
                            <div className="text-gray-400 text-sm mt-1">
                              {tip.market_type}: <span className="text-white">{tip.pick}</span>
                              {' @ '}<span className="text-amber-400">{tip.odds}</span>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(tip.status)}`}>
                              {tip.status.toUpperCase()}
                            </span>
                            <div className="text-gray-500 text-xs mt-1">
                              {formatDate(tip.tip_timestamp)}
                            </div>
                          </div>
                        </div>
                        
                        {tip.analysis && (
                          <div className="mt-3 pt-3 border-t border-white/10 text-gray-400 text-sm">
                            {tip.analysis}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Submit Tab */}
              {activeTab === 'submit' && (
                <div className="max-w-2xl">
                  {submitSuccess && (
                    <div className="bg-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6">
                      {t('submit.success')}
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmitTip} className="space-y-6">
                    {/* Match Selection */}
                    <div>
                      <label className="block text-white font-medium mb-2">
                        {t('submit.selectMatch')}
                      </label>
                      <select
                        value={selectedMatch?.id || ''}
                        onChange={(e) => {
                          const match = matches.find(m => m.id === parseInt(e.target.value));
                          setSelectedMatch(match || null);
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      >
                        <option value="">-- Select a match --</option>
                        {matches.map((match) => (
                          <option key={match.id} value={match.id}>
                            {match.home_team} vs {match.away_team} ({match.deadline_display} left)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Market Selection */}
                    <div>
                      <label className="block text-white font-medium mb-2">
                        {t('submit.selectMarket')}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {MARKET_TYPES.map((market) => (
                          <button
                            key={market.value}
                            type="button"
                            onClick={() => setSelectedMarket(market.value)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                              selectedMarket === market.value
                                ? 'bg-amber-500 text-black'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {market.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Odds */}
                    <div>
                      <label className="block text-white font-medium mb-2">
                        {t('submit.enterOdds')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="1.30"
                        max="10.00"
                        value={odds}
                        onChange={(e) => setOdds(e.target.value)}
                        placeholder="e.g. 1.85"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        required
                      />
                      <p className="text-gray-500 text-sm mt-1">Min 1.30 - Max 10.00</p>
                    </div>

                    {/* Analysis */}
                    <div>
                      <label className="block text-white font-medium mb-2">
                        {t('submit.analysis')}
                      </label>
                      <textarea
                        value={analysis}
                        onChange={(e) => setAnalysis(e.target.value)}
                        placeholder={t('submit.analysisPlaceholder')}
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      />
                    </div>

                    {/* Preview */}
                    {selectedMatch && selectedMarket && odds && (
                      <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                        <h3 className="text-amber-400 font-medium mb-2">{t('submit.preview')}</h3>
                        <div className="text-white">
                          <div>{selectedMatch.home_team} vs {selectedMatch.away_team}</div>
                          <div className="text-gray-400 text-sm">
                            {MARKET_TYPES.find(m => m.value === selectedMarket)?.label} @ {odds}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warning */}
                    <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                      <p className="text-red-400 text-sm">
                        ⚠️ {t('submit.warning')}
                      </p>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting || !selectedMatch || !selectedMarket || !odds}
                      className="w-full py-4 rounded-xl font-semibold text-lg transition bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? '...' : t('submit.confirm')}
                    </button>
                  </form>
                </div>
              )}

              {/* Earnings Tab */}
              {activeTab === 'earnings' && (
                <div className="space-y-6">
                  {/* Payout Setup Card */}
                  <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4">{t('payoutSetup')}</h3>
                    
                    {connectStatus?.payoutsEnabled ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <span className="text-green-400">✓</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{t('payoutsConfigured')}</div>
                          <div className="text-gray-400 text-sm">Account ID: {connectStatus.accountId?.slice(-8)}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-gray-400">
                          Set up your Stripe account to receive monthly commission payouts.
                        </p>
                        <button
                          onClick={handleSetupConnect}
                          disabled={connectLoading}
                          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition disabled:opacity-50"
                        >
                          {connectLoading ? 'Setting up...' : t('setupPayouts')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Earnings Summary */}
                  {payoutData && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-gray-400 text-sm mb-1">{t('allTime')}</div>
                        <div className="text-2xl font-bold text-white">
                          €{payoutData.totals.total.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-gray-400 text-sm mb-1">{t('pendingPayout')}</div>
                        <div className="text-2xl font-bold text-amber-400">
                          €{payoutData.totals.pending.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-gray-400 text-sm mb-1">Paid Out</div>
                        <div className="text-2xl font-bold text-green-400">
                          €{payoutData.totals.paid.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Commission History */}
                  {payoutData && payoutData.commissions.length > 0 && (
                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                      <div className="p-4 border-b border-white/10">
                        <h3 className="text-white font-bold">Commission History</h3>
                      </div>
                      <div className="divide-y divide-white/10">
                        {payoutData.commissions.map((commission) => (
                          <div key={commission.id} className="p-4 flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">
                                {new Date(commission.period_year, commission.period_month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                              </div>
                              <div className="text-gray-400 text-sm">
                                Rank #{commission.rank} • ROI {commission.roi_pct?.toFixed(1)}%
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold">€{commission.net_amount.toFixed(2)}</div>
                              <div className={`text-xs ${commission.paid_at ? 'text-green-400' : 'text-yellow-400'}`}>
                                {commission.paid_at ? 'Paid' : 'Pending'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No History */}
                  {payoutData && payoutData.commissions.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No commission history yet. Keep submitting winning tips!
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
