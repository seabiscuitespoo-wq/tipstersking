'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewBetPage() {
  const [eventName, setEventName] = useState('')
  const [selection, setSelection] = useState('')
  const [odds, setOdds] = useState('')
  const [stake, setStake] = useState('')
  const [sport, setSport] = useState('')
  const [bookmaker, setBookmaker] = useState('')
  const [notes, setNotes] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScreenshot(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    let screenshotUrl = null

    // Upload screenshot if provided
    if (screenshot) {
      const fileExt = screenshot.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('bet-screenshots')
        .upload(fileName, screenshot)

      if (uploadError) {
        setError('Failed to upload screenshot: ' + uploadError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('bet-screenshots')
        .getPublicUrl(fileName)
      
      screenshotUrl = publicUrl
    }

    const { error } = await supabase
      .from('bets')
      .insert({
        user_id: user.id,
        event_name: eventName,
        selection,
        odds: parseFloat(odds),
        stake: parseFloat(stake),
        sport: sport || null,
        bookmaker: bookmaker || null,
        notes: notes || null,
        screenshot_url: screenshotUrl,
        status: 'pending'
      })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard/bets')
    }
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

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="mb-8">
          <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 transition text-sm">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white mt-4">Add New Bet</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event / Match *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. Liverpool vs Manchester United"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Selection / Tip *
              </label>
              <input
                type="text"
                value={selection}
                onChange={(e) => setSelection(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. Liverpool to win, Over 2.5 goals"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Odds *
              </label>
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={odds}
                onChange={(e) => setOdds(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. 2.10"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stake ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. 100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select sport</option>
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="tennis">Tennis</option>
                <option value="hockey">Hockey</option>
                <option value="baseball">Baseball</option>
                <option value="mma">MMA/Boxing</option>
                <option value="esports">Esports</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bookmaker
              </label>
              <input
                type="text"
                value={bookmaker}
                onChange={(e) => setBookmaker(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. Bet365, Unibet"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Any additional notes about this bet..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                📸 Odds Screenshot (optional)
              </label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-purple-500/50 transition">
                {screenshotPreview ? (
                  <div className="space-y-4">
                    <img 
                      src={screenshotPreview} 
                      alt="Screenshot preview" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => { setScreenshot(null); setScreenshotPreview(null); }}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Remove screenshot
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="text-4xl mb-2">📷</div>
                    <p className="text-gray-400 mb-2">Upload odds screenshot for verification</p>
                    <p className="text-gray-500 text-sm">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                    <span className="inline-block mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition">
                      Choose file
                    </span>
                  </label>
                )}
              </div>
              <p className="text-green-400/70 text-xs mt-2">
                🏅 Verified badge: Bets with screenshots get a verified badge on your profile
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Adding...' : 'Add Bet'}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 rounded-lg transition text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
