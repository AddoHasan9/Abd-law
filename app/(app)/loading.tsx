/**
 * تحميل الانتقال بين الصفحات
 * هيكل خفيف يشبه شكل الصفحة (عنوان + بطاقات + جدول) داخل منطقة المحتوى فقط،
 * بدل البطاقة الكبيرة في وسط الشاشة. الشريط العلوي الرفيع (NavigationProgressBar)
 * يكفي كمؤشر حركة.
 */
function Bar({ w, h = 12, r = 8 }: { w: string; h?: number; r?: number }) {
  return <div className="skeleton-shimmer" style={{ width: w, height: h, borderRadius: r, background: 'var(--surface-2)' }} />
}

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="flex items-center justify-between gap-3">
        <Bar w="180px" h={20} />
        <Bar w="110px" h={32} r={10} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-4 flex flex-col gap-3">
            <Bar w="45%" />
            <Bar w="30%" h={22} />
          </div>
        ))}
      </div>

      <div className="card p-4 flex flex-col gap-3">
        <Bar w="35%" h={16} />
        {[0, 1, 2, 3, 4].map(i => (
          <Bar key={i} w="100%" h={36} r={10} />
        ))}
      </div>
    </div>
  )
}
