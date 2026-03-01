import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getSupabaseUser() {
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

async function isAdmin(userId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  return data?.role === 'admin';
}

// GET - List applications
export async function GET(req: NextRequest) {
  try {
    const user = await getSupabaseUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!await isAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    let query = supabaseAdmin
      .from('tipster_applications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, count, error } = await query;
    
    if (error) {
      console.error('Error fetching applications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      applications: data,
      total: count,
      limit,
      offset
    });
    
  } catch (error) {
    console.error('Applications GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Approve or reject application
export async function POST(req: NextRequest) {
  try {
    const user = await getSupabaseUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!await isAdmin(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const { applicationId, action, adminNotes } = body;
    
    if (!applicationId || !action) {
      return NextResponse.json(
        { error: 'Missing applicationId or action' },
        { status: 400 }
      );
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      );
    }
    
    // Fetch application
    const { data: application, error: fetchError } = await supabaseAdmin
      .from('tipster_applications')
      .select('*')
      .eq('id', applicationId)
      .single();
    
    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Application has already been processed' },
        { status: 400 }
      );
    }
    
    if (action === 'reject') {
      // Simply update status to rejected
      const { error: updateError } = await supabaseAdmin
        .from('tipster_applications')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('id', applicationId);
      
      if (updateError) {
        console.error('Error rejecting application:', updateError);
        return NextResponse.json(
          { error: 'Failed to reject application' },
          { status: 500 }
        );
      }
      
      // TODO: Send rejection email
      
      return NextResponse.json({
        success: true,
        message: 'Application rejected'
      });
    }
    
    // APPROVE flow
    
    // 1. Check if email already has account
    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingAuth?.users?.find(
      u => u.email?.toLowerCase() === application.email.toLowerCase()
    );
    
    let profileId: string;
    
    if (existingUser) {
      // User exists, use their profile
      profileId = existingUser.id;
      
      // Update their role to tipster
      await supabaseAdmin
        .from('profiles')
        .update({ role: 'tipster' })
        .eq('id', profileId);
    } else {
      // Create new user with invite
      const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        application.email,
        {
          data: {
            role: 'tipster',
            alias: application.alias
          }
        }
      );
      
      if (inviteError || !newUser.user) {
        console.error('Error inviting user:', inviteError);
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        );
      }
      
      profileId = newUser.user.id;
      
      // Create profile
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: profileId,
          email: application.email,
          username: application.alias,
          role: 'tipster'
        });
    }
    
    // 2. Create tipster_profile
    const { error: tipsterError } = await supabaseAdmin
      .from('tipster_profiles')
      .insert({
        profile_id: profileId,
        alias: application.alias,
        application_status: 'approved',
        approved_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      });
    
    if (tipsterError) {
      console.error('Error creating tipster profile:', tipsterError);
      // Check if it's a duplicate alias error
      if (tipsterError.code === '23505') {
        return NextResponse.json(
          { error: 'Alias is already taken' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create tipster profile' },
        { status: 500 }
      );
    }
    
    // 3. Update application
    const { error: updateError } = await supabaseAdmin
      .from('tipster_applications')
      .update({
        status: 'approved',
        admin_notes: adminNotes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        profile_id: profileId
      })
      .eq('id', applicationId);
    
    if (updateError) {
      console.error('Error updating application:', updateError);
    }
    
    // TODO: Send approval email with login instructions
    // TODO: Add to tipster Telegram group
    
    return NextResponse.json({
      success: true,
      message: 'Application approved',
      profileId,
      alias: application.alias
    });
    
  } catch (error) {
    console.error('Applications POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
