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

const DUPLICATE_MESSAGES: Record<string, string> = {
  companies: 'توجد شركة مسجلة بنفس الاسم. افتح الشركة الموجودة بدلاً من إضافتها مرة ثانية.',
  company_ids: 'لهذه الشركة سجل من نوع الهوية نفسه. عدّل السجل الموجود أو جدّده بدلاً من إضافة سجل جديد.',
  tax_assessments: 'يوجد تحاسب ضريبي لهذه الشركة لنفس السنة. عدّل السجل الموجود.',
  financial_statements: 'توجد حسابات ختامية لهذه الشركة لنفس السنة. عدّل السنة الموجودة.',
}

/** السجل موجود مسبقاً (رفضته قاعدة البيانات لأنه مكرر) */
export class DbDuplicateError extends DbWriteError {
  constructor(table: string) {
    super(table, 'duplicate')
    this.message = DUPLICATE_MESSAGES[table] || 'هذا السجل موجود مسبقاً ولا يمكن تكراره.'
  }
}

export async function dbWrite<T extends { error: { message: string } | null }>(query: PromiseLike<T>, table: string): Promise<T> {
  const res = await query
  if (res.error) {
    // رفض التكرار من قاعدة البيانات (قيود التفرّد): رسالة واضحة بدل النص التقني
    if ((res.error as { code?: string }).code === '23505') {
      throw new DbDuplicateError(table)
    }
    throw new DbWriteError(table, res.error.message)
  }
  return res
}

/** داخل كتل catch التي كانت «تتجاهل وتكمل»: فشل الحفظ لا يُبتلع بعد الآن */
export function rethrowDbError(e: unknown): void {
  if (e instanceof DbWriteError) throw e
}
