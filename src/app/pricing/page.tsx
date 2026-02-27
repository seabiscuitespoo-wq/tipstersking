"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Tier configuration
const TIER_CONFIG = {
  founding: {
    maxSpots: 50,
    priceId: "price_1T5O9cAaocVx6MDwOODjnjGO",
    price: "7.90",
    name: "Founding Member",
    badge: "🏆 Forever",
    description: "First 50 subscribers",
  },
  earlyBird: {
    maxSpots: 100,
    priceId: "price_1T5O9jAaocVx6MDwDuyNYIoO", 
    price: "14.90",
    name: "Early Bird",
    badge: "⭐ Forever",
    description: "Subscribers 51-100",
  },
  premium: {
    maxSpots: null,
    priceId: "price_1T4yWcAaocVx6MDwOosccZG3",
    price: "29.90",
    name: "Premium",
    badge: null,
    description: "Regular price",
  },
};

const FEATURES = [
  "All premium tips",
  "Telegram channel access",
  "Real-time notifications",
  "ROI statistics",
  "Community chat",
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [subscriberCount, setSubscriberCount] = useState(0);
  
  const getCurrentTier = () => {
    if (subscriberCount < 50) return "founding";
    if (subscriberCount < 100) return "earlyBird";
    return "premium";
  };

  const currentTier = getCurrentTier();
  const currentConfig = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG];

  const getSpotsLeft = () => {
    if (currentTier === "founding") return 50 - subscriberCount;
    if (currentTier === "earlyBird") return 100 - subscriberCount;
    return null;
  };

  const spotsLeft = getSpotsLeft();

  useEffect(() => {
    // TODO: fetch("/api/subscribers/count").then(r => r.json()).then(d => setSubscriberCount(d.count))
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
        alert("Error: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Something went wrong. Please try again.");
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
            Early Bird Pricing
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            First 100 subscribers get a permanently lower price
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
            {subscriberCount}/100 early bird spots filled
          </div>
        </div>

        {/* Pricing tiers comparison */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-3 gap-4 text-center">
            {/* Founding */}
            <div className={`p-6 rounded-xl ${currentTier === "founding" ? "bg-yellow-500/20 border-2 border-yellow-500" : "bg-white/5 opacity-50"}`}>
              <div className="text-yellow-400 text-sm font-semibold mb-1">🏆 FOUNDING MEMBER</div>
              <div className="text-3xl font-bold text-white">€7.90</div>
              <div className="text-gray-400 text-sm">/mo forever</div>
              <div className="text-xs text-gray-500 mt-2">Spots 1-50</div>
              {currentTier === "founding" && (
                <div className="mt-3 text-yellow-400 text-sm font-medium">
                  ⚡ {spotsLeft} spots left!
                </div>
              )}
              {currentTier !== "founding" && subscriberCount >= 50 && (
                <div className="mt-3 text-gray-500 text-sm">✓ Sold out</div>
              )}
            </div>

            {/* Early Bird */}
            <div className={`p-6 rounded-xl ${currentTier === "earlyBird" ? "bg-purple-500/20 border-2 border-purple-500" : "bg-white/5 opacity-50"}`}>
              <div className="text-purple-400 text-sm font-semibold mb-1">⭐ EARLY BIRD</div>
              <div className="text-3xl font-bold text-white">€14.90</div>
              <div className="text-gray-400 text-sm">/mo forever</div>
              <div className="text-xs text-gray-500 mt-2">Spots 51-100</div>
              {currentTier === "earlyBird" && (
                <div className="mt-3 text-purple-400 text-sm font-medium">
                  ⚡ {spotsLeft} spots left!
                </div>
              )}
              {currentTier === "founding" && (
                <div className="mt-3 text-gray-500 text-sm">Opens when Founding is full</div>
              )}
              {currentTier === "premium" && (
                <div className="mt-3 text-gray-500 text-sm">✓ Sold out</div>
              )}
            </div>

            {/* Premium */}
            <div className={`p-6 rounded-xl ${currentTier === "premium" ? "bg-pink-500/20 border-2 border-pink-500" : "bg-white/5 opacity-50"}`}>
              <div className="text-pink-400 text-sm font-semibold mb-1">👑 PREMIUM</div>
              <div className="text-3xl font-bold text-white">€29.90</div>
              <div className="text-gray-400 text-sm">/mo</div>
              <div className="text-xs text-gray-500 mt-2">Regular price</div>
              {currentTier === "premium" && (
                <div className="mt-3 text-pink-400 text-sm font-medium">
                  Always available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current offer */}
        <div className="max-w-md mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border-2 border-purple-500 ring-2 ring-purple-500/50 relative">
            {currentConfig.badge && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-purple-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                  {currentConfig.badge}
                </span>
              </div>
            )}

            <div className="text-center mb-8 pt-2">
              <h2 className="text-2xl font-bold text-white mb-2">{currentConfig.name}</h2>
              <p className="text-gray-400 text-sm">{currentConfig.description}</p>
              
              {spotsLeft && spotsLeft <= 20 && (
                <div className="mt-3 text-orange-400 text-sm font-medium animate-pulse">
                  🔥 Only {spotsLeft} spots left!
                </div>
              )}

              <div className="mt-6">
                <span className="text-5xl font-bold text-white">€{currentConfig.price}</span>
                <span className="text-gray-400 text-lg">/mo</span>
              </div>
              
              {currentTier !== "premium" && (
                <div className="mt-2 text-green-400 text-sm">
                  Save €{currentTier === "founding" ? "22" : "15"}/mo forever!
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
                  Loading...
                </span>
              ) : (
                `Subscribe Now €${currentConfig.price}/mo →`
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">Secure payment</p>
          <div className="flex justify-center items-center gap-6 text-gray-500">
            <span>🔒 SSL secured</span>
            <span>💳 Stripe</span>
            <span>🔄 Cancel anytime</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">What does "forever" mean?</summary>
              <p className="text-gray-400 mt-2">Founding Member and Early Bird prices stay the same as long as your subscription is active. Even if we raise prices later, your rate won't change.</p>
            </details>
            
            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">Can I cancel anytime?</summary>
              <p className="text-gray-400 mt-2">Yes! You can cancel your subscription at any time. You'll keep access until the end of your billing period.</p>
            </details>

            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">How do I access the Telegram channel?</summary>
              <p className="text-gray-400 mt-2">After payment, you'll automatically receive an invite link via email and on the success page. Click the link to join the channel!</p>
            </details>

            <details className="bg-white/5 rounded-lg p-4">
              <summary className="text-white font-medium cursor-pointer">What sports do you cover?</summary>
              <p className="text-gray-400 mt-2">We primarily cover football, hockey, and basketball. We focus on quality over quantity — only the best value bets make it to the channel.</p>
            </details>
          </div>
        </div>

        {/* Telegram CTA */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 mb-4">Questions? Chat with us on Telegram</p>
          <a 
            href="https://t.me/TipstersKingBot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-6 py-3 rounded-lg font-medium transition"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            @TipstersKingBot
          </a>
        </div>
      </main>
    </div>
  );
}
