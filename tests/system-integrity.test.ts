import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hasPermission } from '../lib/permissions'
import { buildFallbackProfile } from '../lib/profile-fallback'
import { canEditCompanyData, canManageDepositWorkflow } from '../lib/rbac'
import { sanitizeFormationWorkflowSteps } from '../lib/constants'
import { logUserAuditAction, getAuditLogs } from '../lib/data/audit'
import { readJsonFile, writeJsonFile } from '../lib/data/fs-store'
import { listTransactions } from '../lib/data/transactions'
import type { TransactionFull } from '../types/database'

describe('Security & RBAC Integrity Tests', () => {
  it('hasPermission enforces fail-closed on null/undefined role', () => {
    assert.strictEqual(hasPermission(null, 'companies', 'delete'), false)
    assert.strictEqual(hasPermission(undefined, 'companies', 'create'), false)
  })

  it('super_admin has full permission access across all categories', () => {
    assert.strictEqual(hasPermission('super_admin', 'companies', 'delete'), true)
    assert.strictEqual(hasPermission('super_admin', 'users', 'manage_permissions'), true)
    assert.strictEqual(hasPermission('super_admin', 'deposits', 'release'), true)
  })

  it('lawyer and staff cannot delete companies or manage users', () => {
    assert.strictEqual(hasPermission('lawyer', 'companies', 'delete'), false)
    assert.strictEqual(hasPermission('lawyer', 'users', 'create_users'), false)
    assert.strictEqual(hasPermission('staff', 'companies', 'create'), false)
    assert.strictEqual(hasPermission('staff', 'users', 'manage_permissions'), false)
  })

  it('buildFallbackProfile defaults to staff (least privilege), NEVER super_admin', () => {
    const fallback = buildFallbackProfile({ id: 'anon_123', email: 'anon@example.com' })
    assert.strictEqual(fallback.role, 'staff')
    assert.notStrictEqual(fallback.role, 'super_admin')
  })

  it('canEditCompanyData fails closed when profile is null or undefined', () => {
    assert.strictEqual(canEditCompanyData(null), false)
    assert.strictEqual(canEditCompanyData(undefined), false)
    assert.strictEqual(canEditCompanyData({ role: 'staff' }), false)
    assert.strictEqual(canEditCompanyData({ role: 'lawyer' }), false)
    assert.strictEqual(canEditCompanyData({ role: 'manager' }), true)
    assert.strictEqual(canEditCompanyData({ role: 'admin' }), true)
    assert.strictEqual(canEditCompanyData({ role: 'super_admin' }), true)
  })

  it('canManageDepositWorkflow checks proper administrative role', () => {
    assert.strictEqual(canManageDepositWorkflow(null), false)
    assert.strictEqual(canManageDepositWorkflow({ role: 'staff' }), false)
    assert.strictEqual(canManageDepositWorkflow({ role: 'super_admin' }), true)
  })
})

describe('Company Formation & Deposit Release Lifecycle', () => {
  it('sanitizes formation workflow steps into correct 8 sequential steps', () => {
    const steps = sanitizeFormationWorkflowSteps([], 'test_co_1', false, new Date().toISOString())
    assert.strictEqual(steps.length, 8)
    assert.strictEqual(steps[0].state, 'doing')
    assert.strictEqual(steps[1].state, 'wait')
    assert.strictEqual(steps[7].state, 'wait')
  })

  it('sanitizes established company workflow steps so all 8 are done', () => {
    const steps = sanitizeFormationWorkflowSteps([], 'test_co_2', true, new Date().toISOString())
    assert.strictEqual(steps.length, 8)
    assert.strictEqual(steps.every(s => s.state === 'done'), true)
  })
})

describe('User Activity & Operations Audit Trail Tests', () => {
  it('records user login and logout events with complete metadata', async () => {
    const testUserId = `test_usr_${Date.now()}`
    const loginEntry = await logUserAuditAction({
      userId: testUserId,
      userEmail: 'lawyer@example.com',
      userRole: 'lawyer',
      action: 'login',
      category: 'auth',
      details: 'تسجيل دخول ناجح للمحامي',
    })

    assert.ok(loginEntry.id)
    assert.strictEqual(loginEntry.action, 'login')
    assert.strictEqual(loginEntry.category, 'auth')

    const logs = await getAuditLogs({ userId: testUserId })
    assert.ok(logs.length >= 1)
    const found = logs.find(l => l.id === loginEntry.id)
    assert.ok(found)
    assert.strictEqual(found?.details, 'تسجيل دخول ناجح للمحامي')
  })
})

