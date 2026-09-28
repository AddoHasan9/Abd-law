/**
 * تسجيل الخروج
 * ------------------------------------------------------------
 * ينهي جلسة هذا الجهاز، ويسجّل الخروج في سجل التدقيق بالتوازي،
 * ثم يحوّل المتصفح مباشرة إلى صفحة الدخول (طلب واحد، بلا تحميل مزدوج).
 */
import { createClient } from '@/lib/supabase/server'
import { logUserAuditAction } from '@/lib/data/audit'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // هوية المستخدم من الجلسة المحفوظة (بلا طلب شبكة) — تكفي لتسمية قيد التدقيق
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  await Promise.allSettled([
    user
      ? logUserAuditAction({
          userId: user.id,
          userEmail: user.email,
          action: 'logout',
          category: 'auth',
          details: `تسجيل خروج المستخدم ${user.email}`,
        })
      : Promise.resolve(),
    // هذا الجهاز فقط — لا يُخرج المستخدم من أجهزته الأخرى
    supabase.auth.signOut({ scope: 'local' }),
  ])

  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
