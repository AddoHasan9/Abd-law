import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { listCompanies } from '../lib/data/companies'
import { uploadCompanyBarcodeAction, updateDepositStageStateAction } from '../app/(app)/commercial/deposits/actions'
import { readJsonFile, writeJsonFile } from '../lib/data/fs-store'
import type { CompanyWithWorkflow } from '../types/database'

describe('End-to-End Company Lifecycle & Auto-Promotion Test', () => {
  const testCompanyId = `test_co_${Date.now()}`

  it('correctly creates a forming company and reflects in listCompanies', async () => {
    try {
      const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', [])
      const newCo: CompanyWithWorkflow = {
        id: testCompanyId,
        task_no: null,
        client_id: null,
        name: `شركة اختبار التأسيس المحدودة ${Date.now()}`,
        name_en: null,
        kind: 'محدودة المسؤولية',
        capital: 5000000,
        manager: null,
        cert_no: null,
        cert_date: null,
        deposit_released: false,
        activity: null,
        address: null,
        phone: null,
        lacks: null,
        external: false,
        status: 'forming',
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
    } finally {
      // Clean up in case of early assertion failure
    }
  })

  it('promotes company to established when barcode is uploaded / deposit released', async () => {
    try {
      // Simulate barcode upload on deposit stage 4
      await uploadCompanyBarcodeAction(`stage_barcode_${testCompanyId}`, testCompanyId, 'data:image/png;base64,mockBarcode')

      const list = await listCompanies()
      const found = list.find(c => c.id === testCompanyId)
      assert.ok(found, 'Company should exist after barcode upload')
      assert.strictEqual(found?.status, 'established', 'Company status must become established')
      assert.strictEqual(found?.deposit_released, true, 'deposit_released must be true')
    } finally {
      // Guaranteed clean up of test companies, deposits, and timeline
      const diskCompanies = readJsonFile<CompanyWithWorkflow[]>('companies.json', []).filter(c => c.id !== testCompanyId && !c.id.startsWith('test_co_'))
      writeJsonFile('companies.json', diskCompanies)
      const diskDeps = readJsonFile<Array<{ company_id: string }>>('deposits.json', []).filter(d => d.company_id !== testCompanyId && !d.company_id?.startsWith('test_co_'))
      writeJsonFile('deposits.json', diskDeps)
      const diskTimeline = readJsonFile<Array<{ company_id: string }>>('company_timeline.json', []).filter(t => t.company_id !== testCompanyId && !t.company_id?.startsWith('test_co_'))
      writeJsonFile('company_timeline.json', diskTimeline)
    }
  })
})
