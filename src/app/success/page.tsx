"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-md w-full mx-4">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
        {loading ? (
          <>
            <div className="w-16 h-16 mx-auto mb-6">
              <svg className="animate-spin text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Processing your order...
            </h1>
            <p className="text-gray-400">
              Please wait a moment
            </p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome! 🎉
            </h1>
            <p className="text-gray-300 mb-8">
              Your subscription is confirmed. You'll receive an invite to the premium channel shortly.
            </p>

            <div className="bg-white/5 rounded-xl p-4 mb-8 text-left">
              <h2 className="text-white font-semibold mb-3">Next steps:</h2>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start">
                  <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                  Check your email — we've sent a confirmation
                </li>
                <li className="flex items-start">
                  <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                  Click the Telegram invite link to join the channel
                </li>
                <li className="flex items-start">
                  <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                  Turn on notifications so you don't miss any tips!
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <a 
                href="https://t.me/+V8eVUct3p3ZhYTlk" 
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#0088cc] hover:bg-[#0077b5] text-white py-3 rounded-xl font-semibold transition"
              >
                <svg className="w-5 h-5 inline mr-2 -mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Join on Telegram
              </a>
              
              <Link 
                href="/dashboard"
                className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold transition"
              >
                Dashboard →
              </Link>
            </div>

            {/* Desktop/no Telegram help */}
            <div className="mt-6 p-4 bg-white/5 rounded-xl text-left">
              <p className="text-gray-400 text-sm mb-2">
                <strong className="text-white">Don't have Telegram?</strong>
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>1. Download Telegram: <a href="https://telegram.org/apps" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">telegram.org/apps</a></li>
                <li>2. Create an account</li>
                <li>3. Click the join button above (or use link below)</li>
              </ul>
              <div className="mt-3 p-2 bg-white/5 rounded text-center">
                <p className="text-gray-500 text-xs mb-1">Save this invite link:</p>
                <code className="text-purple-400 text-xs break-all select-all">https://t.me/+V8eVUct3p3ZhYTlk</code>
              </div>
            </div>

            {sessionId && (
              <p className="mt-6 text-gray-500 text-xs">
                Order ID: {sessionId.slice(0, 20)}...
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      <Suspense fallback={
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          Loading...
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
