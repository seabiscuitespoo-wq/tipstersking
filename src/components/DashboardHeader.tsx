'use client';

import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { LocaleSwitcher } from './LocaleSwitcher';
import { supabase } from '@/lib/supabase';

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title }: DashboardHeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="bg-slate-800/50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-white">
              👑 TipstersKing
            </Link>
            {title && (
              <span className="text-gray-400 text-lg hidden sm:inline">
                / {title}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition disabled:opacity-50"
            >
              {loggingOut ? '...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
