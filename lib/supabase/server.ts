/**
 * عميل Supabase للخادم (Server Components و Route Handlers و Server Actions)
 * ------------------------------------------------------------
 * • createClient: يقرأ جلسة المستخدم من الكوكيز
 * • createAdminClient: يستخدم مفتاح الخدمة لتجاوز قيود RLS في إجراءات الخادم
 */
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null
  try {
    cookieStore = await cookies()
  } catch {
    // Outside of request scope (e.g. unit testing, build, or background task)
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sheiontehslvsoczndqv.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key',
      { auth: { persistSession: false } }
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore?.set(name, value, options)
            )
          } catch {
            // يُستدعى من Server Component — التجاهل آمن،
            // فالـ middleware يتولّى تحديث الجلسة.
          }
        },
      },
    }
  )
}

let hasWarnedServiceRole = false

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Supabase Key غير مضبوط')

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !hasWarnedServiceRole && process.env.NODE_ENV !== 'production') {
    hasWarnedServiceRole = true
    console.info(
      '[createAdminClient] SUPABASE_SERVICE_ROLE_KEY غير مضبوط — تم استخدام مفتاح anon العام.'
    )
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  })
}
