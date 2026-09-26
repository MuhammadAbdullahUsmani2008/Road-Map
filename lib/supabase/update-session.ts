import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getAuthorizedUserId, safeRedirectPath } from '@/lib/auth/config';
import { DEVICE_COOKIE_NAME, validateDeviceCredential } from '@/lib/auth/device';
import { getSupabaseEnv } from './env';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseEnv();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === '/login';
  const isAccessDenied = pathname === '/access-denied';
  const isDeviceEnrollment = pathname === '/device-authorize';

  function redirect(path: string) {
    const redirectResponse = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (isLogin || isAccessDenied) return response;
  if (!userId) {
    const next = safeRedirectPath(`${pathname}${request.nextUrl.search}`);
    return redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (userId !== getAuthorizedUserId()) return redirect('/access-denied');
  if (isDeviceEnrollment) return response;

  const deviceId = await validateDeviceCredential(supabase, userId, request.cookies.get(DEVICE_COOKIE_NAME)?.value);
  if (!deviceId) {
    const next = safeRedirectPath(`${pathname}${request.nextUrl.search}`);
    return redirect(`/device-authorize?next=${encodeURIComponent(next)}`);
  }

  return response;
}
