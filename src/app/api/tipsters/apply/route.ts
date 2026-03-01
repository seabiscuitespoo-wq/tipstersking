// ============================================================
// Tipster Application API
// POST: Submit a new tipster application
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _db: any = null;
function db() {
  if (!_db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    _db = createClient(url, key);
  }
  return _db;
}

export const dynamic = 'force-dynamic';

interface ApplicationData {
  alias: string;
  email: string;
  telegram: string;
  leagues: string[];
  experience: string;
  trackRecord?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApplicationData = await request.json();

    // Validate required fields
    const errors: string[] = [];

    if (!body.alias || body.alias.length < 3 || body.alias.length > 50) {
      errors.push('Alias must be 3-50 characters');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(body.alias)) {
      errors.push('Alias can only contain letters, numbers, and underscores');
    }

    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.push('Valid email is required');
    }

    if (!body.telegram || !body.telegram.startsWith('@')) {
      errors.push('Telegram username must start with @');
    }

    if (!body.leagues || body.leagues.length === 0) {
      errors.push('Select at least one league');
    }

    if (!body.experience || body.experience.length < 50) {
      errors.push('Experience must be at least 50 characters');
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    // Check if alias is already taken
    const { data: existingAlias } = await db()
      .from('tipster_profiles')
      .select('id')
      .eq('alias', body.alias)
      .single();

    if (existingAlias) {
      return NextResponse.json({ error: 'Alias is already taken' }, { status: 400 });
    }

    // Check if email already has a pending/approved application
    const { data: existingProfile } = await db()
      .from('profiles')
      .select('id, role')
      .eq('email', body.email)
      .single();

    let profileId: string;

    if (existingProfile) {
      // Check if already a tipster
      const { data: existingTipster } = await db()
        .from('tipster_profiles')
        .select('application_status')
        .eq('profile_id', existingProfile.id)
        .single();

      if (existingTipster) {
        if (existingTipster.application_status === 'approved') {
          return NextResponse.json({ error: 'You are already an approved tipster' }, { status: 400 });
        }
        if (existingTipster.application_status === 'pending') {
          return NextResponse.json({ error: 'You already have a pending application' }, { status: 400 });
        }
      }

      profileId = existingProfile.id;
    } else {
      // Create new profile
      const { data: newProfile, error: profileError } = await db()
        .from('profiles')
        .insert({
          email: body.email,
          username: body.alias.toLowerCase(),
          display_name: body.alias,
          role: 'subscriber', // Will be updated to 'tipster' on approval
        })
        .select('id')
        .single();

      if (profileError || !newProfile) {
        console.error('Failed to create profile:', profileError);
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
      }

      profileId = newProfile.id;
    }

    // Create tipster profile with pending status
    const applicationNote = JSON.stringify({
      leagues: body.leagues,
      experience: body.experience,
      trackRecord: body.trackRecord || null,
      telegram: body.telegram,
      appliedAt: new Date().toISOString(),
    });

    const { error: tipsterError } = await db()
      .from('tipster_profiles')
      .insert({
        profile_id: profileId,
        alias: body.alias,
        application_status: 'pending',
        application_note: applicationNote,
        active: false, // Will be set to true on approval
      });

    if (tipsterError) {
      console.error('Failed to create tipster profile:', tipsterError);
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Application submitted successfully' 
    });

  } catch (error) {
    console.error('Application error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
