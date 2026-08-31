/**
 * تسجيل الخروج
 * ------------------------------------------------------------
 * ينهي الجلسة على الخادم، ويسجّل عملية الخروج في سجل التدقيق،
 * ثم يحوّل المستخدم إلى صفحة الدخول.
 */
import { createClient } from '@/lib/supabase/server'
import { logUserAuditAction } from '@/lib/data/audit'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await logUserAuditAction({
        userId: user.id,
        userEmail: user.email,
        action: 'logout',
        category: 'auth',
        details: `تسجيل خروج المستخدم ${user.email}`,
      })
    }
  } catch {}

  await supabase.auth.signOut()

  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, { status: 303 })
}
