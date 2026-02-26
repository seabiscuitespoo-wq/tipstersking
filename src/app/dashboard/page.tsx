'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface Profile {
  username: string
  display_name: string
}

interface Stats {
  totalBets: number
  wonBets: number
  lostBets: number
  pendingBets: number
  totalStake: number
  totalProfit: number
  roi: number
  winRate: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalBets: 0,
    wonBets: 0,
    lostBets: 0,
    pendingBets: 0,
    totalStake: 0,
    totalProfit: 0,
    roi: 0,
    winRate: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', user.id)
        .single()

      setProfile(profile)

      // Get bets for stats
      const { data: bets } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)

      if (bets && bets.length > 0) {
        const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost')
        const wonBets = bets.filter(b => b.status === 'won')
        const lostBets = bets.filter(b => b.status === 'lost')
        const pendingBets = bets.filter(b => b.status === 'pending')
        
        const totalStake = settledBets.reduce((sum, b) => sum + Number(b.stake), 0)
        const totalProfit = settledBets.reduce((sum, b) => sum + (Number(b.profit_loss) || 0), 0)
        
        setStats({
          totalBets: bets.length,
          wonBets: wonBets.length,
          lostBets: lostBets.length,
          pendingBets: pendingBets.length,
          totalStake,
          totalProfit,
          roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
          winRate: settledBets.length > 0 ? (wonBets.length / settledBets.length) * 100 : 0
        })
      }

      setLoading(false)
    }

    getUser()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
            <div className="flex items-center space-x-4">
              <span className="text-gray-400">
                {profile?.display_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white transition"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-2">
            Welcome back, {profile?.display_name || 'Tipster'}!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-gray-400 text-sm">Total Bets</div>
            <div className="text-3xl font-bold text-white mt-1">{stats.totalBets}</div>
            <div className="text-gray-500 text-xs mt-1">
              {stats.wonBets}W - {stats.lostBets}L - {stats.pendingBets}P
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-gray-400 text-sm">Win Rate</div>
            <div className={`text-3xl font-bold mt-1 ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-gray-400 text-sm">ROI</div>
            <div className={`text-3xl font-bold mt-1 ${stats.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="text-gray-400 text-sm">Profit/Loss</div>
            <div className={`text-3xl font-bold mt-1 ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/dashboard/bets/new"
            className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 rounded-xl p-6 transition group"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition">
              Add New Bet
            </h3>
            <p className="text-gray-400 mt-1">
              Log a new bet and track your performance
            </p>
          </Link>

          <Link
            href="/dashboard/bets"
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition group"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition">
              View All Bets
            </h3>
            <p className="text-gray-400 mt-1">
              See your complete betting history
            </p>
          </Link>

          <Link
            href={`/${profile?.username || ''}`}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition group"
          >
            <div className="text-4xl mb-3">🌐</div>
            <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition">
              View Public Profile
            </h3>
            <p className="text-gray-400 mt-1">
              tipstersking.com/{profile?.username || 'username'}
            </p>
          </Link>

          <Link
            href="/dashboard/stats"
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-6 transition group"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-semibold text-white group-hover:text-purple-300 transition">
              Monthly Stats
            </h3>
            <p className="text-gray-400 mt-1">
              Track your performance month by month
            </p>
          </Link>
        </div>
      </main>
    </div>
  )
}


