'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Bet {
  id: string
  event_name: string
  selection: string
  odds: number
  stake: number
  status: 'pending' | 'won' | 'lost' | 'void'
  profit_loss: number | null
  sport: string | null
  bookmaker: string | null
  screenshot_url: string | null
  created_at: string
}

export default function BetsPage() {
  const [bets, setBets] = useState<Bet[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchBets()
  }, [])

  const fetchBets = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bets:', error)
    } else {
      setBets(data || [])
    }
    setLoading(false)
  }

  const updateBetStatus = async (betId: string, status: 'won' | 'lost' | 'void') => {
    setUpdating(betId)
    
    const { error } = await supabase
      .from('bets')
      .update({ status })
      .eq('id', betId)

    if (error) {
      console.error('Error updating bet:', error)
    } else {
      fetchBets()
    }
    setUpdating(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-green-400 bg-green-400/10'
      case 'lost': return 'text-red-400 bg-red-400/10'
      case 'void': return 'text-gray-400 bg-gray-400/10'
      default: return 'text-yellow-400 bg-yellow-400/10'
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 transition text-sm">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white mt-4">Your Bets</h1>
          </div>
          <Link
            href="/dashboard/bets/new"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition font-semibold"
          >
            + Add Bet
          </Link>
        </div>

        {bets.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-12 border border-white/10 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-semibold text-white mb-2">No bets yet</h2>
            <p className="text-gray-400 mb-6">Start tracking your bets to see your ROI</p>
            <Link
              href="/dashboard/bets/new"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg transition font-semibold inline-block"
            >
              Add Your First Bet
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getStatusColor(bet.status)}`}>
                        {bet.status}
                      </span>
                      {bet.screenshot_url && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-400/10 text-green-400 flex items-center gap-1">
                          🏅 Verified
                        </span>
                      )}
                      {bet.sport && (
                        <span className="text-gray-500 text-sm">{bet.sport}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white">{bet.event_name}</h3>
                    <p className="text-purple-400">{bet.selection}</p>
                    <p className="text-gray-500 text-sm mt-1">{formatDate(bet.created_at)}</p>
                  </div>

                  {bet.screenshot_url && (
                    <a
                      href={bet.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden md:block"
                    >
                      <img 
                        src={bet.screenshot_url} 
                        alt="Odds screenshot" 
                        className="h-16 w-24 object-cover rounded-lg border border-white/10 hover:border-purple-500 transition"
                      />
                    </a>
                  )}

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Odds</div>
                      <div className="text-white font-semibold">{bet.odds}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">Stake</div>
                      <div className="text-white font-semibold">${bet.stake}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500 text-xs">P/L</div>
                      <div className={`font-semibold ${
                        bet.profit_loss === null ? 'text-gray-400' :
                        bet.profit_loss > 0 ? 'text-green-400' :
                        bet.profit_loss < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {bet.profit_loss === null ? '-' : 
                         bet.profit_loss > 0 ? `+$${bet.profit_loss.toFixed(2)}` : 
                         `$${bet.profit_loss.toFixed(2)}`}
                      </div>
                    </div>
                  </div>

                  {bet.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBetStatus(bet.id, 'won')}
                        disabled={updating === bet.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition text-sm font-medium"
                      >
                        Won
                      </button>
                      <button
                        onClick={() => updateBetStatus(bet.id, 'lost')}
                        disabled={updating === bet.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition text-sm font-medium"
                      >
                        Lost
                      </button>
                      <button
                        onClick={() => updateBetStatus(bet.id, 'void')}
                        disabled={updating === bet.id}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition text-sm font-medium"
                      >
                        Void
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}


