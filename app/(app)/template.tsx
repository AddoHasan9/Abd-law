/**
 * template.tsx يُعاد تركيبه مع كل تنقّل (بخلاف layout)، فحركة الدخول
 * تشتغل عند فتح كل صفحة — سابقاً كانت تشتغل مرة واحدة فقط عند أول تحميل.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
