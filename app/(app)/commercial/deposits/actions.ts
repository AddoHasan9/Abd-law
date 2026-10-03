/**
 * إجراءات خادم الودائع والمحطات الإلزامية — مع الحفظ الدائم الفوري
 */
'use server'

import { requireRecordAccess } from '@/lib/auth/record-access'
import { dbWrite, rethrowDbError } from '@/lib/data/db-guard'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import { logTimelineEvent } from '@/lib/data/timeline'
import { createNotificationAction } from '@/app/(app)/notifications/actions'
import { readJsonFile, writeJsonFile, ALLOW_LOCAL_FALLBACK } from '@/lib/data/fs-store'
import type { CompanyWithWorkflow } from '@/types/database'
import { requirePermission } from '@/lib/auth/require-permission'

interface DiskStage {
  id: string
  deposit_id?: string
  stage_key: string
  stage_order: number
  label: string
  critical?: boolean
  state: 'done' | 'idle' | 'progress'
  at_date?: string | null
  notes?: string | null
  by_id?: string | null
  created_at?: string
}

interface DiskDeposit {
  id: string
  company_id: string
  status?: string
  started_at?: string
  created_at?: string
  deposit_stages?: DiskStage[]
  companies?: unknown
}

const STANDARD_STAGES_CONFIG = [
  { stage_key: 'submit', stage_order: 1, label: 'أُرسلت على النظام (حاسمة)', critical: true },
  { stage_key: 'advisor', stage_order: 2, label: 'كتاب المشاور مكتمل', critical: false },
  { stage_key: 'accountant', stage_order: 3, label: 'كتاب المحاسب مكتمل', critical: false },
  { stage_key: 'barcode', stage_order: 4, label: 'رفع باركود / QR الشركة (أو PDF)', critical: false },
]

