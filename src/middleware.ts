import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/apply'];

// Routes that should redirect to dashboard if already logged in
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Remove locale prefix for checking
  const pathWithoutLocale = pathname.replace(/^\/(en|es)/, '');
  
  // Check if route needs protection
  const isProtectedRoute = protectedRoutes.some(route => 
    pathWithoutLocale.startsWith(route)
  );
  const isAuthRoute = authRoutes.some(route => 
    pathWithoutLocale.startsWith(route)
  );

  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Get session from cookie
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  // Check for auth token in cookies
  const authToken = request.cookies.get('sb-access-token')?.value ||
                    request.cookies.get('sb-grajiwygrrxcdbekywju-auth-token')?.value;

  const isAuthenticated = !!authToken;

  // Redirect logic
  if (isProtectedRoute && !isAuthenticated) {
    const locale = pathname.match(/^\/(en|es)/)?.[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  if (isAuthRoute && isAuthenticated) {
    const locale = pathname.match(/^\/(en|es)/)?.[1] || 'en';
    return NextResponse.redirect(new URL(`/${locale}/dashboard/subscriber`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(en|es)/dashboard/:path*',
    '/(en|es)/apply/:path*',
    '/(en|es)/login',
    '/(en|es)/register',
  ],
};
