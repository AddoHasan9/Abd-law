/**
 * وسيط الجلسة
 * ------------------------------------------------------------
 * يحدّث كوكيز جلسة Supabase مع كل طلب، ويحمي مسارات التطبيق
 * من غير المسجّلين. هذا هو الحارس الأول قبل أي صفحة.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth', '/reset-password']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC_PATHS.some(p => path.startsWith(p))

  // Fast cookie detection — if no auth tokens exist in cookies, skip network roundtrips
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(c =>
    c.name.includes('auth-token') ||
    c.name.startsWith('sb-') ||
    c.name.includes('supabase')
  )

  if (!hasAuthCookie) {
    if (!isPublic) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  // إذا كان الطلب لصفحة تسجيل الدخول، نمرره فوراً دون انتظار خادم المصادقة لتسريع التحميل
  if (isPublic && path === '/login') {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser يتحقّق من الرمز مع الخادم مع مهلة سريعة (2500ms) لمنع تعليق المتصفح
  const userPromise = supabase.auth.getUser()
  const timeoutPromise = new Promise<{ data: { user: null }; error: unknown }>((resolve) =>
    setTimeout(() => resolve({ data: { user: null }, error: new Error('timeout') }), 2500)
  )
  const { data: { user } } = await Promise.race([userPromise, timeoutPromise])

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
