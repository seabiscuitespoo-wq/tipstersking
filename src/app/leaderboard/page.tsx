'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface TipsterStats {
  username: string
  display_name: string
  totalBets: number
  wonBets: number
  totalStake: number
  totalProfit: number
  roi: number
  winRate: number
  verifiedBets: number
}

export default function LeaderboardPage() {
  const [tipsters, setTipsters] = useState<TipsterStats[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'roi' | 'profit' | 'winRate' | 'bets'>('roi')

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    // Get all profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')

    if (!profiles) {
      setLoading(false)
      return
    }

    const tipsterStats: TipsterStats[] = []

    for (const profile of profiles) {
      const { data: bets } = await supabase
        .from('bets')
        .select('status, stake, profit_loss, screenshot_url')
        .eq('user_id', profile.id)

      if (bets && bets.length >= 5) { // Minimum 5 bets to appear
        const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost')
        const wonBets = bets.filter(b => b.status === 'won')
        const verifiedBets = bets.filter(b => b.screenshot_url).length
        
        const totalStake = settledBets.reduce((sum, b) => sum + Number(b.stake), 0)
        const totalProfit = settledBets.reduce((sum, b) => sum + (Number(b.profit_loss) || 0), 0)

        tipsterStats.push({
          username: profile.username,
          display_name: profile.display_name || profile.username,
          totalBets: bets.length,
          wonBets: wonBets.length,
          totalStake,
          totalProfit,
          roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
          winRate: settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0,
          verifiedBets
        })
      }
    }

    setTipsters(tipsterStats)
    setLoading(false)
  }

  const sortedTipsters = [...tipsters].sort((a, b) => {
    switch (sortBy) {
      case 'roi': return b.roi - a.roi
      case 'profit': return b.totalProfit - a.totalProfit
      case 'winRate': return b.winRate - a.winRate
      case 'bets': return b.totalBets - a.totalBets
      default: return 0
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              👑 TipstersKing
            </Link>
            <div className="space-x-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                Login
              </Link>
              <Link 
                href="/register" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
              >
                Start Free
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">🏆 Leaderboard</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Top performing tipsters ranked by ROI. Minimum 5 bets required to appear.
          </p>
        </div>

        {/* Sort buttons */}
        <div className="flex justify-center gap-2 mb-8">
          {[
            { key: 'roi', label: 'ROI' },
            { key: 'profit', label: 'Profit' },
            { key: 'winRate', label: 'Win Rate' },
            { key: 'bets', label: 'Total Bets' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as typeof sortBy)}
              className={`px-4 py-2 rounded-lg transition ${
                sortBy === key 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {sortedTipsters.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-white/10 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No tipsters yet</h2>
            <p className="text-gray-400 mb-6">Be the first to join the leaderboard!</p>
            <Link
              href="/register"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition font-semibold inline-block"
            >
              Get Started
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTipsters.map((tipster, index) => (
              <Link
                key={tipster.username}
                href={`/${tipster.username}`}
                className="block bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition"
              >
                <div className="flex items-center gap-6">
                  {/* Rank */}
                  <div className="text-3xl font-bold text-gray-500 w-12 text-center">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </div>

                  {/* Avatar placeholder */}
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {tipster.display_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{tipster.display_name}</h3>
                      {tipster.verifiedBets > 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-400/10 text-green-400">
                          🏅 {tipster.verifiedBets} verified
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-sm">@{tipster.username}</p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Bets</div>
                      <div className="text-white font-semibold">{tipster.totalBets}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Win Rate</div>
                      <div className={`font-semibold ${tipster.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {tipster.winRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">ROI</div>
                      <div className={`font-semibold ${tipster.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tipster.roi >= 0 ? '+' : ''}{tipster.roi.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Profit</div>
                      <div className={`font-semibold ${tipster.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tipster.totalProfit >= 0 ? '+' : ''}${tipster.totalProfit.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