export async function confirmDepositSubmissionAction(depositId: string) {
  const rowDenied = await requireRecordAccess('deposits', depositId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('deposits', 'create')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    try {
      await dbWrite(supabase
        .from('deposit_stages')
        .update({
          state: 'done',
          at_date: today,
        })
        .eq('deposit_id', depositId)
        .eq('stage_key', 'submit'), 'deposit_stages')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    const diskDeposits = readJsonFile<DiskDeposit[]>('deposits.json', [])
    const targetDep = diskDeposits.find(d => d.id === depositId)
    if (targetDep && Array.isArray(targetDep.deposit_stages)) {
      const submitStage = targetDep.deposit_stages.find(s => s.stage_key === 'submit')
      if (submitStage) {
        submitStage.state = 'done'
        submitStage.at_date = today
      }
      writeJsonFile('deposits.json', diskDeposits)
    }

    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial/companies-registry')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    rethrowDbError(err)
    console.error('confirmDepositSubmissionAction exception:', err)
    return { success: true }
  }
}

export async function updateDepositStageStateAction(
  stageId: string,
  newState: 'done' | 'idle' | 'progress',
  atDate?: string | null,
  depositId?: string,
  companyId?: string
) {
  if (companyId) {
    const access = await requireRecordAccess('companies', companyId)
    if (access) return access
  }

  if (depositId) {
    const access = await requireRecordAccess('deposits', depositId)
    if (access) return access
  }

  const rowDenied = await requireRecordAccess('deposit_stages', stageId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('deposits', 'release')
  if (denied) return denied

  try {
    const supabase = createAdminClient()
    const targetAtDate = newState === 'done' ? (atDate || new Date().toISOString().slice(0, 10)) : null

    // 1. Update in Supabase
    try {
      if (stageId && !stageId.startsWith('mem_') && !stageId.startsWith('stage_')) {
        const { error: stErr } = await supabase
          .from('deposit_stages')
          .update({
            state: newState,
            at_date: targetAtDate,
          })
          .eq('id', stageId)
        if (stErr) throw stErr
      } else if (!ALLOW_LOCAL_FALLBACK) {
        return { success: false, error: 'مرحلة الوديعة غير محفوظة في قاعدة البيانات. أعد إطلاق مسار الوديعة من ملف الشركة' }
      }
    } catch (dbErr) {
      console.error('updateDepositStageStateAction DB error:', dbErr)
      if (!ALLOW_LOCAL_FALLBACK) return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
    }

    // 2. Update in local deposits.json
    const diskDeposits = readJsonFile<DiskDeposit[]>('deposits.json', [])
    let targetDep = diskDeposits.find(d => d.id === depositId || (companyId && d.company_id === companyId))
    if (!targetDep) {
      targetDep = diskDeposits.find(d => 
        Array.isArray(d.deposit_stages) && d.deposit_stages.some(s => s.id === stageId)
      )
    }

    if (!targetDep && (depositId || companyId)) {
      targetDep = {
        id: depositId || `dep_${companyId}`,
        company_id: companyId || '',
        status: 'active',
        started_at: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        deposit_stages: STANDARD_STAGES_CONFIG.map(c => ({
          id: `stage_${c.stage_key}_${depositId || companyId}`,
          deposit_id: depositId || `dep_${companyId}`,
          stage_key: c.stage_key,
          stage_order: c.stage_order,
          label: c.label,
          state: 'idle' as const,
          at_date: null,
          notes: null,
          by_id: null,
          created_at: new Date().toISOString(),
        }))
      }
      diskDeposits.push(targetDep)
    }

    if (targetDep) {
      // Ensure all 4 stages exist
      if (!Array.isArray(targetDep.deposit_stages) || targetDep.deposit_stages.length < 4) {
        const existing = Array.isArray(targetDep.deposit_stages) ? targetDep.deposit_stages : []
        targetDep.deposit_stages = STANDARD_STAGES_CONFIG.map(c => {
          const ex = existing.find(s => s.stage_key === c.stage_key || (c.stage_key === 'advisor' && s.stage_key === 'consultant'))
          return {
            id: ex?.id || `stage_${c.stage_key}_${targetDep?.id}`,
            deposit_id: targetDep?.id,
            stage_key: c.stage_key,
            stage_order: c.stage_order,
            label: c.label,
            state: ex?.state || 'idle',
            at_date: ex?.at_date || null,
            notes: ex?.notes || null,
            by_id: ex?.by_id || null,
            created_at: ex?.created_at || new Date().toISOString(),
          }
        })
      }

      const stageIdx = targetDep.deposit_stages.findIndex(s => s.id === stageId || (stageId.includes(s.stage_key)))
      if (stageIdx !== -1) {
        targetDep.deposit_stages[stageIdx].state = newState
        targetDep.deposit_stages[stageIdx].at_date = targetAtDate
      }
    }

    // 3. Save deposits.json immediately!
    writeJsonFile('deposits.json', diskDeposits)

    // 4. Check if all stages are done to complete release
    const finalCompanyId = companyId || targetDep?.company_id
    if (targetDep && Array.isArray(targetDep.deposit_stages) && newState === 'done') {
      const allStagesDone = targetDep.deposit_stages.every(s => s.state === 'done')
      if (allStagesDone && finalCompanyId) {
        targetDep.status = 'released'
        writeJsonFile('deposits.json', diskDeposits)

        // Upgrade Company to established in DB and disk store
        try {
          // 1. Basic status update (guaranteed to succeed across DB schemas)
          await dbWrite(supabase
            .from('companies')
            .update({ status: 'established' })
            .eq('id', finalCompanyId), 'companies')

          // 2. Extended fields if columns exist
          try {
            await dbWrite(supabase
              .from('companies')
              .update({
                deposit_released: true,
                deposit_released_at: targetAtDate || new Date().toISOString().slice(0, 10),
              })
              .eq('id', finalCompanyId), 'companies')
          } catch (dbErr) {
    rethrowDbError(dbErr)}

          await dbWrite(supabase
            .from('deposits')
            .update({ status: 'released' })
            .eq('id', targetDep.id), 'deposits')
        } catch (dbUpErr) {
          rethrowDbError(dbUpErr)
          console.warn('DB company established update notice:', dbUpErr)
        }

        const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
        const coIdx = diskCompanies.findIndex(c => c.id === finalCompanyId)
        if (coIdx !== -1) {
          diskCompanies[coIdx].status = 'established'
          diskCompanies[coIdx].deposit_released = true
          diskCompanies[coIdx].deposit_released_at = targetAtDate || new Date().toISOString().slice(0, 10)
          writeJsonFile('companies.json', diskCompanies)
        }

        // Update corresponding formation transaction in transactions.json
        const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
        let txUpdated = false
        diskTxs.forEach(tx => {
          if (tx.company_id === finalCompanyId && (tx.type === 'formation' || tx.type === 'tasis')) {
            tx.status = 'done'
            txUpdated = true
          }
        })
        if (txUpdated) {
          writeJsonFile('transactions.json', diskTxs)
        }

        try {
          await logTimelineEvent({
            company_id: finalCompanyId,
            event_type: 'deposit_released',
            title: 'تم إطلاق الوديعة بنجاح وانتقال الشركة إلى قسم الشركات',
            related_link: '/commercial/companies-registry',
          })
        } catch (dbErr) {
    rethrowDbError(dbErr)}
      }
    }

    revalidatePath('/commercial/deposits')
    revalidatePath('/commercial/companies-registry')
    revalidatePath('/commercial/companies')
    revalidatePath('/commercial')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err: unknown) {
    console.error('updateDepositStageStateAction exception:', err)
    return { success: false, error: 'تعذّر الحفظ في قاعدة البيانات. تحقق من الاتصال وحاول مجدداً' }
  }
}

export async function uploadCompanyBarcodeAction(stageId: string, companyId: string, barcodeDataUrl: string) {
  if (stageId) {
    const access = await requireRecordAccess('deposit_stages', stageId)
    if (access) return access
  }

  const rowDenied = await requireRecordAccess('companies', companyId)
  if (rowDenied) return rowDenied

  const denied = await requirePermission('deposits', 'release')
  if (denied) return denied

  // التحقق من الملف على الخادم: صورة أو PDF فقط، وحد أقصى للحجم (لا نثق بفحص المتصفح وحده)
  if (!/^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,[A-Za-z0-9+/=]+$/.test(barcodeDataUrl || '')) {
    return { success: false as const, error: 'الملف غير صالح: يُقبل PNG أو JPG أو WebP أو PDF فقط' }
  }
  if (barcodeDataUrl.length > 7_000_000) {
    return { success: false as const, error: 'حجم الملف كبير جداً (الحد الأقصى 5 ميغابايت)' }
  }

  try {
    const supabase = createAdminClient()
    const today = new Date().toISOString().slice(0, 10)

    // 1. Update deposits.json on disk
    const diskDeposits = readJsonFile<DiskDeposit[]>('deposits.json', [])
    const depIdx = diskDeposits.findIndex(d => d.company_id === companyId)
    if (depIdx === -1) {
      const newDep: DiskDeposit = {
        id: `dep_${companyId}`,
        company_id: companyId,
        status: 'released',
        started_at: today,
        created_at: new Date().toISOString(),
        deposit_stages: STANDARD_STAGES_CONFIG.map(c => ({
          id: `stage_${c.stage_key}_dep_${companyId}`,
          deposit_id: `dep_${companyId}`,
          stage_key: c.stage_key,
          stage_order: c.stage_order,
          label: c.label,
          state: 'done' as const,
          at_date: today,
          notes: c.stage_key === 'barcode' ? barcodeDataUrl : null,
          by_id: null,
          created_at: new Date().toISOString(),
        }))
      }
      diskDeposits.push(newDep)
    } else {
      diskDeposits[depIdx].status = 'released'
      if (!Array.isArray(diskDeposits[depIdx].deposit_stages) || (diskDeposits[depIdx].deposit_stages?.length ?? 0) < 4) {
        diskDeposits[depIdx].deposit_stages = STANDARD_STAGES_CONFIG.map(c => ({
          id: `stage_${c.stage_key}_${diskDeposits[depIdx].id}`,
          deposit_id: diskDeposits[depIdx].id,
          stage_key: c.stage_key,
          stage_order: c.stage_order,
          label: c.label,
          state: 'done' as const,
          at_date: today,
          notes: c.stage_key === 'barcode' ? barcodeDataUrl : null,
          by_id: null,
          created_at: new Date().toISOString(),
        }))
      } else {
        const stages = diskDeposits[depIdx].deposit_stages || []
        const bStage = stages.find(s => s.stage_key === 'barcode' || s.id === stageId)
        if (bStage) {
          bStage.state = 'done'
          bStage.at_date = today
          bStage.notes = barcodeDataUrl
        }
      }
    }
    writeJsonFile('deposits.json', diskDeposits)

    // 2. Update company in companies.json
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    const coIdx = diskCompanies.findIndex(c => c.id === companyId)
    if (coIdx !== -1) {
      diskCompanies[coIdx].status = 'established'
      diskCompanies[coIdx].deposit_released = true
      diskCompanies[coIdx].deposit_released_at = today
      diskCompanies[coIdx].barcode_url = barcodeDataUrl
      writeJsonFile('companies.json', diskCompanies)
    }

    // 3. Update transactions.json
    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    let txUpdated = false
    diskTxs.forEach(tx => {
      if (tx.company_id === companyId && (tx.type === 'formation' || tx.type === 'tasis')) {
        tx.status = 'done'
        txUpdated = true
      }
    })
    if (txUpdated) {
      writeJsonFile('transactions.json', diskTxs)
    }

    // 4. Update Supabase
    try {
      if (stageId && !stageId.startsWith('mem_') && !stageId.startsWith('stage_')) {
        await dbWrite(supabase
          .from('deposit_stages')
          .update({
            state: 'done',
            at_date: today,
            notes: barcodeDataUrl,
          })
          .eq('id', stageId), 'deposit_stages')
      }

      // 1. Basic status update (guaranteed to succeed across DB schemas)
      await dbWrite(supabase
        .from('companies')
        .update({ status: 'established' })
        .eq('id', companyId), 'companies')

      // 2. Extended fields if columns exist
      try {
        await dbWrite(supabase
          .from('companies')
          .update({
            deposit_released: true,
            deposit_released_at: today,
            barcode_url: barcodeDataUrl,
          })
          .eq('id', companyId), 'companies')
      } catch (dbErr) {
    rethrowDbError(dbErr)}

      await dbWrite(supabase
        .from('deposits')
        .update({ status: 'released' })
        .eq('company_id', companyId), 'deposits')

      await logTimelineEvent({
        company_id: companyId,
        event_type: 'deposit_released',
        title: 'تم إطلاق الوديعة بنجاح واستكمال رفع الباركود — أصبحت ضمن الشركات المؤسسة',
        related_link: '/commercial/companies-registry',
      })

      await createNotificationAction({
        title: 'تم إطلاق الوديعة بنجاح',
        description: 'أُكملت المحطات ورُفع الباركود بنجاح، وانتقلت الشركة إلى قسم الشركات.',
        type: 'deposit_released',
        related_company_id: companyId,
        link_url: '/commercial/companies-registry',
      })
    } catch (e) {
      rethrowDbError(e)
      console.warn('Supabase barcode upload notice:', e)
    }

    try {
      revalidatePath('/commercial/deposits')
      revalidatePath('/commercial/companies-registry')
      revalidatePath('/commercial/companies')
      revalidatePath(`/commercial/companies/${companyId}`)
      revalidatePath('/commercial')
      revalidatePath('/dashboard')
    } catch (dbErr) {
    rethrowDbError(dbErr)}

    return { success: true }
  } catch (err) {
    console.error('uploadCompanyBarcodeAction error:', err)
    return { success: false, error: 'تعذر رفع الباركود' }
  }
}
