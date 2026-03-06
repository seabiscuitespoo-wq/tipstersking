"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

interface SetupData {
  valid: boolean;
  email: string;
  profileId: string;
  needsPassword: boolean;
  subscriptionStatus?: string;
  telegramLinked?: boolean;
  telegramUsername?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [telegramBotLink, setTelegramBotLink] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Missing session ID");
      setLoading(false);
      return;
    }
    
    // Fetch setup data
    fetch(`/api/auth/setup?session_id=${sessionId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setSetupData(data);
          // Generate Telegram deep link with profileId for auto-verification
          if (data.profileId) {
            setTelegramBotLink(`https://t.me/TipstersKingBot?start=verify_${data.profileId}`);
          }
          // If password already set, skip to step 2
          if (!data.needsPassword) {
            setSetupComplete(true);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to load session data");
        setLoading(false);
      });
  }, [sessionId]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          password,
          username: username || undefined
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setSetupComplete(true);
        // Use profileId deep link for auto-verification
        if (setupData?.profileId) {
          setTelegramBotLink(`https://t.me/TipstersKingBot?start=verify_${setupData.profileId}`);
        } else {
          setTelegramBotLink(data.telegramBotLink || 'https://t.me/TipstersKingBot');
        }
      }
    } catch (err) {
      setError("Setup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
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
        </div>
      </div>
    );
  }

  if (error && !setupData) {
    return (
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href="/pricing" className="text-purple-400 hover:underline">
            Return to pricing
          </Link>
        </div>
      </div>
    );
  }

  // Step 1: Account Setup (password)
  if (!setupComplete && setupData?.needsPassword) {
    return (
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            Payment Successful! 🎉
          </h1>
          <p className="text-gray-300 text-center mb-6">
            Complete your account setup to access premium tips
          </p>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">1</div>
              <span className="ml-2 text-white text-sm">Account</span>
            </div>
            <div className="w-8 h-px bg-gray-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-gray-600 text-gray-400 flex items-center justify-center text-sm">2</div>
              <span className="ml-2 text-gray-400 text-sm">Telegram</span>
            </div>
          </div>
          
          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">Email</label>
              <input
                type="email"
                value={setupData?.email || ""}
                disabled
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Username (optional)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="How others will see you"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Type your password again"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-xl font-semibold transition flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting up...
                </>
              ) : (
                "Complete Setup →"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Step 2: Telegram Connection (after password is set)
  return (
    <div className="max-w-md w-full mx-4">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">
          You're all set! 🎉
        </h1>
        <p className="text-gray-300 mb-6">
          Your account is ready. Now connect Telegram to receive real-time tips.
        </p>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
            <span className="ml-2 text-green-400 text-sm">Account</span>
          </div>
          <div className="w-8 h-px bg-purple-500"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-semibold">2</div>
            <span className="ml-2 text-white text-sm">Telegram</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
          <h2 className="text-white font-semibold mb-3">How to get your tips:</h2>
          <ul className="space-y-3 text-gray-300 text-sm">
            <li className="flex items-start">
              <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
              Open our Telegram bot
            </li>
            <li className="flex items-start">
              <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
              Click "Start" and verify your account
            </li>
            <li className="flex items-start">
              <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
              Get instant access to the VIP channel!
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <a 
            href={telegramBotLink || "https://t.me/TipstersKingBot"}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-[#0088cc] hover:bg-[#0077b5] text-white py-3 rounded-xl font-semibold transition"
          >
            <svg className="w-5 h-5 inline mr-2 -mt-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Open TipstersKing Bot
          </a>
          
          <Link 
            href="/dashboard"
            className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold transition"
          >
            Go to Dashboard →
          </Link>
        </div>

        {/* QR code for mobile */}
        <div className="mt-6 p-4 bg-white/5 rounded-xl">
          <p className="text-white font-semibold mb-3">📱 On desktop? Scan with your phone:</p>
          <div className="bg-white p-3 rounded-xl inline-block mb-3">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(telegramBotLink || "https://t.me/TipstersKingBot")}`}
              alt="Telegram Bot QR Code"
              width={150}
              height={150}
              className="block"
            />
          </div>
        </div>

        {/* Help section */}
        <div className="mt-4 p-4 bg-white/5 rounded-xl text-left">
          <p className="text-gray-400 text-sm mb-2">
            <strong className="text-white">Don't have Telegram?</strong>
          </p>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>1. Download Telegram: <a href="https://telegram.org/apps" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">telegram.org/apps</a></li>
            <li>2. Create an account</li>
            <li>3. Click the button above to connect</li>
          </ul>
        </div>

        {sessionId && (
          <p className="mt-6 text-gray-500 text-xs">
            Order ID: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12">
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
