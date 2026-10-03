import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hasPermission } from '../lib/permissions'
import { buildFallbackProfile } from '../lib/profile-fallback'
import { canEditCompanyData, canManageDepositWorkflow } from '../lib/rbac'
import { sanitizeFormationWorkflowSteps } from '../lib/constants'
import { logUserAuditAction, getAuditLogs } from '../lib/data/audit'
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
})