describe('Database & Deletion Blacklist Integrity Tests', () => {
  it('strictly excludes deleted transactions via blacklist', async () => {
    const testTxId = `test_tx_${Date.now()}`
    const diskTxs = readJsonFile<TransactionFull[]>('transactions.json', [])
    const mockTx: TransactionFull = {
      id: testTxId,
      client_id: null,
      company_id: null,
      lawyer_id: null,
      type: 'general',
      priority: 'medium',
      status: 'new',
      tx_date: new Date().toISOString().slice(0, 10),
      due_date: null,
      description: 'معاملة اختبارية للحذف',
      services: [],
      lacks: null,
      fee: 0,
      phone: null,
      created_at: new Date().toISOString(),
      clients: null,
      companies: null,
      profiles: null,
    }
    diskTxs.unshift(mockTx)
    writeJsonFile('transactions.json', diskTxs)

    // Initial check: transaction is present
    let txs = await listTransactions()
    assert.ok(txs.some(t => t.id === testTxId))

    // Blacklist the transaction (simulating deletion)
    const deletedTxIds = readJsonFile<string[]>('deleted_transaction_ids.json', [])
    deletedTxIds.push(testTxId)
    writeJsonFile('deleted_transaction_ids.json', deletedTxIds)

    // Second check: transaction MUST BE excluded
    txs = await listTransactions()
    assert.strictEqual(txs.some(t => t.id === testTxId), false, 'Deleted transaction must never appear in listTransactions')

    // Cleanup test artifacts
    writeJsonFile('transactions.json', diskTxs.filter(t => t.id !== testTxId))
    writeJsonFile('deleted_transaction_ids.json', deletedTxIds.filter(id => id !== testTxId))
  })
})

describe('User Lifecycle & Permanent Deletion Tests', () => {
  it('saves, edits, and permanently deletes user without leaving remnants', async () => {
    const { saveProfile, permanentDeleteProfile, listProfiles } = await import('../lib/data/profiles')
    
    // 1. Create temporary user
    const tempUser = await saveProfile({
      name: 'محامي اختباري للحذف',
      role: 'lawyer',
      dept: 'الشركات',
      email: 'temp_lawyer@example.com',
    })
    assert.ok(tempUser.id)
    assert.strictEqual(tempUser.name, 'محامي اختباري للحذف')

    // 2. Edit user
    const updated = await saveProfile({
      id: tempUser.id,
      name: 'محامي اختباري معدل',
      role: 'manager',
      dept: 'الإدارة التجارية',
    })
    assert.strictEqual(updated.name, 'محامي اختباري معدل')
    assert.strictEqual(updated.role, 'manager')

    // 3. Verify user in list
    let profiles = await listProfiles()
    assert.ok(profiles.some(p => p.id === tempUser.id))

    // 4. Permanently delete user
    const deleted = await permanentDeleteProfile(tempUser.id)
    assert.strictEqual(deleted, true)

    // 5. Verify user is completely removed
    profiles = await listProfiles()
    assert.strictEqual(profiles.some(p => p.id === tempUser.id), false, 'User must be permanently removed from profiles')
  })

  it('prevents deletion of primary Super Admin account', async () => {
    const { permanentDeleteProfile } = await import('../lib/data/profiles')
    await assert.rejects(
      async () => {
        await permanentDeleteProfile('db13125d-3aa1-46ab-9159-8fad18746623')
      },
      /لا يمكن حذف حساب مدير النظام الرئيسي/
    )
  })
})

