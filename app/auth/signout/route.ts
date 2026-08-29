/**
 * تسجيل الخروج
 * ------------------------------------------------------------
 * ينهي الجلسة على الخادم ويحوّل إلى صفحة الدخول.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const url = new URL('/login', request.url)
  return NextResponse.redirect(url, { status: 303 })
}
