/**
 * استعلامات المعاملات
 * ------------------------------------------------------------
 * ملاحظة أمنية: لا حاجة لتصفية معاملات المحامي يدوياً —
 * سياسة RLS تتكفّل بذلك على مستوى القاعدة.
 */
import { createClient } from '@/lib/supabase/server'
import type { TransactionFull, Company } from '@/types/database'
import { readJsonFile } from '@/lib/data/fs-store'
import { listCompanies } from '@/lib/data/companies'

const SELECT_PRIMARY = '*'
const SELECT_WITH_RELATIONS = '*, clients(id,name), companies(id,name), profiles!transactions_lawyer_id_fkey(id,name)'
const SELECT_FALLBACK = '*, clients(id,name), companies(id,name)'

export async function listTransactions(filters?: {
  type?: string
  status?: string
  lawyerId?: string
}): Promise<TransactionFull[]> {
  const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
  const deletedTxIds = new Set(readJsonFile<string[]>('deleted_transaction_ids.json', []))
  const deletedCompanyIds = new Set(readJsonFile<string[]>('deleted_company_ids.json', []))
  const supabase = await createClient()

  let dbTxs: TransactionFull[] = []

  try {
    let q = supabase.from('transactions').select(SELECT_PRIMARY)
    if (filters?.type)     q = q.eq('type', filters.type)
    if (filters?.status)   q = q.eq('status', filters.status)
    if (filters?.lawyerId) q = q.eq('lawyer_id', filters.lawyerId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (!error && data) {
      dbTxs = data as unknown as TransactionFull[]
    }
  } catch (e) {
    console.warn('Primary transactions query failed:', e)
  }

  if (!dbTxs.length) {
    try {
      let q = supabase.from('transactions').select(SELECT_WITH_RELATIONS)
      if (filters?.type)     q = q.eq('type', filters.type)
      if (filters?.status)   q = q.eq('status', filters.status)
      if (filters?.lawyerId) q = q.eq('lawyer_id', filters.lawyerId)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (!error && data) {
        dbTxs = data as unknown as TransactionFull[]
      }
    } catch {
      // try fallback
    }
  }

  if (!dbTxs.length) {
    try {
      let q = supabase.from('transactions').select(SELECT_FALLBACK)
      if (filters?.type)     q = q.eq('type', filters.type)
      if (filters?.status)   q = q.eq('status', filters.status)
      if (filters?.lawyerId) q = q.eq('lawyer_id', filters.lawyerId)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (!error && data) {
        dbTxs = data as unknown as TransactionFull[]
      }
    } catch {
      // try fallback
    }
  }

  const map = new Map<string, TransactionFull>()

  // 1. Process disk transactions (filter out deleted ones)
  diskTxs.forEach(t => {
    if (deletedTxIds.has(t.id)) return
    if (t.company_id && deletedCompanyIds.has(t.company_id)) return
    map.set(t.id, t)
  })

  // 2. Process DB transactions (filter out deleted ones)
  dbTxs.forEach(t => {
    if (deletedTxIds.has(t.id)) return
    if (t.company_id && deletedCompanyIds.has(t.company_id)) return
    const existing = map.get(t.id)
    if (existing) {
      map.set(t.id, {
        ...existing,
        ...t,
        capital_before: t.capital_before ?? existing.capital_before,
        capital_after: t.capital_after ?? existing.capital_after,
        seller_name: t.seller_name ?? existing.seller_name,
        buyer_name: t.buyer_name ?? existing.buyer_name,
        companies: t.companies || existing.companies,
      })
    } else {
      map.set(t.id, t)
    }
  })

  // 3. Attach company objects from listCompanies and aggregate specialized department transactions
  try {
    const companies = await listCompanies()
    const compMap = new Map(companies.map(c => [c.id, c]))

    for (const [txId, tx] of map.entries()) {
      if (tx.company_id && compMap.has(tx.company_id)) {
        const comp = compMap.get(tx.company_id)!
        map.set(txId, {
          ...tx,
          companies: tx.companies || (comp as unknown as Company),
        })
      }
    }

    // 4. Auto-aggregate Government IDs Transactions (هويات الغرفة التجارية، الضريبية، التخطيط، والمستورد)
    try {
      const diskIDs = readJsonFile<Array<Record<string, unknown>>>('company_ids.json', [])
      let dbIDs: Array<Record<string, unknown>> = []
      try {
        const { data: idRows } = await supabase.from('company_ids').select('*')
        if (idRows) dbIDs = idRows as unknown as Array<Record<string, unknown>>
      } catch {}

      const allIDsMap = new Map<string, Record<string, unknown>>()
      diskIDs.forEach(i => {
        if (i.id) allIDsMap.set(String(i.id), i)
      })
      dbIDs.forEach(i => {
        if (i.id) allIDsMap.set(String(i.id), { ...allIDsMap.get(String(i.id)), ...i })
      })

      for (const idRec of allIDsMap.values()) {
        const recId = String(idRec.id || '')
        if (!recId) continue
        if (deletedTxIds.has(recId) || deletedTxIds.has(`tx_${recId}`)) continue
        const cId = idRec.company_id ? String(idRec.company_id) : ''
        if (cId && deletedCompanyIds.has(cId)) continue

        const idType = String(idRec.id_type || '')
        const notesStr = String(idRec.notes || '')
        const isRenew = notesStr.includes('تجديد')
        let txTypeStr = 'tax-id-new'
        let idLabel = 'هوية'
        if (idType === 'chamber_id') {
          txTypeStr = isRenew ? 'chamber-renew' : 'chamber-new'
          idLabel = 'هوية الغرفة التجارية'
        } else if (idType === 'tax_id') {
          txTypeStr = isRenew ? 'tax-id-renew' : 'tax-id-new'
          idLabel = 'هوية ضريبية'
        } else if (idType === 'planning_id') {
          txTypeStr = isRenew ? 'plan-id-renew' : 'plan-id'
          idLabel = 'هوية التخطيط'
        } else if (idType === 'importer_id') {
          txTypeStr = isRenew ? 'importer-id-renew' : 'importer-id-new'
          idLabel = 'هوية مستورد'
        }

        const isDone = idRec.status === 'done' || Boolean(idRec.id_number || idRec.issue_date)
        const isLacks = idRec.status === 'lacks'
        const isPaused = idRec.status === 'paused'
        const txStatus = isDone ? 'completed' : isLacks ? 'incomplete' : isPaused ? 'paused' : 'in_progress'

        if (!map.has(recId)) {
          const comp = cId ? compMap.get(cId) : null
          const compName = comp?.name || (idRec.company_name ? String(idRec.company_name) : 'شركة')
          const txDate = idRec.tx_start_date
            ? String(idRec.tx_start_date)
            : idRec.created_at
            ? String(idRec.created_at).slice(0, 10)
            : new Date().toISOString().slice(0, 10)

          map.set(recId, {
            id: recId,
            company_id: cId || null,
            client_id: null,
            lawyer_id: idRec.lawyer_id ? String(idRec.lawyer_id) : null,
            type: txTypeStr,
            status: txStatus,
            priority: 'medium',
            tx_date: txDate,
            due_date: idRec.expiry_date ? String(idRec.expiry_date) : null,
            description: notesStr || `إصدار ${idLabel}`,
            services: [idType],
            lacks: isLacks ? (notesStr || 'نواقص بالمعاملة') : null,
            fee: null,
            phone: null,
            created_at: idRec.created_at ? String(idRec.created_at) : new Date().toISOString(),
            clients: null,
            profiles: null,
            companies: (comp as unknown as Company) || ({ id: cId, name: compName } as Company),
          })
        }
      }
    } catch (e) {
      console.warn('Auto-aggregate IDs into transactions warning:', e)
    }

    // 5. Auto-aggregate Tax Assessments (التحاسب الضريبي وبراءة الذمة)
    try {
      const diskTax = readJsonFile<Array<Record<string, unknown>>>('tax_assessments.json', [])
      let dbTax: Array<Record<string, unknown>> = []
      try {
        const { data: taxRows } = await supabase.from('tax_assessments').select('*')
        if (taxRows) dbTax = taxRows as unknown as Array<Record<string, unknown>>
      } catch {}

      const allTaxMap = new Map<string, Record<string, unknown>>()
      diskTax.forEach(t => {
        if (t.id) allTaxMap.set(String(t.id), t)
      })
      dbTax.forEach(t => {
        if (t.id) allTaxMap.set(String(t.id), { ...allTaxMap.get(String(t.id)), ...t })
      })

      for (const taxRec of allTaxMap.values()) {
        const recId = String(taxRec.id || '')
        if (!recId) continue
        if (deletedTxIds.has(recId) || deletedTxIds.has(`tx_${recId}`)) continue
        const cId = taxRec.company_id ? String(taxRec.company_id) : ''
        if (cId && deletedCompanyIds.has(cId)) continue

        if (!map.has(recId)) {
          const comp = cId ? compMap.get(cId) : null
          const compName = comp?.name || (taxRec.company_name ? String(taxRec.company_name) : 'شركة')
          const isDone = taxRec.status === 'tax_cleared' || Boolean(taxRec.receipt_no || taxRec.clearance_no)
          const txDate = taxRec.start_date
            ? String(taxRec.start_date)
            : taxRec.created_at
            ? String(taxRec.created_at).slice(0, 10)
            : new Date().toISOString().slice(0, 10)

          map.set(recId, {
            id: recId,
            company_id: cId || null,
            client_id: null,
            lawyer_id: taxRec.lawyer_id ? String(taxRec.lawyer_id) : null,
            type: 'tax_assessment',
            status: isDone ? 'completed' : 'in_progress',
            priority: 'medium',
            tx_date: txDate,
            due_date: taxRec.due_date ? String(taxRec.due_date) : null,
            description: `التحاسب الضريبي لسنة ${taxRec.year || ''}`,
            services: ['tax_assessment'],
            lacks: null,
            fee: null,
            phone: null,
            created_at: taxRec.created_at ? String(taxRec.created_at) : new Date().toISOString(),
            clients: null,
            profiles: null,
            companies: (comp as unknown as Company) || ({ id: cId, name: compName } as Company),
          })
        }
      }
    } catch (e) {
      console.warn('Auto-aggregate Tax into transactions warning:', e)
    }
  } catch {}

  let result = Array.from(map.values())
  if (filters?.type) {
    const filterType = filters.type.trim()
    result = result.filter(t => t.type === filterType || (filterType === 'formation' && t.type === 'tasis') || (filterType === 'tasis' && t.type === 'formation'))
  }
  if (filters?.status)   result = result.filter(t => t.status === filters.status)
  if (filters?.lawyerId) result = result.filter(t => t.lawyer_id === filters.lawyerId)

  return result.sort(
    (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
  )
}

export async function getTransaction(id: string): Promise<TransactionFull | null> {
  const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
  const foundDisk = diskTxs.find(t => t.id === id)
  if (foundDisk) return foundDisk

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
