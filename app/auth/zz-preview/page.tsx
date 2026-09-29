import { Suspense } from 'react'
import { UserRoleProvider } from '@/lib/context/UserRoleContext'
import { emptyPermissionsMatrix } from '@/lib/permissions'
import { WORKFLOW } from '@/lib/constants'
import CompaniesClient from '@/components/commercial/CompaniesClient'
const steps = (id: string) => WORKFLOW.map((w, i) => ({ id: `${id}-${i}`, company_id: id, step_key: w.id, step_order: i + 1, label: w.label, owner_kind: w.owner, state: 'done', done_by: null, done_at: null }))
const c = [{ id: '9', name: 'شركة مؤسسة للتجربة', kind: 'محدودة', task_no: 'TJ-9', capital: 1e9, cert_no: '1', cert_date: '2025-01-02', status: 'established', deposit_released: true, created_at: '2026-09-01', external: false, managers: [], shareholders: [], workflow_steps: steps('9') }] as never
export default function P() {
  return <UserRoleProvider profile={{ id: 'u', name: 'م', role: 'super_admin', active: true } as never} permissions={emptyPermissionsMatrix()}><div id="view-root" style={{ padding: 12 }}><div className="view"><Suspense><CompaniesClient initialCompanies={c} /></Suspense></div></div></UserRoleProvider>
}
