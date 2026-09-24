'use client'

import { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'

interface AccordionItem {
  id: string
  title: string
  subtitle?: string
  icon: string
  content: React.ReactNode
}

interface PageGuideContent {
  title: string
  subtitle: string
  badge: string
  items: AccordionItem[]
}

export default function QuickHelpGuide() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [activeAccordion, setActiveAccordion] = useState<string>('overview')

  // إغلاق النافذة بزر Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ضبط المحتوى التفاعلي بحسب الصفحة الحالية مع التركيز على اختصاص الشركات والمعاملات
  const guideData: PageGuideContent = useMemo(() => {
    if (pathname === '/dashboard' || pathname === '/') {
      return {
        title: 'لوحة التحكم الرئيسية',
        subtitle: 'نظرة عامة على إحصائيات ومعاملات شركات المكتب وسير العمل',
        badge: 'الرئيسية',
        items: [
          {
            id: 'overview',
            title: 'نظرة عامة',
            subtitle: 'ما هي لوحة التحكم؟',
            icon: 'info',
            content: (
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                لوحة التحكم هي المركز الحي لإدارة أعمال مكتب المحاماة؛ تتيح متابعة حركة تأسيس الشركات، رصد المعاملات الجارية في دائرة تسجيل الشركات، وتوزيع التكليفات على الكادر القانوني بدقة وشفافية.
              </p>
            ),
          },
          {
            id: 'stats',
            title: 'الإحصائيات والأرقام',
            subtitle: 'دلالات البطاقات والمؤشرات',
            icon: 'analytics',
            content: (
              <div className="space-y-2.5 text-xs text-[var(--text-2)]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-[11px] flex-none">1</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">إجمالي الشركات:</strong> عدد الشركات المسجلة والموثقة في أرشيف وسجلات المكتب.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-[11px] flex-none">2</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">مسار التأسيس (8 خطوات):</strong> متابعة الشركات قيد التأسيس خطوة بخطوة حتى صدور الشهادة.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-[11px] flex-none">3</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">إطلاق الوديعة (30 يوماً):</strong> متابعة مهلة تحرير الوديعة المصرفية بعد صدور شهادة التأسيس لتفادي الغرامات.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-[11px] flex-none">4</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">توزيع المهام على الكادر:</strong> رسم توضيحي لحجم المعاملات المنجزة والمكلف بها كل محامي في المكتب.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-[11px] flex-none">5</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">المعاملات حسب النوع:</strong> تصنيف المعاملات (تأسيس، بيع أسهم، زيادة رأس مال، نقل مقر، تعيين مدير).
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: 'nav',
            title: 'التنقل في النظام والوظائف السريعة',
            subtitle: 'كيفية استخدام القوائم والبحث والتنبيهات',
            icon: 'menu_open',
            content: (
              <div className="space-y-2.5 text-xs text-[var(--text-2)]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[11px] flex-none">1</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">القائمة الجانبية:</strong> للتنقل السريع بين الأقسام التجارية (الشركات، المحدودة، الودائع، الهويات، الحسابات الختامية).
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[11px] flex-none">2</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">البحث السريع (Ctrl + K):</strong> للبحث الفوري عن أي شركة أو معاملة أو مدير مفوض بالاسم أو رقم الشهادة.
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center font-bold text-[11px] flex-none">3</span>
                  <div>
                    <strong className="text-[var(--text)] text-xs">جرس الإشعارات والتذكيرات:</strong> لعرض تنبيهات المهل القانونية، النواقص، والمواعيد المجدولة.
                  </div>
                </div>
              </div>
            ),
          },
        ],
      }
    }

    if (pathname.includes('/commercial/llc')) {
      return {
        title: 'قسم الشركات المحدودة (LLC)',
        subtitle: 'دليل إدارة معاملات التعديل، بيع الأسهم، زيادة رأس المال، ونقل المقار',
        badge: 'قسم المحدودة',
        items: [
          {
            id: 'overview',
            title: 'نظرة عامة على قسم المحدودة',
            subtitle: 'ما هي معاملات الشركات المحدودة؟',
            icon: 'corporate_fare',
            content: (
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                يختص هذا القسم بكافة المعاملات الإجرائية للشركات المحدودة القائمة بعد تأسيسها، وتوثيق كافة التعديلات القانونية وقرارات الهيئة العامة في دائرة تسجيل الشركات.
              </p>
            ),
          },
          {
            id: 'types',
            title: 'أنواع المعاملات المدعومة',
            subtitle: 'المعاملات الرسمية في دائرة تسجيل الشركات',
            icon: 'checklist',
            content: (
              <div className="space-y-2 text-xs text-[var(--text-2)]">
                <p>• <strong>بيع ونقل الأسهم:</strong> توثيق تنازل ونقل الحصص والأسهم بين المساهمين أو لشركاء جدد.</p>
                <p>• <strong>زيادة رأس المال:</strong> تعديل رأس المال المسجل وإيداع الزيادة المصرفية ومطابقة الحسابات.</p>
                <p>• <strong>تعيين أو تجديد المدير المفوض:</strong> توثيق محاضر تعيين وتحديد صلاحيات الإدارة.</p>
                <p>• <strong>نقل المقر وتغيير النشاط:</strong> تعديل عقد التأسيس وتثبيت المقر الجديد والغايات التجارية.</p>
              </div>
            ),
          },
          {
            id: 'actions',
            title: 'خطوات إدراج ومتابعة المعاملة',
            subtitle: 'كيف تنجز المعاملة في النظام؟',
            icon: 'task_alt',
            content: (
              <div className="space-y-2 text-xs text-[var(--text-2)]">
                <p>1. اضغط على زر <strong>+ معاملة جديدة</strong> في أعلى الجدول.</p>
                <p>2. اختر الشركة المسجلة (أو اكتب اسمها يدوياً) وحدد نوع المعاملة والمحامي المسؤول.</p>
                <p>3. سجّل أي نواقص أو مستندات مطلوبة ليتم تتبعها والتنبيه بها.</p>
                <p>4. حدّث حالة المعاملة (جديدة ⟵ قيد التنفيذ ⟵ بانتظار العميل ⟵ مكتملة).</p>
              </div>
            ),
          },
        ],
      }
    }

    if (pathname.includes('/commercial/deposits')) {
      return {
        title: 'قسم إطلاق الودائع المصرفية',
        subtitle: 'متابعة مهلة الـ 30 يوماً القانونية وتحرير رؤوس الأموال دون غرامات',
        badge: 'إطلاق الوديعة',
        items: [
          {
            id: 'overview',
            title: 'المهلة القانونية لإطلاق الوديعة',
            subtitle: 'لماذا تعتبر هذه المرحلة حرجة؟',
            icon: 'lock_open',
            content: (
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                وفقاً لقانون الشركات، يجب استكمال إجراءات إطلاق الوديعة المصرفية خلال <strong>30 يوماً</strong> من تاريخ صدور شهادة التأسيس، وبعدها تترتب غرامات تأخير يومية تصاعدية.
              </p>
            ),
          },
          {
            id: 'calc',
            title: 'حاسبة الغرامات الذكية',
            subtitle: 'كيف يرصد النظام الأيام والمبالغ؟',
            icon: 'calculate',
            content: (
              <p className="text-sm text-[var(--text-2)] leading-relaxed">
                يقوم النظام تلقائياً برصد تاريخ الشهادة وحساب الأيام المتبقية؛ ويظهر شريط التنبيه باللون الأصفر قبل أسبوع من انتهاء المهلة، وباللون الأحمر في حال دخول مرحلة الغرامة مع حساب المبلغ التراكمي بدقة.
              </p>
            ),
          },
        ],
      }
    }

    // الدليل الافتراضي لأقسام الشركات وتأسيسها
    return {
      title: 'قسم الشركات ومسارات التأسيس',
      subtitle: 'دليل متابعة خطوات التأسيس الثمانية وإدارة سجلات وملفات الشركات',
      badge: 'الشركات وتأسيسها',
      items: [
        {
          id: 'overview',
          title: 'مسار تأسيس الشركات المعتمد',
          subtitle: 'المسار القانوني الرسمي من التقديم إلى صدور الشهادة والباركود',
          icon: 'domain',
          content: (
            <div className="space-y-2 text-xs text-[var(--text-2)]">
              <p>• <strong>1. حجز الاسم التجاري:</strong> توثيق وحجز الاسم في غرفة التجارة واتحاد الغرف.</p>
              <p>• <strong>2. إعداد العقد والمحاضر:</strong> صياغة عقد التأسيس والنظام الداخلي وموافقة المساهمين.</p>
              <p>• <strong>3. فتح الحساب المصرفي وإيداع رأس المال:</strong> إصدار كتاب إشعار الإيداع المصرفي.</p>
              <p>• <strong>4. التدقيق الأمني ومسجل الشركات:</strong> استكمال الموافقات الرسمية وإرسال الإضبارة.</p>
              <p>• <strong>5. صدور شهادة التأسيس:</strong> صدور أمر التأسيس الرسمي للشركة.</p>
              <p>• <strong>6. إطلاق الوديعة المصرفية:</strong> تحرير رأس المال وفتح الحساب الجاري الدائم.</p>
            </div>
          ),
        },
        {
          id: 'features',
          title: 'ميزات قسم الشركات',
          subtitle: 'الملف الشامل والتصدير والبحث',
          icon: 'stars',
          content: (
            <div className="space-y-2 text-xs text-[var(--text-2)]">
              <p>• <strong>ملف الشركة 360°:</strong> استعراض المدير المفوض، المساهمين، الخط الزمني، والمستندات بضغطة زر.</p>
              <p>• <strong>تصدير السجلات:</strong> استخراج جداول الشركات والمعاملات بصيغة Excel نقية وفورية.</p>
            </div>
          ),
        },
      ],
    }
  }, [pathname])

  const toggleAccordion = (id: string) => {
    setActiveAccordion(prev => (prev === id ? '' : id))
  }

  return (
    <>
      {/* Floating Help Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] text-white font-black text-xl shadow-[0_8px_25px_rgba(37,99,235,0.45)] border-2 border-white/25 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group cursor-pointer"
        aria-label="دليل الاستخدام والمساعدة"
        title="دليل الصفحة واستخدام النظام"
      >
        <span className="material-symbols-outlined text-[24px] group-hover:rotate-12 transition-transform">help</span>
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#070D18] animate-pulse" />
      </button>

      {/* Guide Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in text-right"
          dir="rtl"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-[var(--surface)] border border-[#38BDF8]/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(56,189,248,0.15)] overflow-hidden animate-scale-in flex flex-col max-h-[88vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header with Midnight Velvet Gradient */}
            <div className="relative p-6 bg-gradient-to-r from-[#0F2844] via-[#0E4363] to-[#0A3247] border-b border-white/10 text-white flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner flex-none">
                  <span className="material-symbols-outlined text-[24px] text-[#38BDF8]">menu_book</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight">{guideData.title}</h2>
                    <span className="px-2 py-0.5 rounded-md bg-[#38BDF8]/20 border border-[#38BDF8]/40 text-[#38BDF8] text-[10.5px] font-bold">
                      {guideData.badge}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-1 leading-relaxed">
                    {guideData.subtitle}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors flex-none"
                aria-label="إغلاق الدليل"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Body with Collapsible Accordion Items */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
              {guideData.items.map(item => {
                const isExpanded = activeAccordion === item.id
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition duration-200 overflow-hidden ${
                      isExpanded
                        ? 'bg-[var(--surface-2)] border-[#38BDF8]/40 shadow-md shadow-blue-500/5'
                        : 'bg-[color:color-mix(in_srgb,var(--surface-2)_50%,transparent)] border-[var(--glass-border)] hover:border-[var(--line)]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAccordion(item.id)}
                      className="w-full p-4 flex items-center justify-between gap-3 text-right cursor-pointer select-none"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none transition-colors ${
                            isExpanded
                              ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                              : 'bg-[var(--surface-3)] text-[var(--accent)]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--text)]">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] text-[var(--text-3)] font-medium mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`material-symbols-outlined text-[20px] text-[var(--text-3)] transition-transform duration-300 ${
                          isExpanded ? 'rotate-180 text-[#38BDF8]' : ''
                        }`}
                      >
                        expand_more
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[color:color-mix(in_srgb,var(--line-soft)_60%,transparent)] text-[var(--text-2)] animate-fade-in">
                        {item.content}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Helpful Tip Banner */}
              <div className="p-3.5 rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/25 flex items-center gap-3 text-xs text-[#38BDF8]">
                <span className="material-symbols-outlined text-[20px] flex-none">visibility</span>
                <span>
                  يمكنك الضغط على أيقونة المساعدة <strong>(?)</strong> في أي صفحة للحصول على دليل واستشارات تفصيلية خاصة بتلك الصفحة.
                </span>
              </div>
            </div>

            {/* Modal Footer with Official Office Branding */}
            <div className="p-3.5 bg-[var(--surface-2)] border-t border-[var(--line-soft)] flex items-center justify-center gap-2 text-center text-xs text-[var(--text-3)]">
              <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">gavel</span>
              <span className="font-semibold text-[var(--text-2)]">
                نظام إدارة الشركات والمعاملات — مكتب المحامي عبدالحسن الخزرجي
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
