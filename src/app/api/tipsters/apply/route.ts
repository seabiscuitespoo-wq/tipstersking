import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Supported leagues
const VALID_LEAGUES = [
  'La Liga', 'Premier League', 'Champions League', 'Europa League',
  'Bundesliga', 'Serie A', 'Ligue 1', 'Eredivisie',
  'Primeira Liga', 'Brasileirão', 'MLS'
];

interface ApplicationBody {
  alias: string;
  email: string;
  telegram: string;
  leagues: string[];
  experience: string;
  trackRecord?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: ApplicationBody = await req.json();
    
    // Validate required fields
    if (!body.alias || !body.email || !body.telegram || !body.experience) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate alias length
    if (body.alias.length < 3 || body.alias.length > 50) {
      return NextResponse.json(
        { error: 'Alias must be between 3 and 50 characters' },
        { status: 400 }
      );
    }
    
    // Validate alias format (alphanumeric + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(body.alias)) {
      return NextResponse.json(
        { error: 'Alias can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }
    
    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Validate leagues
    if (!body.leagues || body.leagues.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one league' },
        { status: 400 }
      );
    }
    
    // Filter to only valid leagues
    const validatedLeagues = body.leagues.filter(l => VALID_LEAGUES.includes(l));
    if (validatedLeagues.length === 0) {
      return NextResponse.json(
        { error: 'Select at least one valid league' },
        { status: 400 }
      );
    }
    
    // Clean telegram username (remove @ if present)
    const telegramUsername = body.telegram.replace(/^@/, '');
    
    // Validate telegram username
    if (!/^[a-zA-Z0-9_]{5,32}$/.test(telegramUsername)) {
      return NextResponse.json(
        { error: 'Invalid Telegram username format' },
        { status: 400 }
      );
    }
    
    // Check for existing pending application with same email
    const { data: existingByEmail } = await supabase
      .from('tipster_applications')
      .select('id, status')
      .eq('email', body.email.toLowerCase())
      .eq('status', 'pending')
      .single();
    
    if (existingByEmail) {
      return NextResponse.json(
        { error: 'You already have a pending application' },
        { status: 409 }
      );
    }
    
    // Check for existing pending application with same alias
    const { data: existingByAlias } = await supabase
      .from('tipster_applications')
      .select('id, status')
      .ilike('alias', body.alias)
      .eq('status', 'pending')
      .single();
    
    if (existingByAlias) {
      return NextResponse.json(
        { error: 'This alias is already taken in a pending application' },
        { status: 409 }
      );
    }
    
    // Check if alias is already used by approved tipster
    const { data: existingTipster } = await supabase
      .from('tipster_profiles')
      .select('id')
      .ilike('alias', body.alias)
      .single();
    
    if (existingTipster) {
      return NextResponse.json(
        { error: 'This alias is already taken by an existing tipster' },
        { status: 409 }
      );
    }
    
    // Insert application
    const { data, error } = await supabase
      .from('tipster_applications')
      .insert({
        email: body.email.toLowerCase(),
        alias: body.alias,
        telegram_username: telegramUsername,
        leagues: validatedLeagues,
        experience: body.experience,
        track_record_url: body.trackRecord || null,
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error inserting application:', error);
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      );
    }
    
    // TODO: Send confirmation email
    // TODO: Notify admins via Telegram
    
    return NextResponse.json({
      success: true,
      applicationId: data.id,
      message: 'Application submitted successfully'
    });
    
  } catch (error) {
    console.error('Application error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
