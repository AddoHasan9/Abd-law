/**
 * عميل Supabase للمتصفح
 * ------------------------------------------------------------
 * يستعمل مفتاح anon العام. كل استعلام يمرّ عبر سياسات RLS،
 * فالأمان محفوظ حتى لو وصل المفتاح لأي شخص.
 */
'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
