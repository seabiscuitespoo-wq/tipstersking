'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Application {
  id: number;
  profile_id: string;
  alias: string;
  email: string;
  status: string;
  leagues: string[];
  experience: string;
  trackRecord?: string;
  telegram: string;
  created_at: string;
  appliedAt?: string;
}

type TabStatus = 'pending' | 'approved' | 'rejected';

export default function AdminApplicationsPage() {
  const t = useTranslations('dashboard.admin');
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [processing, setProcessing] = useState<number | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check for saved admin key
    const savedKey = localStorage.getItem('adminKey');
    if (savedKey) {
      setAdminKey(savedKey);
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchApplications();
    }
  }, [activeTab, authenticated]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applications?status=${activeTab}`, {
        headers: {
          'x-admin-key': adminKey,
        },
      });

      if (res.status === 401) {
        setAuthenticated(false);
        localStorage.removeItem('adminKey');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setApplications(data);
    } catch (error) {
      console.error('Fetch error:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!confirm(`${action === 'approve' ? t('confirmApprove') : t('confirmReject')}`)) {
      return;
    }

    setProcessing(id);
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ tipsterProfileId: id, action }),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Refresh list
      fetchApplications();
    } catch (error) {
      console.error('Action error:', error);
      alert('Failed to process action');
    } finally {
      setProcessing(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey) {
      localStorage.setItem('adminKey', adminKey);
      setAuthenticated(true);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin API key"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white mb-4"
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-white">
              👑 TipstersKing
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">Admin Panel</span>
              <button
                onClick={() => {
                  localStorage.removeItem('adminKey');
                  setAuthenticated(false);
                  setAdminKey('');
                }}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">{t('title')}</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {(['pending', 'approved', 'rejected'] as TabStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-medium transition ${
                activeTab === tab
                  ? 'bg-green-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center border border-white/10">
            <p className="text-gray-400">{t('noApplications')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white/5 rounded-xl p-6 border border-white/10"
              >
                <div className="flex flex-wrap justify-between items-start gap-4">
                  {/* Left side: Info */}
                  <div className="flex-1 min-w-[300px]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {app.alias.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white">{app.alias}</h3>
                        <p className="text-gray-400 text-sm">{app.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">{t('leagues')}:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {app.leagues?.map((league) => (
                            <span
                              key={league}
                              className="px-2 py-0.5 bg-white/10 text-gray-300 rounded text-xs"
                            >
                              {league}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Telegram:</span>
                        <p className="text-white">{app.telegram}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <span className="text-gray-500 text-sm">{t('note')}:</span>
                      <p className="text-gray-300 text-sm mt-1 bg-white/5 rounded p-3">
                        {app.experience}
                      </p>
                    </div>

                    {app.trackRecord && (
                      <div className="mb-3">
                        <span className="text-gray-500 text-sm">Track Record:</span>
                        <a
                          href={app.trackRecord}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:underline text-sm block"
                        >
                          {app.trackRecord}
                        </a>
                      </div>
                    )}

                    <p className="text-gray-500 text-xs">
                      {t('appliedAt')}: {new Date(app.appliedAt || app.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Right side: Actions */}
                  {activeTab === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(app.id, 'approve')}
                        disabled={processing === app.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                      >
                        {processing === app.id ? '...' : t('approve')} ✅
                      </button>
                      <button
                        onClick={() => handleAction(app.id, 'reject')}
                        disabled={processing === app.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                      >
                        {processing === app.id ? '...' : t('reject')} ❌
                      </button>
                    </div>
                  )}

                  {activeTab !== 'pending' && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      activeTab === 'approved' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {activeTab === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
