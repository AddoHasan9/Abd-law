import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { listCompanies } from '../lib/data/companies'
import { uploadCompanyBarcodeAction, updateDepositStageStateAction } from '../app/(app)/commercial/deposits/actions'
import { readJsonFile, writeJsonFile } from '../lib/data/fs-store'
import type { CompanyWithWorkflow } from '../types/database'

describe('End-to-End Company Lifecycle & Auto-Promotion Test', () => {
  const testCompanyId = `test_co_${Date.now()}`

  it('correctly creates a forming company and reflects in listCompanies', async () => {
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
    const newCo: CompanyWithWorkflow = {
      id: testCompanyId,
      name: 'شركة اختبار التأسيس المحدودة',
      kind: 'محدودة المسؤولية',
      capital: 5000000,
      status: 'forming',
      deposit_released: false,
      created_at: new Date().toISOString(),
      workflow_steps: [],
    }
    diskCompanies.unshift(newCo)
    writeJsonFile('companies.json', diskCompanies)

    const list = await listCompanies()
    const found = list.find(c => c.id === testCompanyId)
    assert.ok(found, 'Company should be found in listCompanies')
    assert.strictEqual(found?.status, 'forming')
    assert.strictEqual(found?.deposit_released, false)
  })

  it('promotes company to established when barcode is uploaded / deposit released', async () => {
    // Simulate barcode upload on deposit stage 4
    await uploadCompanyBarcodeAction(`stage_barcode_${testCompanyId}`, testCompanyId, 'data:image/png;base64,mockBarcode')

    const list = await listCompanies()
    const found = list.find(c => c.id === testCompanyId)
    assert.ok(found, 'Company should exist after barcode upload')
    assert.strictEqual(found?.status, 'established', 'Company status must become established')
    assert.strictEqual(found?.deposit_released, true, 'deposit_released must be true')

    // Clean up test company
    const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', []).filter(c => c.id !== testCompanyId)
    writeJsonFile('companies.json', diskCompanies)
    const diskDeps = readJsonFile<Array<{ company_id: string }>>('deposits.json', []).filter(d => d.company_id !== testCompanyId)
    writeJsonFile('deposits.json', diskDeps)
  })
})
