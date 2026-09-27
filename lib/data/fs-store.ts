import fs from 'fs'
import os from 'os'
import path from 'path'

/**
 * مخزن JSON على القرص — طبقة احتياطية/كاش فقط. المصدر الأساسي للبيانات هو
 * Supabase. على بيئات serverless (Vercel) يكون مجلد المشروع للقراءة فقط،
 * لذا نسقط تلقائيًا إلى مجلد مؤقت قابل للكتابة بدل رمي أخطاء ENOENT متكررة.
 */

/**
 * على Vercel لكل نسخة خادم ملفاتها المؤقتة الخاصة وتُمسح عند إعادة التشغيل،
 * فالبيانات المخزنة هنا تظهر وتختفي وتختلف بين المستخدمين. في الإنتاج نعطّل
 * هذه الطبقة بالكامل: قاعدة البيانات هي المصدر الوحيد، وأي فشل يُعاد كخطأ.
 * تبقى فعّالة محلياً فقط لتسهيل التطوير بلا اتصال.
 */
export const ALLOW_LOCAL_FALLBACK = !process.env.VERCEL

function resolveDataDir(): string {
  const candidates = [
    path.join(process.cwd(), '.data'),
    path.join(os.tmpdir(), 'lawyer-office-data'),
  ]
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.accessSync(dir, fs.constants.W_OK)
      return dir
    } catch {
      // جرّب التالي
    }
  }
  // آخر حل: مجلد مؤقت بدون ضمان — العمليات ستفشل بهدوء وتُرجع القيمة الافتراضية
  return path.join(os.tmpdir(), 'lawyer-office-data')
}

let cachedDir: string | null = null
function dataDir(): string {
  if (!cachedDir) cachedDir = resolveDataDir()
  return cachedDir
}

export function readJsonFile<T>(filename: string, defaultValue: T): T {
  if (!ALLOW_LOCAL_FALLBACK) return defaultValue
  try {
    const filePath = path.join(dataDir(), filename)
    if (!fs.existsSync(filePath)) {
      return defaultValue
    }
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    // القرص طبقة احتياطية فقط — لا نُصعّد الخطأ، فقط تنبيه خفيف
    console.warn(`fs-store: تعذّر قراءة ${filename}، سيتم استخدام القيمة الافتراضية`)
    return defaultValue
  }
}

export function writeJsonFile<T>(filename: string, data: T): void {
  if (!ALLOW_LOCAL_FALLBACK) return
  try {
    const filePath = path.join(dataDir(), filename)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  } catch {
    // على serverless الكتابة على القرص غير مضمونة — Supabase هو مصدر الحقيقة
    console.warn(`fs-store: تعذّر حفظ ${filename} على القرص (بيئة للقراءة فقط) — تم التجاهل`)
  }
}
