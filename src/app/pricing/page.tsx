"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Tier configuration
const TIER_CONFIG = {
  founding: {
    maxSpots: 50,
    priceId: "price_1T5O9cAaocVx6MDwOODjnjGO",
    price: "7,90",
    name: "Founding Member",
    badge: "🏆 Ikuisesti",
    description: "Ensimmäiset 50 tilaajaa",
  },
  earlyBird: {
    maxSpots: 100, // 51-100
    priceId: "price_1T5O9jAaocVx6MDwDuyNYIoO", 
    price: "14,90",
    name: "Early Bird",
    badge: "⭐ Ikuisesti",
    description: "Tilaajat 51-100",
  },
  premium: {
    maxSpots: null, // unlimited
    priceId: "price_1T4yWcAaocVx6MDwOosccZG3",
    price: "29,90",
    name: "Premium",
    badge: null,
    description: "Normaalihinta",
  },
};

const FEATURES = [
  "Kaikki premium-tipsit",
  "Telegram-kanava",
  "Reaaliaikaiset ilmoitukset",
  "ROI-tilastot",
  "Yhteisö-chat",
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  
  // Determine which tier is currently available
  const getCurrentTier = () => {
    if (subscriberCount < 50) return "founding";
    if (subscriberCount < 100) return "earlyBird";
    return "premium";
  };

  const currentTier = getCurrentTier();
  const currentConfig = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG];

  // Calculate spots left for current tier
  const getSpotsLeft = () => {
    if (currentTier === "founding") return 50 - subscriberCount;
    if (currentTier === "earlyBird") return 100 - subscriberCount;
    return null;
  };

  const spotsLeft = getSpotsLeft();

  // TODO: Fetch actual subscriber count from API
  useEffect(() => {
    // For now, simulate with 0 subscribers
    // Later: fetch("/api/subscribers/count").then(r => r.json()).then(d => setSubscriberCount(d.count))
    setSubscriberCount(0);
  }, []);

  const handleSubscribe = async (priceId: string) => {
    setLoading(priceId);
    
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          tipsterSlug: "tipstersking",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Virhe: " + (data.error || "Tuntematon virhe"));
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Jokin meni pieleen. Yritä uudelleen.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white">
            👑 TipstersKing
          </Link>
          <div className="space-x-4">
            <Link href="/leaderboard" className="text-gray-300 hover:text-white transition">
              Leaderboard
            </Link>
            <Link href="/login" className="text-gray-300 hover:text-white transition">
              Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Pricing */}
      <main className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Early Bird -hinnoittelu
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Ensimmäiset 100 tilaajaa saavat pysyvästi halvemman hinnan
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>🏆 Founding (1-50)</span>
            <span>⭐ Early Bird (51-100)</span>
            <span>👑 Premium (101+)</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${Math.min(subscriberCount, 100)}%` }}
            />
          </div>
          <div className="text-center mt-2 text-white font-medium">
            {subscriberCount}/100 early bird -paikkaa täytetty
          </div>
        </div>

        {/* Pricing tiers comparison */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Founding */}
            <div className={`p-6 rounded-xl ${currentTier === "founding" ? "bg-yellow-500/20 border-2 border-yellow-500" : "bg-white/5 opacity-50"}`}>
              <div className="text-yellow-400 text-sm font-semibold mb-1">🏆 FOUNDING MEMBER</div>
              <div className="text-3xl font-bold text-white">7,90€</div>
              <div className="text-gray-400 text-sm">/kk ikuisesti</div>
              <div className="text-xs text-gray-500 mt-2">Paikat 1-50</div>
              {currentTier === "founding" && (
                <div className="mt-3 text-yellow-400 text-sm font-medium">
                  ⚡ {spotsLeft} paikkaa jäljellä!
                </div>
              )}
              {currentTier !== "founding" && subscriberCount >= 50 && (
                <div className="mt-3 text-gray-500 text-sm">✓ Loppuunmyyty</div>
              )}
            </div>

            {/* Early Bird */}
            <div className={`p-6 rounded-xl ${currentTier === "earlyBird" ? "bg-purple-500/20 border-2 border-purple-500" : "bg-white/5 opacity-50"}`}>
              <div className="text-purple-400 text-sm font-semibold mb-1">⭐ EARLY BIRD</div>
              <div className="text-3xl font-bold text-white">14,90€</div>
              <div className="text-gray-400 text-sm">/kk ikuisesti</div>
              <div className="text-xs text-gray-500 mt-2">Paikat 51-100</div>
              {currentTier === "earlyBird" && (
                <div className="mt-3 text-purple-400 text-sm font-medium">
                  ⚡ {spotsLeft} paikkaa jäljellä!
                </div>
              )}
              {currentTier === "founding" && (
                <div className="mt-3 text-gray-500 text-sm">Avautuu kun Founding täynnä</div>
              )}
              {currentTier === "premium" && (
                <div className="mt-3 text-gray-500 text-sm">✓ Loppuunmyyty</div>
              )}
            </div>

            {/* Premium */}
            <div className={`p-6 rounded-xl ${currentTier === "premium" ? "bg-pink-500/20 border-2 border-pink-500" : "bg-white/5 opacity-50"}`}>
              <div className="text-pink-400 text-sm font-semibold mb-1">👑 PREMIUM</div>
              <div className="text-3xl font-bold text-white">29,90€</div>
              <div className="text-gray-400 text-sm">/kk</div>
              <div className="text-xs text-gray-500 mt-2">Normaalihinta</div>
              {currentTier === "premium" && (
                <div className="mt-3 text-pink-400 text-sm font-medium">
                  Aina saatavilla
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current offer */}
        <div className="max-w-md mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border-2 border-purple-500 ring-2 ring-purple-500/50">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-purple-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                {currentConfig.badge || "Nykyinen hinta"}
              </span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">{currentConfig.name}</h2>
              <p className="text-gray-400 text-sm">{currentConfig.description}</p>
              
              {spotsLeft && spotsLeft <= 20 && (
                <div className="mt-3 text-orange-400 text-sm font-medium animate-pulse">
                  🔥 Enää {spotsLeft} paikkaa jäljellä!
                </div>
              )}

              <div className="mt-6">
                <span className="text-5xl font-bold text-white">{currentConfig.price}€</span>
                <span className="text-gray-400 text-lg">/kk</span>
              </div>
              
              {currentTier !== "premium" && (
                <div className="mt-2 text-green-400 text-sm">
                  Säästät {currentTier === "founding" ? "22€" : "15€"}/kk ikuisesti!
                </div>
              )}
            </div>

            <ul className="space-y-4 mb-8">
              {FEATURES.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-400 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(currentConfig.priceId)}
              disabled={loading !== null}
              className="w-full py-4 rounded-xl font-semibold text-lg transition bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ladataan...
                </span>
              ) : (
                `Tilaa nyt ${currentConfig.price}€/kk →`
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">Turvallinen maksu</p>
          <div className="flex justify-center items-center gap-6 text-gray-500">
            <span>🔒 SSL-suojattu</span>
            <span>💳 Stripe</span>
            <span>🔄 Peruuta milloin vain</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Usein kysytyt</h2>
          
          <div className="space-y-4">
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">Mitä "ikuisesti" tarkoittaa?</summary>
              <p className="text-gray-400 mt-2">Founding Member ja Early Bird -hinnat pysyvät samana niin kauan kuin tilauksesi on aktiivinen. Vaikka hinta nousisi myöhemmin, sinun hintasi ei muutu.</p>
            </details>
            
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">Voinko perua milloin vain?</summary>
              <p className="text-gray-400 mt-2">Kyllä! Voit perua tilauksesi koska tahansa. Saat käyttää palvelua laskutusjakson loppuun asti.</p>
            </details>

            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">Miten saan pääsyn Telegram-kanavalle?</summary>
              <p className="text-gray-400 mt-2">Maksun jälkeen saat automaattisesti kutsulinkin sähköpostiisi ja success-sivulle. Klikkaa linkkiä ja liity kanavalle!</p>
            </details>
          </div>
        </div>
      </main>
    </div>
  );
}
