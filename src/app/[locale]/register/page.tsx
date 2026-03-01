'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    setLoading(true);
    
    // TODO: Implement Supabase auth
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // const { error } = await supabase.auth.signUp({ email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-white">
            👑 TipstersKing
          </Link>
        </div>

        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">{t('register')}</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {loading ? '...' : t('register')}
            </button>
          </form>

          <div className="mt-6 text-center text-gray-400 text-sm">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-green-400 hover:underline">
              {t('login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
