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

  // 3. Attach company objects from listCompanies if missing on transaction
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
