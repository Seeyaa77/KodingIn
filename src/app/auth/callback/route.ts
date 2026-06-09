import { NextResponse } from 'next/server';
import { supabase, isMock } from '@/lib/supabase';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code && !isMock) {
    try {
      // Exchange code for user session
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error('OAuth callback error:', err);
    }
  }

  // URL to redirect to after sign-in process completes
  return NextResponse.redirect(requestUrl.origin);
}
