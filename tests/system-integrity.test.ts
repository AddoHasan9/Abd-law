import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hasPermission, getRolePermissionsMatrix } from '../lib/permissions'
import { buildFallbackProfile } from '../lib/profile-fallback'
import { canEditCompanyData, canManageDepositWorkflow } from '../lib/rbac'
import { sanitizeFormationWorkflowSteps } from '../lib/constants'

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
