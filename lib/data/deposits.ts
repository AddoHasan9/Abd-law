/**
 * استعلامات الودائع المتكاملة والموثوقة
 * ------------------------------------------------------------
 * تضمن ديمومة حفظ المراحل الأربع دون فقدان:
 * 1. إرسال على النظام (submit)
 * 2. كتاب المشاور (advisor)
 * 3. كتاب المحاسب (accountant)
 * 4. رفع باركود / QR الشركة أو PDF (barcode)
 */
import { requirePermission } from '@/lib/auth/require-permission'
import { createClient } from '@/lib/supabase/server'
import type { DepositWithStages, DepositStage, Company } from '@/types/database'

interface RawStageItem {
  id?: string
  stage_key?: string
  stage_order?: number
  label?: string
  state?: 'done' | 'idle' | 'progress'
  at_date?: string | null
  notes?: string | null
  by_id?: string | null
  created_at?: string
}

interface RawDepositItem {
  id: string
  company_id?: string
  status?: string
  started_at?: string
  created_at?: string
  companies?: Company | { id?: string; name?: string; barcode_url?: string | null; barcode_path?: string | null } | null
  deposit_stages?: RawStageItem[]
}

const STANDARD_STAGES_CONFIG = [
  { stage_key: 'submit', stage_order: 1, label: 'أُرسلت على النظام (حاسمة)', critical: true },
  { stage_key: 'advisor', stage_order: 2, label: 'كتاب المشاور مكتمل', critical: false },
  { stage_key: 'accountant', stage_order: 3, label: 'كتاب المحاسب مكتمل', critical: false },
  { stage_key: 'barcode', stage_order: 4, label: 'رفع باركود / QR الشركة (أو PDF)', critical: false },
]

export async function listDeposits(): Promise<DepositWithStages[]> {
  const accessDenied = await requirePermission('deposits', 'view')
  if (accessDenied) return []

  try {
    // Try fetching from Supabase
    let dbDeposits: RawDepositItem[] = []
    try {
      const supabase = await createClient()
      const { data } = await supabase
        .from('deposits')
        .select('*, deposit_stages(*), companies(*)')
        .order('started_at', { ascending: false })

      if (data && Array.isArray(data)) {
        dbDeposits = data as unknown as RawDepositItem[]
      }
    } catch (dbErr) {
      console.warn('listDeposits DB fetch notice:', dbErr)
    }

    const map = new Map<string, DepositWithStages>()

    // 1. Process DB deposits first
    dbDeposits.forEach(d => {
      const depositId = d.id
      const coObj = d.companies as Company | null
      const companyId = (d.company_id || coObj?.id) as string
      const co = coObj?.name ? coObj : null

      const rawStages = Array.isArray(d.deposit_stages) ? d.deposit_stages : []
      const stages: DepositStage[] = STANDARD_STAGES_CONFIG.map(cfg => {
        const found = rawStages.find(s => s.stage_key === cfg.stage_key || (cfg.stage_key === 'advisor' && s.stage_key === 'consultant'))
        const isBarcode = cfg.stage_key === 'barcode'
        const hasBarcodeUrl = isBarcode && (co?.barcode_url || (co as { barcode_path?: string | null })?.barcode_path)

        return {
          id: found?.id || `stage_${cfg.stage_key}_${depositId}`,
          deposit_id: depositId,
          stage_key: cfg.stage_key,
          stage_order: cfg.stage_order,
          label: cfg.label,
          state: found?.state || (hasBarcodeUrl ? 'done' : 'idle'),
          at_date: found?.at_date || (hasBarcodeUrl ? co?.deposit_released_at || null : null),
          notes: found?.notes || (hasBarcodeUrl ? co?.barcode_url || null : null),
          by_id: found?.by_id || null,
          created_at: found?.created_at || new Date().toISOString(),
        }
      })

      map.set(depositId, {
        ...d,
        company_id: companyId,
        companies: co,
        deposit_stages: stages,
      } as unknown as DepositWithStages)
    })

    const result = Array.from(map.values()).sort(
      (a, b) => new Date(b.started_at || '').getTime() - new Date(a.started_at || '').getTime()
    )


    return result
  } catch (e) {
    console.error('Exception in listDeposits:', e)
    return []
  }
}