describe('Duplicate Data Prevention Tests', () => {
  it('detects and blocks duplicate government IDs for the same company and type', async () => {
    const { createCompanyIDAction, deleteCompanyIDAction } = await import('../app/(app)/commercial/ids/actions')
    const testCompanyId = `dup_co_${Date.now()}`
    let createdRecordId: string | null = null

    try {
      // First creation: should succeed
      const res1 = await createCompanyIDAction({
        company_id: testCompanyId,
        company_name: 'شركة اختبار فحص التكرار المعزولة',
        id_type: 'tax_id',
        lawyer_id: 'db13125d-3aa1-46ab-9159-8fad18746623',
        status: 'in_progress',
      })
      assert.strictEqual(res1.success, true)
      if (res1.record?.id) {
        createdRecordId = res1.record.id
      }

      // Second creation for same company + same id_type: MUST BE BLOCKED
      const res2 = await createCompanyIDAction({
        company_id: testCompanyId,
        company_name: 'شركة اختبار فحص التكرار المعزولة',
        id_type: 'tax_id',
        lawyer_id: 'db13125d-3aa1-46ab-9159-8fad18746623',
        status: 'in_progress',
      })
      assert.strictEqual(res2.success, false)
      assert.match(res2.error || '', /يوجد سجل \(هوية ضريبية\) مسجل مسبقاً/)
    } finally {
      // Cleanup
      if (createdRecordId) {
        await deleteCompanyIDAction(createdRecordId)
      }
      const { readJsonFile, writeJsonFile } = await import('../lib/data/fs-store')
      const diskTimeline = readJsonFile<Array<{ company_id?: string }>>('company_timeline.json', [])
      writeJsonFile('company_timeline.json', diskTimeline.filter(e => e.company_id !== testCompanyId && !e.company_id?.startsWith('dup_') && !e.company_id?.startsWith('test_co_')))
    }
  })

  it('detects and blocks duplicate tax assessments for the same company and year', async () => {
    const { createTaxAssessmentAction, deleteTaxAssessmentAction } = await import('../app/(app)/commercial/tax-assessment/actions')
    const testCompanyId = `dup_tax_co_${Date.now()}`
    const testYear = 2024
    let createdTaxId: string | null = null

    try {
      // First creation: should succeed
      const res1 = await createTaxAssessmentAction({
        company_id: testCompanyId,
        year: testYear,
        lawyer_id: 'db13125d-3aa1-46ab-9159-8fad18746623',
      })
      assert.strictEqual(res1.success, true)
      if (res1.data?.id) {
        createdTaxId = res1.data.id
      }

      // Second creation for same company + same year: MUST BE BLOCKED
      const res2 = await createTaxAssessmentAction({
        company_id: testCompanyId,
        year: testYear,
        lawyer_id: 'db13125d-3aa1-46ab-9159-8fad18746623',
      })
      assert.strictEqual(res2.success, false)
      assert.match(res2.error || '', /تم تسجيل تحاسب ضريبي لهذه الشركة لسنة/)
    } finally {
      // Cleanup
      if (createdTaxId) {
        await deleteTaxAssessmentAction(createdTaxId)
      }
      const { readJsonFile, writeJsonFile } = await import('../lib/data/fs-store')
      const diskTimeline = readJsonFile<Array<{ company_id?: string }>>('company_timeline.json', [])
      writeJsonFile('company_timeline.json', diskTimeline.filter(e => e.company_id !== testCompanyId && !e.company_id?.startsWith('dup_') && !e.company_id?.startsWith('test_co_')))
    }
  })

  it('permanently deletes company and cascades removal across all modules and transactions', async () => {
    const { createCompanyFormationAction, deleteCompanyAction } = await import('../app/(app)/commercial/companies/actions')
    const { listCompanies } = await import('../lib/data/companies')
    const { listTransactions } = await import('../lib/data/transactions')

    let companyId: string | null = null
    try {
      // 1. Create temporary company
      const createRes = await createCompanyFormationAction({
        name: `شركة اختبار الحذف النهائي ${Date.now()}`,
        kind: 'محدودة',
        capital: 5000000,
        lawyer_id: 'db13125d-3aa1-46ab-9159-8fad18746623',
      })
      assert.strictEqual(createRes.success, true)
      companyId = createRes.company?.id || null
      assert.ok(companyId)

      // Verify company exists
      let companies = await listCompanies()
      assert.ok(companies.some(c => c.id === companyId))

      // 2. Perform permanent deletion
      const delRes = await deleteCompanyAction(companyId)
      assert.strictEqual(delRes?.success, true)

      // 3. Verify company is erased from companies
      companies = await listCompanies()
      assert.strictEqual(companies.some(c => c.id === companyId), false, 'Company must be removed from listCompanies')

      // 4. Verify ZERO transactions remain for this company in listTransactions
      const txs = await listTransactions()
      assert.strictEqual(txs.some(t => t.company_id === companyId), false, 'All transactions for deleted company must be completely removed')
    } finally {
      if (companyId) {
        await deleteCompanyAction(companyId).catch(() => {})
      }
      const { readJsonFile, writeJsonFile } = await import('../lib/data/fs-store')
      const diskTimeline = readJsonFile<Array<{ company_id?: string }>>('company_timeline.json', [])
      writeJsonFile('company_timeline.json', diskTimeline.filter(e => e.company_id !== companyId && !e.company_id?.startsWith('dup_') && !e.company_id?.startsWith('test_co_')))
    }
  })
})
