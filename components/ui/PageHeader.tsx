import type { KpiTone } from './KpiCard'

/** السطر الرمادي الثاني للعنوان (أسلوب «عنوان بلونين») — جملة قصيرة لكل قسم */
const TAGLINES: Record<string, string> = {
  'لوحة التحكم': 'كل يومك بمكان واحد.',
  'تأسيس الشركات': 'كل شركة بمسارها.',
  'الهويات والتراخيص': 'كل هوية بموعدها.',
  'التحاسب الضريبي': 'براءة ذمة بلا مفاجآت.',
  'الحسابات الختامية': 'كل سنة بموعدها.',
  'سجل الشركات': 'سجل واحد لكل شركة.',
  'إطلاق الودائع': 'من الشهادة إلى الإطلاق.',
  'التذكيرات': 'ما يفوتك موعد.',
  'المهام': 'كل شغلة بموعدها.',
  'قسم المحدودة': 'كل معاملة بمرحلتها.',
  'القسم التجاري': 'كل معاملة، وين وصلت.',
  'المعاملات التجارية': 'كل معاملة، وين وصلت.',
  'المستخدمون والصلاحيات': 'فريقك وأدوارهم.',
  'مصفوفة الصلاحيات': 'من يرى ماذا.',
  'الإعدادات العامة': 'المكتب كما تريده.',
  'سجل التدقيق': 'كل تغيير مسجّل.',
}

/** رأس صفحة موحّد لكل الأقسام: أيقونة ملوّنة + عنوان + وصف + أزرار الإجراءات */
export function PageHeader({
  icon,
  title,
  subtitle,
  tone = 'accent',
  actions,
  tagline,
}: {
  icon: string
  title: string
  /** يتجاوز الجملة الافتراضية؛ مرّر '' لإخفائها */
  tagline?: string
  subtitle?: React.ReactNode
  tone?: KpiTone
  actions?: React.ReactNode
}) {
  return (
    <header className={`page-head tone-${tone}`}>
      <div className="page-head-main">
        <span className="page-head-icon" aria-hidden>
          <span className="material-symbols-outlined">{icon}</span>
        </span>
        <div className="min-w-0">
          {(() => {
            const tag = tagline ?? TAGLINES[title.trim()]
            return tag
              ? <h1 className="ph-two"><span className="ph-title">{title}.</span> <span className="ph-tag">{tag}</span></h1>
              : <h1 className="ph-two"><span className="ph-title">{title}</span></h1>
          })()}
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  )
}
