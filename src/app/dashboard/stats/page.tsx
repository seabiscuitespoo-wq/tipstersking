'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface MonthlyStats {
  month: string
  year: number
  totalBets: number
  wonBets: number
  lostBets: number
  totalStake: number
  totalProfit: number
  roi: number
  winRate: number
}

interface Bet {
  status: string
  stake: number
  profit_loss: number | null
  created_at: string
}

export default function StatsPage() {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: bets } = await supabase
      .from('bets')
      .select('status, stake, profit_loss, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (bets && bets.length > 0) {
      const statsByMonth = new Map<string, MonthlyStats>()

      bets.forEach((bet: Bet) => {
        const date = new Date(bet.created_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthName = date.toLocaleString('en-US', { month: 'short' })
        
        if (!statsByMonth.has(key)) {
          statsByMonth.set(key, {
            month: monthName,
            year: date.getFullYear(),
            totalBets: 0,
            wonBets: 0,
            lostBets: 0,
            totalStake: 0,
            totalProfit: 0,
            roi: 0,
            winRate: 0
          })
        }

        const stats = statsByMonth.get(key)!
        stats.totalBets++
        
        if (bet.status === 'won') {
          stats.wonBets++
          stats.totalStake += Number(bet.stake)
          stats.totalProfit += Number(bet.profit_loss) || 0
        } else if (bet.status === 'lost') {
          stats.lostBets++
          stats.totalStake += Number(bet.stake)
          stats.totalProfit += Number(bet.profit_loss) || 0
        }
      })

      // Calculate ROI and win rate
      statsByMonth.forEach((stats) => {
        const settledBets = stats.wonBets + stats.lostBets
        stats.winRate = settledBets > 0 ? (stats.wonBets / settledBets) * 100 : 0
        stats.roi = stats.totalStake > 0 ? (stats.totalProfit / stats.totalStake) * 100 : 0
      })

      // Sort by date descending
      const sortedStats = Array.from(statsByMonth.values()).sort((a, b) => {
        const dateA = new Date(`${a.year}-${a.month}-01`)
        const dateB = new Date(`${b.year}-${b.month}-01`)
        return dateB.getTime() - dateA.getTime()
      })

      setMonthlyStats(sortedStats)
    }

    setLoading(false)
  }

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
            <Link href="/dashboard" className="text-2xl font-bold text-white">
              👑 TipstersKing
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 transition text-sm">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">📊 Monthly Statistics</h1>
          <p className="text-gray-400 mt-2">Track your performance over time</p>
        </div>

        {monthlyStats.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-white/10 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No data yet</h2>
            <p className="text-gray-400 mb-6">Start adding bets to see your monthly breakdown</p>
            <Link
              href="/dashboard/bets/new"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition font-semibold inline-block"
            >
              Add Your First Bet
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {monthlyStats.map((stats, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {stats.month} {stats.year}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {stats.totalBets} bets ({stats.wonBets}W - {stats.lostBets}L)
                    </p>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Win Rate</div>
                      <div className={`text-xl font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.winRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">ROI</div>
                      <div className={`text-xl font-bold ${stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Profit/Loss</div>
                      <div className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Staked</div>
                      <div className="text-xl font-bold text-white">
                        ${stats.totalStake.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${stats.roi >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(stats.roi) + 50, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


