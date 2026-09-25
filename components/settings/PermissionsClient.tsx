'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { UserRole } from '@/types/database'
import {
  getRolePermissionsAction,
  saveRolePermissionsAction,
  type RolePermissions
} from '@/app/(app)/settings/users/actions'

const ROLE_NAMES: Record<UserRole, string> = {
  super_admin: 'مدير النظام الأعلى',
  admin: 'مدير النظام',
  manager: 'مدير العمليات',
  lawyer: 'محامي ومستشار',
  staff: 'موظف إداري',
}

const CATEGORY_NAMES: Record<keyof RolePermissions, { title: string; desc: string }> = {
  companies: { title: 'قسم الشركات والتأسيس', desc: 'استعراض وإضافة وتعديل وحذف سجلات وتأسيس الشركات' },
  transactions: { title: 'إدارة المعاملات والمهام التجاريّة', desc: 'استعراض وإضافة وتعديل وإغلاق وحذف المعاملات والمهام' },
  government_ids: { title: 'الهويات والتراخيص', desc: 'استعراض وإضافة وتجديد وحذف الهويات والرخص' },
  financial_statements: { title: 'القوائم والحسابات الختامية', desc: 'استعراض وإضافة وتقديم وحذف الحسابات الختامية للشركات' },
  deposits: { title: 'إطلاق الودائع المصرفية', desc: 'استعراض وإضافة وإطلاق ودائع التأسيس للشركات' },
  reports: { title: 'التقارير والأداء التشغيلي', desc: 'استعراض وتصدير التقارير المالية والإنجاز وسجل خطوات العمل' },
  notifications: { title: 'مركز التنبيهات والإشعارات', desc: 'استعراض وإخفاء تنبيهات الغرامات والمهل القانونية' },
  users: { title: 'إدارة المستخدمين والأذونات', desc: 'إضافة وتعديل وحذف حسابات المستخدمين وتعديل مصفوفة الصلاحيات' },
}

export default function PermissionsClient() {
  const router = useRouter()
  const [version, setVersion] = useState(0)
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin')
  const [perms, setPerms] = useState<Record<UserRole, RolePermissions> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const res = await getRolePermissionsAction()
      if (res.success) {
        setPerms(res.data)
        setVersion(res.version)
      }
      else setMessage({ type: 'err', text: res.error || 'تعذر تحميل الصلاحيات' })
      setLoading(false)
    }
    load()
  }, [])

  const handleToggle = (cat: keyof RolePermissions, key: string) => {
    if (!perms) return
    const rolePerms = perms[selectedRole]
    const catPerms = rolePerms[cat] as Record<string, boolean>

    const next = {
      ...perms,
      [selectedRole]: {
        ...rolePerms,
        [cat]: {
          ...catPerms,
          [key]: !catPerms[key],
        },
      },
    }

    setPerms(next)
  }

  const handleSave = async () => {
    if (!perms) return
    setSaving(true)
    setMessage(null)
    const res = await saveRolePermissionsAction(perms, version)
    setSaving(false)

    if (res.success) {
      toast.success('تم حفظ الصلاحيات')
      setVersion(res.version)
      setPerms(res.data)
      router.refresh()
      setMessage({ type: 'ok', text: 'تم حفظ وتطبيق مصفوفة الصلاحيات بنجاح' })
      setTimeout(() => setMessage(null), 3500)
    } else {
      setMessage({ type: 'err', text: res.error || 'حدث خطأ أثناء حفظ الصلاحيات' })
    }
  }

  if (loading || !perms) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
        {loading ? 'جاري تحميل مصفوفة الصلاحيات...' : message?.text || 'تعذر تحميل الصلاحيات'}
      </div>
    )
  }

  const currentRolePerms = perms[selectedRole]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            مصفوفة الصلاحيات والأذونات الخماسية
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0' }}>
            تخصيص وتحديد أذونات الوصول لكل دور من الأدوار الـ 5 المعتمدة في النظام بشكل ديناميكي ومباشر.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: '8px 18px', fontSize: '13px' }}
        >
          <Icon name="check" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ مصفوفة الصلاحيات'}</span>
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--r-md)',
            background: message.type === 'ok' ? 'var(--ok-soft)' : 'var(--bad-soft)',
            color: message.type === 'ok' ? 'var(--ok)' : 'var(--bad)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Role Selection Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '10px', flexWrap: 'wrap' }}>
        {(['super_admin', 'admin', 'manager', 'lawyer', 'staff'] as UserRole[]).map(role => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`btn ${selectedRole === role ? 'btn-primary' : 'btn-quiet'}`}
            style={{ fontSize: '13px', padding: '8px 16px', fontWeight: 700 }}
          >
            {ROLE_NAMES[role]}
          </button>
        ))}
      </div>

      {/* Role Notice */}
      <div
        style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          fontSize: '13px',
          color: 'var(--text-2)',
        }}
      >
        أنت تقوم حالياً بتعديل الأذونات الخاصة بـ: <strong style={{ color: 'var(--accent)' }}>{ROLE_NAMES[selectedRole]}</strong>
        {selectedRole === 'super_admin' && ' (يمتلك مدير النظام الأعلى كافة الأذونات المطلقة بصورة دائمية)'}
      </div>

      {/* Permissions Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {(Object.keys(CATEGORY_NAMES) as Array<keyof RolePermissions>).map(catKey => {
          const info = CATEGORY_NAMES[catKey]
          const catPerms = currentRolePerms ? (currentRolePerms[catKey] as Record<string, boolean>) : {}

          return (
            <div
              key={catKey}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '20px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '18px',
              }}
            >
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {info.title}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '4px 0 0 0' }}>
                  {info.desc}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--line-soft)' }}>
                {Object.keys(catPerms).map(permKey => {
                  const isChecked = catPerms[permKey]

                  return (
                    <label
                      key={permKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: selectedRole === 'super_admin' ? 'not-allowed' : 'pointer',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: 'var(--surface-2)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      <span>
                        {permKey === 'view' && 'عرض (View)'}
                        {permKey === 'create' && 'إضافة (Create)'}
                        {permKey === 'edit' && 'تعديل (Edit)'}
                        {permKey === 'delete' && 'حذف (Delete)'}
                        {permKey === 'close' && 'إغلاق المعاملة (Close)'}
                        {permKey === 'renew' && 'تجديد (Renew)'}
                        {permKey === 'submit' && 'تقديم الحسابات (Submit)'}
                        {permKey === 'release' && 'إطلاق الوديعة (Release)'}
                        {permKey === 'export' && 'تصدير التقارير (Export)'}
                        {permKey === 'dismiss' && 'إخفاء التنبيهات (Dismiss)'}
                        {permKey === 'create_users' && 'إضافة مستخدمين (Create Users)'}
                        {permKey === 'edit_users' && 'تعديل مستخدمين (Edit Users)'}
                        {permKey === 'delete_users' && 'حذف مستخدمين (Delete Users)'}
                        {permKey === 'manage_permissions' && 'إدارة الصلاحيات (Manage Permissions)'}
                      </span>

                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={selectedRole === 'super_admin'}
                        onChange={() => handleToggle(catKey, permKey)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
