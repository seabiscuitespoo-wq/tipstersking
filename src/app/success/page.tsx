"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuloidaan lataus
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
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
                Käsitellään tilausta...
              </h1>
              <p className="text-gray-400">
                Odota hetki
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
                Tervetuloa! 🎉
              </h1>
              <p className="text-gray-300 mb-8">
                Tilauksesi on vahvistettu. Saat pian kutsun premium-kanaville.
              </p>

              <div className="bg-white/5 rounded-xl p-4 mb-8 text-left">
                <h2 className="text-white font-semibold mb-3">Seuraavat askeleet:</h2>
                <ul className="space-y-3 text-gray-300 text-sm">
                  <li className="flex items-start">
                    <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                    Tarkista sähköpostisi — lähetimme vahvistuksen
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                    Klikkaa Telegram-kutsulinkiä liittyäksesi kanavalle
                  </li>
                  <li className="flex items-start">
                    <span className="bg-purple-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                    Ota ilmoitukset käyttöön, niin et missaa tipsejä!
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <a 
                  href="https://t.me/tipstersking" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-[#0088cc] hover:bg-[#0077b5] text-white py-3 rounded-xl font-semibold transition"
                >
                  📱 Avaa Telegram
                </a>
                <Link 
                  href="/dashboard"
                  className="block w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-semibold transition"
                >
                  Dashboard →
                </Link>
              </div>

              {sessionId && (
                <p className="mt-6 text-gray-500 text-xs">
                  Tilausnumero: {sessionId.slice(0, 20)}...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
