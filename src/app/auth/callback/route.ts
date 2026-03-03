import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role to create profile
    );
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    // Create profile if new user
    if (session?.user && !error) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();
      
      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: session.user.id,
          email: session.user.email,
          username: session.user.email?.split('@')[0] || 'user',
          display_name: session.user.user_metadata?.full_name || null,
          role: 'subscriber',
        });
      }
    }
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/en/dashboard/subscriber', requestUrl.origin));
}
