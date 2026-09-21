import Link from 'next/link'

/**
 * رابط موحّد لفتح «الملف الشامل» للشركة.
 * حجم واحد في كل الصفحات (زر صغير 32px) ولون تنقّل أزرق هادئ.
 */
export default function CompanyFileLink({
  companyId,
  label = 'الملف الشامل',
  stopPropagation = false,
}: {
  companyId: string
  label?: string
  stopPropagation?: boolean
}) {
  return (
    <Link
      href={`/commercial/companies/${companyId}`}
      onClick={stopPropagation ? e => e.stopPropagation() : undefined}
      className="btn btn-sm btn-soft"
      title="فتح الملف الشامل للشركة"
    >
      <span className="material-symbols-outlined" aria-hidden>folder_open</span>
      <span>{label}</span>
    </Link>
  )
}
