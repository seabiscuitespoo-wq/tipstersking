'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { DashboardHeader } from '@/components/DashboardHeader';

interface SubscriberStatus {
  profile: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'cancelled';
    currentPeriodEnd: string;
    cancelledAt: string | null;
    priceAmount: number;
    currency: string;
  } | null;
  telegram: {
    linked: boolean;
    userId: number | null;
    username: string | null;
  };
  vipAccess: boolean;
}

interface LinkingData {
  linkCode: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
}

export default function SubscriberDashboardPage() {
  const t = useTranslations('dashboard.subscriber');
  const tNav = useTranslations('nav');
  
  const [status, setStatus] = useState<SubscriberStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Telegram linking
  const [linkingData, setLinkingData] = useState<LinkingData | null>(null);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/subscriber/status');
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please log in to access your dashboard');
          return;
        }
        throw new Error('Failed to fetch status');
      }
      
      const data = await res.json();
      setStatus(data);
      
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for telegram link status when linking is in progress
  useEffect(() => {
    if (!linkingData || status?.telegram.linked) return;
    
    const interval = setInterval(async () => {
      setCheckingLink(true);
      try {
        const res = await fetch('/api/subscriber/link-telegram');
        const data = await res.json();
        
        if (data.linked) {
          setStatus(prev => prev ? {
            ...prev,
            telegram: {
              linked: true,
              userId: data.telegramUserId,
              username: data.telegramUsername,
            },
            vipAccess: !!prev.subscription && ['active', 'trialing'].includes(prev.subscription.status),
          } : null);
          setLinkingData(null);
        }
      } catch (err) {
        // Ignore polling errors
      } finally {
        setCheckingLink(false);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [linkingData, status?.telegram.linked]);

  const handleConnectTelegram = async () => {
    setLinkingLoading(true);
    
    try {
      const res = await fetch('/api/subscriber/link-telegram', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Failed to generate link');
        return;
      }
      
      setLinkingData(data);
      
    } catch (err) {
      alert('Failed to connect Telegram');
    } finally {
      setLinkingLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { eur: '€', usd: '$', gbp: '£' };
    return `${symbols[currency] || currency}${(amount / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm">{t('active')}</span>;
      case 'trialing':
        return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm">{t('trialing')}</span>;
      case 'past_due':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm">{t('pastDue')}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-sm">{t('cancelled')}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <DashboardHeader title="Subscriber" />

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
            {status && (
              <p className="text-gray-400">
                {status.profile.email}
              </p>
            )}
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
          ) : status ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Subscription Card */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">{t('subscription')}</h2>
                
                {status.subscription ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">{t('status')}</span>
                      {getStatusBadge(status.subscription.status)}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Price</span>
                      <span className="text-white font-medium">
                        {formatPrice(status.subscription.priceAmount, status.subscription.currency)}/mo
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">
                        {status.subscription.cancelledAt ? t('endsOn', { date: '' }) : t('renewsOn', { date: '' })}
                      </span>
                      <span className="text-white">
                        {formatDate(status.subscription.currentPeriodEnd)}
                      </span>
                    </div>
                    
                    <hr className="border-white/10" />
                    
                    <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition">
                      {t('manageBilling')}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-400 mb-4">{t('vipInactive')}</p>
                    <Link
                      href="/pricing"
                      className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition"
                    >
                      Subscribe Now
                    </Link>
                  </div>
                )}
              </div>

              {/* Telegram Card */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">Telegram Access</h2>
                
                {status.telegram.linked ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📱</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          @{status.telegram.username || 'Connected'}
                        </div>
                        <div className="text-green-400 text-sm">{t('telegramConnected')}</div>
                      </div>
                    </div>
                    
                    {status.vipAccess ? (
                      <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-400">
                          <span>✓</span>
                          <span>{t('vipActive')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                        <div className="text-yellow-400 text-sm">
                          Subscribe to access the VIP channel
                        </div>
                      </div>
                    )}
                  </div>
                ) : linkingData ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                      <p className="text-blue-400 text-sm mb-3">
                        Click the button below to open Telegram and link your account:
                      </p>
                      
                      <a
                        href={linkingData.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-center transition"
                      >
                        Open @{linkingData.botUsername}
                      </a>
                      
                      <p className="text-gray-500 text-xs mt-3 text-center">
                        Code: <span className="font-mono text-white">{linkingData.linkCode}</span>
                        {checkingLink && <span className="ml-2">Checking...</span>}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setLinkingData(null)}
                      className="w-full py-2 bg-white/10 hover:bg-white/20 text-gray-400 rounded-lg transition text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      {t('telegramNotConnected')}
                    </p>
                    
                    <button
                      onClick={handleConnectTelegram}
                      disabled={linkingLoading || !status.subscription}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {linkingLoading ? 'Generating...' : t('connectTelegram')}
                    </button>
                    
                    {!status.subscription && (
                      <p className="text-yellow-400 text-xs text-center">
                        Subscribe first to connect Telegram
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* VIP Access Card */}
              <div className="md:col-span-2 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl p-6 border border-amber-500/20">
                <h2 className="text-xl font-bold text-white mb-4">{t('vipAccess')}</h2>
                
                {status.vipAccess ? (
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">👑</div>
                      <div>
                        <div className="text-white font-medium text-lg">{t('vipActive')}</div>
                        <div className="text-gray-400 text-sm">Real-time tips from all tipsters</div>
                      </div>
                    </div>
                    
                    <a
                      href="https://t.me/TipstersKingVIP"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition"
                    >
                      Open VIP Channel
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-4">
                      {!status.subscription 
                        ? 'Subscribe to get VIP access'
                        : !status.telegram.linked
                        ? 'Connect your Telegram to access the VIP channel'
                        : 'Complete setup to access VIP channel'
                      }
                    </p>
                    
                    <div className="flex justify-center gap-4">
                      {!status.subscription && (
                        <Link
                          href="/pricing"
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition"
                        >
                          Subscribe
                        </Link>
                      )}
                      {status.subscription && !status.telegram.linked && (
                        <button
                          onClick={handleConnectTelegram}
                          disabled={linkingLoading}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition"
                        >
                          Connect Telegram
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                  href="https://t.me/TipstersKingFree"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 text-center transition"
                >
                  <div className="text-2xl mb-2">📢</div>
                  <div className="text-white font-medium">Free Channel</div>
                  <div className="text-gray-500 text-xs">2h delayed tips</div>
                </a>
                
                <Link
                  href="/leaderboard"
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 text-center transition"
                >
                  <div className="text-2xl mb-2">🏆</div>
                  <div className="text-white font-medium">Leaderboard</div>
                  <div className="text-gray-500 text-xs">Top tipsters</div>
                </Link>
                
                <Link
                  href="/"
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 text-center transition"
                >
                  <div className="text-2xl mb-2">❓</div>
                  <div className="text-white font-medium">FAQ</div>
                  <div className="text-gray-500 text-xs">Common questions</div>
                </Link>
                
                <a
                  href="mailto:support@tipstersking.com"
                  className="bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/10 text-center transition"
                >
                  <div className="text-2xl mb-2">💬</div>
                  <div className="text-white font-medium">Support</div>
                  <div className="text-gray-500 text-xs">Get help</div>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition"
              >
                Log in to continue
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
