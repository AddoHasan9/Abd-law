/**
 * حارس عمليات الكتابة في قاعدة البيانات.
 * Supabase لا يرمي استثناءً عند الفشل بل يعيد { error } — وكانت عشرات العمليات
 * تتجاهله فيبدو الحفظ ناجحاً وهو لم يحدث. dbWrite يحوّل أي فشل إلى خطأ واضح.
 */
export class DbWriteError extends Error {
  constructor(public table: string, detail: string) {
    super(`تعذّر الحفظ في قاعدة البيانات (${table}). حاول مجدداً — وإذا تكرر أرسل هذه الرسالة للدعم.`)
    this.name = 'DbWriteError'
    console.error(`[DbWriteError] ${table}: ${detail}`)
  }
}

export async function dbWrite<T extends { error: { message: string } | null }>(query: PromiseLike<T>, table: string): Promise<T> {
  const res = await query
  if (res.error) throw new DbWriteError(table, res.error.message)
  return res
}

/** داخل كتل catch التي كانت «تتجاهل وتكمل»: فشل الحفظ لا يُبتلع بعد الآن */
export function rethrowDbError(e: unknown): void {
  if (e instanceof DbWriteError) throw e
}
