/**
 * استعلامات الودائع المتكاملة والموثوقة
 * ------------------------------------------------------------
 * تضمن ديمومة حفظ المراحل الأربع دون فقدان:
 * 1. إرسال على النظام (submit)
 * 2. كتاب المشاور (advisor)
 * 3. كتاب المحاسب (accountant)
 * 4. رفع باركود / QR الشركة أو PDF (barcode)
 */
import { createClient } from '@/lib/supabase/server'
import type { DepositWithStages, DepositStage, Company } from '@/types/database'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'

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
  try {
    const deletedCompanyIds = readJsonFile<string[]>('deleted_company_ids.json', [])
    const diskDeposits = readJsonFile<RawDepositItem[]>('deposits.json', [])
    const diskCompanies = readJsonFile<Company[]>('companies.json', [])

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
      if (deletedCompanyIds.includes(companyId)) return

      let co = coObj
      if (!co || !co.name) {
        co = diskCompanies.find(c => c.id === companyId) || null
      }

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

    // 2. Merge Disk Deposits (Disk updates take priority for recent stage toggles & barcode uploads)
    diskDeposits.forEach(d => {
      const depositId = d.id
      const coObj = d.companies as Company | null
      const companyId = (d.company_id || coObj?.id) as string
      if (deletedCompanyIds.includes(companyId)) return

      const co = coObj || diskCompanies.find(c => c.id === companyId) || null
      const existing = map.get(depositId)

      const diskStagesRaw = Array.isArray(d.deposit_stages) ? d.deposit_stages : []
      const mergedStages: DepositStage[] = STANDARD_STAGES_CONFIG.map(cfg => {
        const existingStage = existing?.deposit_stages?.find(s => s.stage_key === cfg.stage_key || (cfg.stage_key === 'advisor' && s.stage_key === 'consultant'))
        const diskStage = diskStagesRaw.find(s => s.stage_key === cfg.stage_key || (cfg.stage_key === 'advisor' && s.stage_key === 'consultant') || s.id === existingStage?.id)
        const isBarcode = cfg.stage_key === 'barcode'
        const hasBarcodeUrl = isBarcode && (co?.barcode_url || diskStage?.notes)

        // Prefer done state from disk or DB
        const isDone = diskStage?.state === 'done' || existingStage?.state === 'done' || Boolean(hasBarcodeUrl)
        const state: 'done' | 'idle' | 'progress' = isDone ? 'done' : (diskStage?.state || existingStage?.state || 'idle')
        const at_date = diskStage?.at_date || existingStage?.at_date || (isDone ? (co?.deposit_released_at || new Date().toISOString().slice(0, 10)) : null)
        const notes = diskStage?.notes || existingStage?.notes || (isBarcode ? (co?.barcode_url || null) : null)

        return {
          id: diskStage?.id || existingStage?.id || `stage_${cfg.stage_key}_${depositId}`,
          deposit_id: depositId,
          stage_key: cfg.stage_key,
          stage_order: cfg.stage_order,
          label: cfg.label,
          state,
          at_date: at_date || null,
          notes: notes || null,
          by_id: diskStage?.by_id || existingStage?.by_id || null,
          created_at: diskStage?.created_at || existingStage?.created_at || new Date().toISOString(),
        }
      })

      const isReleased = d.status === 'released' || (existing as { status?: string })?.status === 'released' || co?.deposit_released || co?.status === 'established'

      map.set(depositId, {
        ...(existing || {}),
        ...d,
        company_id: companyId,
        companies: co,
        status: isReleased ? 'released' : (d.status || (existing as { status?: string })?.status || 'active'),
        deposit_stages: mergedStages,
      } as unknown as DepositWithStages)
    })

    const result = Array.from(map.values()).sort(
      (a, b) => new Date(b.started_at || '').getTime() - new Date(a.started_at || '').getTime()
    )

    // Ensure disk is updated with the normalized 4-stage schema
    try {
      writeJsonFile('deposits.json', result)
    } catch {}

    return result
  } catch (e) {
    console.error('Exception in listDeposits:', e)
    const diskDeposits = readJsonFile<RawDepositItem[]>('deposits.json', [])
    const diskCompanies = readJsonFile<Company[]>('companies.json', [])
    return diskDeposits.map(d => ({
      ...d,
      companies: d.companies || diskCompanies.find(c => c.id === d.company_id) || null
    })) as unknown as DepositWithStages[]
  }
}
