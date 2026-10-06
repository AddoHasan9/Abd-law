/**
 * استعلامات المعاملات
 * ------------------------------------------------------------
 * ملاحظة أمنية: لا حاجة لتصفية معاملات المحامي يدوياً —
 * سياسة RLS تتكفّل بذلك على مستوى القاعدة.
 */
import { txType } from '@/lib/constants'
import { requirePermission } from '@/lib/auth/require-permission'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { TransactionFull, Company } from '@/types/database'
import { listCompanies } from '@/lib/data/companies'

const SELECT_PRIMARY = '*'
const SELECT_WITH_RELATIONS = '*, clients(id,name), companies(id,name), profiles!transactions_lawyer_id_fkey(id,name)'
const SELECT_FALLBACK = '*, clients(id,name), companies(id,name)'

export async function listTransactions(filters?: {
  type?: string
  status?: string
  lawyerId?: string
}): Promise<TransactionFull[]> {
  const accessDenied = await requirePermission('transactions', 'view')
  if (accessDenied) return []

  const supabase = await createClient()

  let dbTxs: TransactionFull[] = []
  let querySuccessful = false

  try {
    let q = supabase.from('transactions').select(SELECT_PRIMARY)
    if (filters?.type)     q = q.eq('type', filters.type)
    if (filters?.status)   q = q.eq('status', filters.status)
    if (filters?.lawyerId) q = q.eq('lawyer_id', filters.lawyerId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (!error && data) {
      dbTxs = data as unknown as TransactionFull[]
      querySuccessful = true
    }
  } catch (e) {
    console.warn('Primary transactions query failed:', e)
  }

  if (!querySuccessful) {
    try {
      let q = supabase.from('transactions').select(SELECT_FALLBACK)
      if (filters?.type)     q = q.eq('type', filters.type)
      if (filters?.status)   q = q.eq('status', filters.status)
      if (filters?.lawyerId) q = q.eq('lawyer_id', filters.lawyerId)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (!error && data) {
        dbTxs = data as unknown as TransactionFull[]
        querySuccessful = true
      }
    } catch {
      // ignore
    }
  }

  const companies = await listCompanies()
  const compMap = new Map(companies.map(c => [c.id, c]))
  const validCompanyIds = new Set(companies.map(c => c.id))

  const map = new Map<string, TransactionFull>()

  // 1. معاملات قاعدة البيانات (باستثناء المرتبطة بشركة لم تعد موجودة)
  dbTxs.forEach(t => {
    if (t.company_id && !validCompanyIds.has(t.company_id)) return
    map.set(t.id, t)
  })

  // 3. Attach company objects & synthesize missing module transactions
  try {
    // Attach company object to existing transactions
    for (const [txId, tx] of map.entries()) {
      if (tx.company_id && compMap.has(tx.company_id)) {
        const comp = compMap.get(tx.company_id)!
        map.set(txId, {
          ...tx,
          companies: tx.companies || (comp as unknown as Company),
        })
      }
    }

    // 4. Synthesize company formation transactions
    const activeCoIdsWithTasis = new Set<string>()
    map.forEach(t => {
      if (t.company_id && (t.type === 'tasis' || t.type === 'formation')) {
        activeCoIdsWithTasis.add(t.company_id)
      }
    })

    companies.forEach(co => {
      // الشركات القائمة المضافة من قسم الشركات ليست معاملات تأسيس
      if (co.external) return
      if (!activeCoIdsWithTasis.has(co.id)) {
        const isEstablished = co.status === 'established' || co.status === 'done' || co.deposit_released
        const tStatus = isEstablished ? 'done' : (co.status || 'progress')
        const tId = `tx_tasis_${co.id}`
        if (!map.has(tId)) {
          map.set(tId, {
            id: tId,
            company_id: co.id,
            client_id: co.client_id || null,
            lawyer_id: null,
            type: 'tasis',
            status: tStatus as 'progress' | 'done' | 'new' | 'doing' | 'wait' | 'lacks' | 'paused' | 'closed',
            priority: 'medium',
            tx_date: co.created_at ? co.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
            due_date: null,
            description: `تأسيس شركة: ${co.name}`,
            services: ['tasis'],
            lacks: co.lacks || null,
            fee: null,
            phone: co.phone || null,
            created_at: co.created_at || new Date().toISOString(),
            companies: co as unknown as Company,
            clients: null,
            profiles: null,
          })
        }
      }
    })

    // 5. Synthesize Government IDs
    // الهويات من قاعدة البيانات (الملف المؤقت فارغ دائماً في الإنتاج)
    type IdRow = { id: string; company_id?: string; company_name?: string; id_type?: string; id_number?: string; issue_date?: string; expiry_date?: string; tx_start_date?: string; status?: string; notes?: string; lawyer_id?: string; created_at?: string }
    const { data: dbIDs } = await createAdminClient().from('company_ids').select('*')
    ;((dbIDs ?? []) as IdRow[]).forEach(idRec => {
      if (idRec.company_id && !validCompanyIds.has(idRec.company_id)) return
      if (!map.has(idRec.id)) {
        const comp = idRec.company_id ? compMap.get(idRec.company_id) : null
        const compName = comp?.name || idRec.company_name || 'شركة'
        const isDone = idRec.status === 'done' || Boolean(idRec.id_number || idRec.issue_date)
        const idTypeStr = idRec.id_type || 'importer_id'
        map.set(idRec.id, {
          id: idRec.id,
          company_id: idRec.company_id || null,
          client_id: null,
          lawyer_id: idRec.lawyer_id || null,
          type: idTypeStr,
          status: isDone ? 'done' : 'progress',
          priority: 'medium',
          tx_date: idRec.tx_start_date || (idRec.created_at ? idRec.created_at.slice(0, 10) : ''),
          due_date: idRec.expiry_date || null,
          description: `${txType(idTypeStr).label}: ${compName}`,
          services: [idTypeStr],
          lacks: null,
          fee: null,
          phone: null,
          created_at: idRec.created_at || new Date().toISOString(),
          companies: comp ? (comp as unknown as Company) : ({ id: idRec.company_id, name: compName } as Company),
          clients: null,
          profiles: null,
        })
      }
    })

    // 6. Synthesize Tax Assessments
    // ملفات التحاسب من قاعدة البيانات (كانت من ملف مؤقت فلا تظهر في قائمة المعاملات)
    type TaxRow = { id: string; company_id?: string; company_name?: string; year?: number; status?: string; tx_start_date?: string; clearance_date?: string; tax_amount_assessed?: number; lawyer_id?: string; assigned_lawyer_name?: string; created_at?: string }
    const { data: dbTax } = await createAdminClient().from('tax_assessments').select('*')
    ;((dbTax ?? []) as TaxRow[]).forEach(taxRec => {
      if (taxRec.company_id && !validCompanyIds.has(taxRec.company_id)) return
      if (!map.has(taxRec.id)) {
        const comp = taxRec.company_id ? compMap.get(taxRec.company_id) : null
        const compName = comp?.name || taxRec.company_name || 'شركة'
        const isCleared = taxRec.status === 'tax_cleared'
        const txTypeStr = isCleared ? 'tax-clear' : 'tax-assess'
        map.set(taxRec.id, {
          id: taxRec.id,
          company_id: taxRec.company_id || null,
          client_id: null,
          lawyer_id: taxRec.lawyer_id || null,
          type: txTypeStr,
          status: isCleared ? 'done' : 'progress',
          priority: 'medium',
          tx_date: taxRec.tx_start_date || (taxRec.created_at ? taxRec.created_at.slice(0, 10) : ''),
          due_date: taxRec.clearance_date || null,
          description: `تحاسب ضريبي: ${compName} (${taxRec.year || ''})`,
          services: [txTypeStr],
          lacks: null,
          fee: taxRec.tax_amount_assessed || null,
          phone: null,
          created_at: taxRec.created_at || new Date().toISOString(),
          companies: comp ? (comp as unknown as Company) : ({ id: taxRec.company_id, name: compName } as Company),
          clients: null,
          profiles: taxRec.assigned_lawyer_name ? ({ id: taxRec.lawyer_id || '1', name: taxRec.assigned_lawyer_name } as unknown as TransactionFull['profiles']) : null,
        })
      }
    })
  } catch {}

  let rawList = Array.from(map.values())
  if (filters?.type) {
    const filterType = filters.type.trim()
    rawList = rawList.filter(t => t.type === filterType || (filterType === 'formation' && t.type === 'tasis') || (filterType === 'tasis' && t.type === 'formation'))
  }
  if (filters?.status)   rawList = rawList.filter(t => t.status === filters.status)
  if (filters?.lawyerId) rawList = rawList.filter(t => t.lawyer_id === filters.lawyerId)

  // Enforce strict deduplication so no duplicate transactions exist for the same company and type
  const dedupMap = new Map<string, TransactionFull>()
  for (const t of rawList) {
    let dedupKey = `tx_${t.id}`
    if (t.company_id && (t.type === 'tasis' || t.type === 'formation')) {
      dedupKey = `co_tasis_${t.company_id}`
    } else if (t.company_id && (t.type === 'tax_id' || t.type === 'importer_id' || t.type === 'chamber_id' || t.type === 'planning_id')) {
      dedupKey = `co_id_${t.company_id}_${t.type}`
    }

    const existing = dedupMap.get(dedupKey)
    if (!existing) {
      dedupMap.set(dedupKey, t)
    } else {
      // Keep the more complete record (has fee / lawyer / newer created_at)
      if ((t.fee && !existing.fee) || (t.lawyer_id && !existing.lawyer_id) || new Date(t.created_at || '').getTime() > new Date(existing.created_at || '').getTime()) {
        dedupMap.set(dedupKey, {
          ...existing,
          ...t,
          companies: t.companies || existing.companies,
        })
      }
    }
  }

  const result = Array.from(dedupMap.values())

  return result.sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  )
}

export async function getTransaction(id: string): Promise<TransactionFull | null> {
  const accessDenied = await requirePermission('transactions', 'view')
  if (accessDenied) return null

  const supabase = await createClient()
  const selectQueries = [SELECT_PRIMARY, SELECT_WITH_RELATIONS, SELECT_FALLBACK]

  for (const selectClause of selectQueries) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(selectClause)
        .eq('id', id)
        .single()

      if (!error && data) {
        return data as unknown as TransactionFull
      }
    } catch {
      /* try next */
    }
  }

  return null
}

export async function countsByType(): Promise<Record<string, number>> {
  const txs = await listTransactions()
  const map: Record<string, number> = {}
  txs.forEach(t => {
    if (t.type) {
      map[t.type] = (map[t.type] || 0) + 1
    }
  })
  return map
}
