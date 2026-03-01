// ============================================================
// Tipster Payouts API
// GET: List payout history
// POST: (Admin only) Trigger monthly payouts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export const dynamic = 'force-dynamic';

// GET: List payout history for tipster
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get commission history
    const { data: commissions, error } = await supabase
      .from('monthly_commissions')
      .select('*')
      .eq('profile_id', user.id)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(12);
    
    if (error) {
      console.error('Payouts fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
    }
    
    // Calculate totals
    const totalEarnings = commissions?.reduce((sum, c) => sum + (c.net_amount || 0), 0) || 0;
    const pendingAmount = commissions?.filter(c => !c.paid_at).reduce((sum, c) => sum + (c.net_amount || 0), 0) || 0;
    const paidAmount = commissions?.filter(c => c.paid_at).reduce((sum, c) => sum + (c.net_amount || 0), 0) || 0;
    
    return NextResponse.json({
      commissions: commissions || [],
      totals: {
        total: totalEarnings,
        pending: pendingAmount,
        paid: paidAmount,
      },
    });
    
  } catch (error) {
    console.error('Payouts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Process payouts (admin/cron only)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      const user = await getAuthUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const supabase = getSupabaseAdmin();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
    
    const { year, month } = await request.json();
    
    if (!year || !month) {
      return NextResponse.json({ error: 'year and month required' }, { status: 400 });
    }
    
    const supabase = getSupabaseAdmin();
    
    // Get unpaid commissions for the period
    const { data: commissions, error } = await supabase
      .from('monthly_commissions')
      .select(`
        *,
        profiles!inner (
          email
        ),
        tipster_profiles!inner (
          stripe_account_id,
          alias
        )
      `)
      .eq('period_year', year)
      .eq('period_month', month)
      .is('paid_at', null)
      .gt('net_amount', 0);
    
    if (error) {
      console.error('Commission fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 });
    }
    
    if (!commissions || commissions.length === 0) {
      return NextResponse.json({ message: 'No pending payouts', processed: 0 });
    }
    
    const results: Array<{ alias: string; amount: number; success: boolean; error?: string }> = [];
    
    for (const commission of commissions) {
      const stripeAccountId = commission.tipster_profiles?.stripe_account_id;
      const alias = commission.tipster_profiles?.alias || 'Unknown';
      const amount = Math.round(commission.net_amount * 100); // Convert to cents
      
      if (!stripeAccountId) {
        results.push({ alias, amount: commission.net_amount, success: false, error: 'No Stripe account' });
        continue;
      }
      
      if (amount < 100) { // Minimum $1
        results.push({ alias, amount: commission.net_amount, success: false, error: 'Amount too small' });
        continue;
      }
      
      try {
        // Create transfer to connected account
        const transfer = await stripe.transfers.create({
          amount,
          currency: 'eur',
          destination: stripeAccountId,
          metadata: {
            commission_id: commission.id.toString(),
            period: `${year}-${month.toString().padStart(2, '0')}`,
            alias,
          },
        });
        
        // Update commission as paid
        await supabase
          .from('monthly_commissions')
          .update({
            paid_at: new Date().toISOString(),
            stripe_payout_id: transfer.id,
          })
          .eq('id', commission.id);
        
        results.push({ alias, amount: commission.net_amount, success: true });
        
      } catch (stripeError: any) {
        console.error(`Payout failed for ${alias}:`, stripeError);
        results.push({ alias, amount: commission.net_amount, success: false, error: stripeError.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const totalPaid = results.filter(r => r.success).reduce((sum, r) => sum + r.amount, 0);
    
    return NextResponse.json({
      message: `Processed ${successCount}/${results.length} payouts`,
      processed: successCount,
      total: results.length,
      totalPaid,
      results,
    });
    
  } catch (error) {
    console.error('Payout processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
