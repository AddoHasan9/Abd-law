/**
 * صفحة تعيين كلمة مرور جديدة
 * ------------------------------------------------------------
 * الوجهة التي يصل إليها المستخدم عبر رابط الإيميل بعد طلب
 * إعادة تعيين كلمة المرور من Supabase.
 */
import { Suspense } from 'react'
import ResetPasswordForm from './ResetPasswordForm'
import { IconSprite } from '@/components/ui/Icon'

export const metadata = { title: 'تعيين كلمة مرور جديدة — مكتب المحامي عبد الحسن الخزرجي' }

export default function ResetPasswordPage() {
  return (
    <>
      <IconSprite />
      <div id="login">
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>جاري التحميل...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  )
}
