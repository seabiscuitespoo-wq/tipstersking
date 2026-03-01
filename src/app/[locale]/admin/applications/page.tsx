'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface Application {
  id: number;
  email: string;
  alias: string;
  telegram_username: string;
  leagues: string[];
  experience: string;
  track_record_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function AdminApplicationsPage() {
  const t = useTranslations('admin.applications');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processing, setProcessing] = useState<number | null>(null);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/admin/applications?status=${filter}`);
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Please log in to access this page');
        } else if (res.status === 403) {
          setError('You do not have admin access');
        } else {
          setError(data.error || 'Failed to load applications');
        }
        return;
      }
      
      setApplications(data.applications);
    } catch (err) {
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleAction = async (applicationId: number, action: 'approve' | 'reject') => {
    setProcessing(applicationId);
    
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          action,
          adminNotes: adminNotes || undefined
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Action failed');
        return;
      }
      
      // Refresh list
      fetchApplications();
      setSelectedApp(null);
      setAdminNotes('');
      
    } catch (err) {
      alert('Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            <div className="text-amber-400 font-medium">
              Admin Panel
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
            <p className="text-gray-400">{t('subtitle')}</p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === status
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {t(`filter.${status}`)}
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
            <div className="text-center py-12 text-gray-400">
              Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {t('empty')}
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className={`bg-white/5 rounded-xl border border-white/10 p-6 ${
                    selectedApp?.id === app.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Main info */}
                    <div className="flex-1 min-w-[300px]">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">{app.alias}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          app.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div className="text-gray-400">
                          📧 {app.email}
                        </div>
                        <div className="text-gray-400">
                          📱 @{app.telegram_username}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {app.leagues.map((league) => (
                          <span
                            key={league}
                            className="px-2 py-0.5 bg-white/5 rounded text-xs text-gray-400"
                          >
                            {league}
                          </span>
                        ))}
                      </div>
                      
                      <div className="text-gray-500 text-sm">
                        {t('appliedOn')}: {formatDate(app.created_at)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition"
                      >
                        {selectedApp?.id === app.id ? 'Close' : 'View Details'}
                      </button>
                      
                      {app.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(app.id, 'approve')}
                            disabled={processing === app.id}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition disabled:opacity-50"
                          >
                            {processing === app.id ? '...' : t('action.approve')}
                          </button>
                          <button
                            onClick={() => handleAction(app.id, 'reject')}
                            disabled={processing === app.id}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition disabled:opacity-50"
                          >
                            {processing === app.id ? '...' : t('action.reject')}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {selectedApp?.id === app.id && (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
                      <div>
                        <h4 className="text-amber-400 font-medium mb-2">{t('experience')}</h4>
                        <p className="text-gray-300 whitespace-pre-wrap">{app.experience}</p>
                      </div>
                      
                      {app.track_record_url && (
                        <div>
                          <h4 className="text-amber-400 font-medium mb-2">{t('trackRecord')}</h4>
                          <a
                            href={app.track_record_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline break-all"
                          >
                            {app.track_record_url}
                          </a>
                        </div>
                      )}
                      
                      {app.status === 'pending' && (
                        <div>
                          <h4 className="text-amber-400 font-medium mb-2">{t('adminNotes')}</h4>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder={t('adminNotesPlaceholder')}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                          />
                        </div>
                      )}
                      
                      {app.admin_notes && app.status !== 'pending' && (
                        <div>
                          <h4 className="text-amber-400 font-medium mb-2">{t('adminNotes')}</h4>
                          <p className="text-gray-400">{app.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
