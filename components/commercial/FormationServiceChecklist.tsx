'use client'

import { FORMATION_SERVICES } from '@/lib/constants'
import { Icon } from '@/components/ui/Icon'

interface Props {
  selected: string[]
  onToggle: (id: string) => void
}

/**
 * قائمة الخدمات المشمولة بالمبلغ المستلم عند تأسيس شركة.
 * معروضة أفقياً بشبكة متناسقة متعددة الأعمدة لسهولة وسرعة الاختيار.
 */
export default function FormationServiceChecklist({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-[var(--accent)]">checklist</span>
          <span>الخدمات والوثائق المشمولة بالمعاملة</span>
        </label>
        <span className="text-[11px] text-[var(--text-3)] font-semibold">
          ({selected.length} محددة)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--line-soft)]">
        {FORMATION_SERVICES.map(srv => {
          const isChecked = selected.includes(srv.id)

          return (
            <div
              key={srv.id}
              role="checkbox"
              aria-checked={isChecked}
              onClick={() => onToggle(srv.id)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition duration-200 cursor-pointer select-none ${
                isChecked
                  ? 'bg-[var(--accent-soft)] border-[color:color-mix(in_srgb,var(--accent)_60%,transparent)] text-[var(--accent)] font-bold shadow-xs'
                  : 'bg-[var(--surface)] border-[var(--line-soft)] text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:border-[var(--line)] font-medium'
              }`}
            >
              {/* Checkbox box */}
              <div
                className={`w-4 h-4 rounded-md flex-none flex items-center justify-center transition ${
                  isChecked
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'border border-[var(--line)] bg-transparent'
                }`}
              >
                {isChecked && (
                  <Icon name="check" style={{ width: '10px', height: '10px' }} />
                )}
              </div>

              {/* Service Label */}
              <span className="text-xs truncate" title={srv.label}>
                {srv.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
