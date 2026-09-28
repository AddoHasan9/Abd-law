import { createAdminClient } from '@/lib/supabase/server'

/**
 * شركة موجودة بنفس الاسم في قاعدة البيانات (بتجاهل المسافات الزائدة وحالة الأحرف).
 * تُستخدم لمنع تسجيل الشركة نفسها مرتين من «تأسيس شركة» أو «إضافة شركة مؤسسة».
 */
export async function findCompanyByName(name: string): Promise<{ id: string; name: string } | null> {
  const clean = name.trim().replace(/\s+/g, ' ')
  if (!clean) return null
  const { data } = await createAdminClient()
    .from('companies')
    .select('id, name')
    .ilike('name', `%${clean.split(' ')[0].replace(/[%_]/g, '')}%`)
  return (data ?? []).find(c => (c.name || '').trim().replace(/\s+/g, ' ').toLowerCase() === clean.toLowerCase()) ?? null
}
