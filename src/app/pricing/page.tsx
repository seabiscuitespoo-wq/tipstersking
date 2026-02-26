"use client";

import { useState } from "react";
import Link from "next/link";

const PRICES = {
  earlyBird: {
    id: "price_1T4yWUAaocVx6MDw1FtJoiT9",
    name: "Early Bird",
    price: "19,90",
    period: "/kk",
    description: "Ensimmäiset 100 tilaajaa",
    badge: "🚀 Rajoitettu",
    features: [
      "Kaikki premium-tipsit",
      "Telegram-kanava",
      "Discord-yhteisö",
      "Reaaliaikaiset ilmoitukset",
      "ROI-tilastot",
    ],
    popular: true,
    spotsLeft: 73, // TODO: haetaan tietokannasta
  },
  pro: {
    id: "price_1T4yWcAaocVx6MDwOosccZG3",
    name: "Pro",
    price: "29,90",
    period: "/kk",
    description: "Täysi pääsy kaikkeen",
    badge: null,
    features: [
      "Kaikki premium-tipsit",
      "Telegram-kanava",
      "Discord-yhteisö",
      "Reaaliaikaiset ilmoitukset",
      "ROI-tilastot",
    ],
    popular: false,
    spotsLeft: null,
  },
  yearly: {
    id: "price_1T4yWdAaocVx6MDwRMeh8l4i",
    name: "Vuositilaus",
    price: "249",
    period: "/vuosi",
    description: "Säästä 2 kuukautta",
    badge: "💰 Säästä 20%",
    features: [
      "Kaikki premium-tipsit",
      "Telegram-kanava",
      "Discord-yhteisö",
      "Reaaliaikaiset ilmoitukset",
      "ROI-tilastot",
      "Prioriteetti-tuki",
    ],
    popular: false,
    spotsLeft: null,
  },
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

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
            Valitse pakettisi
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Liity TipstersKingin premium-yhteisöön ja saa parhaat vedonlyöntitipsit
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.values(PRICES).map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border ${
                plan.popular
                  ? "border-purple-500 ring-2 ring-purple-500"
                  : "border-white/10"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-purple-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                <p className="text-gray-400 text-sm">{plan.description}</p>
                
                {plan.spotsLeft && (
                  <div className="mt-3 text-orange-400 text-sm font-medium">
                    ⚡ Enää {plan.spotsLeft} paikkaa jäljellä!
                  </div>
                )}

                <div className="mt-6">
                  <span className="text-5xl font-bold text-white">{plan.price}€</span>
                  <span className="text-gray-400 text-lg">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, index) => (
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
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-4 rounded-xl font-semibold text-lg transition ${
                  plan.popular
                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                    : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Ladataan...
                  </span>
                ) : (
                  "Tilaa nyt →"
                )}
              </button>
            </div>
          ))}
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
      </main>
    </div>
  );
}
