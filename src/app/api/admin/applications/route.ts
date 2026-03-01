// ============================================================
// Admin Applications API
// GET: List applications (pending, approved, rejected)
// PATCH: Update application status (approve/reject)
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

// GET: List applications
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || 'pending';

  try {
    // TODO: Add proper admin auth check here
    // For now, we'll use a simple API key check
    const apiKey = request.headers.get('x-admin-key');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: applications, error } = await db()
      .from('tipster_profiles')
      .select(`
        id,
        profile_id,
        alias,
        application_status,
        application_note,
        created_at,
        reviewed_at,
        profiles!inner (
          email,
          username
        )
      `)
      .eq('application_status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch applications:', error);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Parse application notes and format response
    const formattedApplications = applications?.map((app: any) => {
      let parsedNote = {};
      try {
        parsedNote = JSON.parse(app.application_note || '{}');
      } catch (e) {
        parsedNote = { raw: app.application_note };
      }

      return {
        id: app.id,
        profile_id: app.profile_id,
        alias: app.alias,
        email: app.profiles?.email,
        status: app.application_status,
        ...parsedNote,
        created_at: app.created_at,
        reviewed_at: app.reviewed_at,
      };
    });

    return NextResponse.json(formattedApplications || []);

  } catch (error) {
    console.error('Admin applications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update application status
export async function PATCH(request: NextRequest) {
  try {
    // Admin auth check
    const apiKey = request.headers.get('x-admin-key');
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tipsterProfileId, action, adminProfileId } = body;

    if (!tipsterProfileId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the tipster profile
    const { data: tipsterProfile, error: fetchError } = await db()
      .from('tipster_profiles')
      .select('profile_id, alias, application_note')
      .eq('id', tipsterProfileId)
      .single();

    if (fetchError || !tipsterProfile) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Update tipster profile
      const { error: updateError } = await db()
        .from('tipster_profiles')
        .update({
          application_status: 'approved',
          active: true,
          approved_at: now,
          reviewed_at: now,
          reviewed_by: adminProfileId || null,
        })
        .eq('id', tipsterProfileId);

      if (updateError) {
        console.error('Failed to approve:', updateError);
        return NextResponse.json({ error: 'Failed to approve application' }, { status: 500 });
      }

      // Update user profile role to tipster
      await db()
        .from('profiles')
        .update({ role: 'tipster' })
        .eq('id', tipsterProfile.profile_id);

      // Parse note to get telegram username
      let telegram = null;
      try {
        const note = JSON.parse(tipsterProfile.application_note || '{}');
        telegram = note.telegram;
      } catch (e) {}

      // TODO: Send approval notification via Telegram/Email
      // await sendApprovalNotification(tipsterProfile.profile_id, telegram);

      return NextResponse.json({ 
        success: true, 
        message: `Tipster ${tipsterProfile.alias} approved successfully` 
      });

    } else if (action === 'reject') {
      // Update tipster profile
      const { error: updateError } = await db()
        .from('tipster_profiles')
        .update({
          application_status: 'rejected',
          reviewed_at: now,
          reviewed_by: adminProfileId || null,
        })
        .eq('id', tipsterProfileId);

      if (updateError) {
        console.error('Failed to reject:', updateError);
        return NextResponse.json({ error: 'Failed to reject application' }, { status: 500 });
      }

      // TODO: Send rejection notification via Email

      return NextResponse.json({ 
        success: true, 
        message: `Application for ${tipsterProfile.alias} rejected` 
      });
    }

  } catch (error) {
    console.error('Admin PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
