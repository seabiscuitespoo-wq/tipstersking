import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCountryFromHeaders, getPriceFromCountry, type Currency } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: NextRequest) {
  try {
    let body: { customerEmail?: string; currency?: string } = {};
    
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is OK, we'll use geo-detection
    }
    
    const { customerEmail, currency: requestedCurrency } = body;

    // Determine currency from request or geo-detection
    let currency: Currency;
    
    if (requestedCurrency && ['eur', 'usd', 'gbp'].includes(requestedCurrency)) {
      currency = requestedCurrency as Currency;
    } else {
      const countryCode = getCountryFromHeaders(request.headers);
      const priceConfig = getPriceFromCountry(countryCode);
      currency = priceConfig.currency;
    }
    
    const priceConfig = getPriceFromCountry(null); // Get config
    const priceId = getPriceFromCountry(currency === 'eur' ? 'FI' : currency === 'gbp' ? 'GB' : 'US').stripeId;

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          currency,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
      metadata: {
        currency,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ 
      url: session.url,
      currency,
    });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// GET: Return detected pricing for client
export async function GET(request: NextRequest) {
  const countryCode = getCountryFromHeaders(request.headers);
  const priceConfig = getPriceFromCountry(countryCode);
  
  return NextResponse.json({
    country: countryCode,
    currency: priceConfig.currency,
    price: priceConfig.display,
    amount: priceConfig.amount,
  });
}
