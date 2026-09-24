'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getGeneralSettingsAction,
  updateGeneralSettingsAction,
  getWorkflowTemplatesAction,
  saveWorkflowTemplatesAction,
  type WorkflowTemplate,
  type WorkflowTemplateStep,
} from '@/app/(app)/settings/actions'
import type { Settings } from '@/types/database'
import { formatNumberWithCommas, parseNumberFromCommas } from '@/lib/constants'
import { usePermissions } from '@/lib/context/UserRoleContext'
import { useDragScroll } from '@/lib/hooks/useDragScroll'

export default function SettingsClient() {
  const { can } = usePermissions()
  const canEdit = can('users', 'manage_permissions')

  const [activeTab, setActiveTab] = useState<'general' | 'workflows' | 'shortcuts'>('workflows')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const workflowTabsScrollRef = useDragScroll<HTMLDivElement>({ speed: 1.4 })

  // General Settings State
  const [settings, setSettings] = useState<Settings>({
    id: 1,
    office_name: 'مكتب المحامي عبد الحسن الخزرجي',
    penalty_days: 37,
    penalty_warn: 7,
    penalty_daily: 50000,
    penalty_max: 5000000,
    currency: 'IQD',
    updated_at: new Date().toISOString(),
  })

  // Workflow Builder State
  const [templates, setTemplates] = useState<Record<string, WorkflowTemplate>>({})
  const [selectedTxKey, setSelectedTxKey] = useState<string>('formation')
  const [newStepLabel, setNewStepLabel] = useState('')
  const [newStepOwner, setNewStepOwner] = useState('الموظف المختص')
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [editingStepLabel, setEditingStepLabel] = useState('')
  const [editingStepOwner, setEditingStepOwner] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [stRes, wfRes] = await Promise.all([
        getGeneralSettingsAction(),
        getWorkflowTemplatesAction(),
      ])

      if (stRes.success && stRes.data) {
        setSettings(stRes.data)
      }
      if (wfRes.success && wfRes.data) {
        setTemplates(wfRes.data)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  const triggerToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMsg({ type, text })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    const res = await updateGeneralSettingsAction(settings)
    setSaving(false)
    if (res.success) {
      triggerToast('✓ تم حفظ وتحديث الإعدادات العامة للمكتب بنجاح')
    } else {
      triggerToast(res.error || 'تعذر حفظ الإعدادات', 'err')
    }
  }

  const activeTemplate = templates[selectedTxKey] || null

  const handleAddStep = () => {
    if (!newStepLabel.trim() || !activeTemplate) return
    const newStep: WorkflowTemplateStep = {
      id: `step_${Date.now()}`,
      label: newStepLabel.trim(),
      owner: newStepOwner.trim() || 'الموظف المختص',
      icon: 'task_alt',
    }

    const updated = {
      ...templates,
      [selectedTxKey]: {
        ...activeTemplate,
        steps: [...activeTemplate.steps, newStep],
      },
    }

    setTemplates(updated)
    setNewStepLabel('')
  }

  const handleDeleteStep = (stepId: string) => {
    if (!activeTemplate || activeTemplate.steps.length <= 1) {
      triggerToast('يجب الإبقاء على خطوة واحدة على الأقل في المسار', 'err')
      return
    }
    const updated = {
      ...templates,
      [selectedTxKey]: {
        ...activeTemplate,
        steps: activeTemplate.steps.filter(s => s.id !== stepId),
      },
    }
    setTemplates(updated)
  }

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (!activeTemplate) return
    const steps = [...activeTemplate.steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= steps.length) return

    const temp = steps[index]
    steps[index] = steps[targetIndex]
    steps[targetIndex] = temp

    setTemplates({
      ...templates,
      [selectedTxKey]: {
        ...activeTemplate,
        steps,
      },
    })
  }

  const handleStartEditStep = (step: WorkflowTemplateStep) => {
    setEditingStepId(step.id)
    setEditingStepLabel(step.label)
    setEditingStepOwner(step.owner)
  }

  const handleSaveEditStep = () => {
    if (!editingStepId || !editingStepLabel.trim() || !activeTemplate) return
    const updatedSteps = activeTemplate.steps.map(s =>
      s.id === editingStepId
        ? { ...s, label: editingStepLabel.trim(), owner: editingStepOwner.trim() || 'الموظف المختص' }
        : s
    )
    setTemplates({
      ...templates,
      [selectedTxKey]: {
        ...activeTemplate,
        steps: updatedSteps,
      },
    })
    setEditingStepId(null)
  }

  const handleCancelEditStep = () => {
    setEditingStepId(null)
  }

  const handleSaveWorkflows = async () => {
    if (!canEdit) return
    setSaving(true)
    const res = await saveWorkflowTemplatesAction(templates)
    setSaving(false)
    if (res.success) {
      triggerToast('✓ تم حفظ وتحديث قوالب مسارات سير العمل بنجاح')
    } else {
      triggerToast(res.error || 'فشل حفظ المسارات', 'err')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-10 h-10 border-3 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin" />
        <span className="text-xs font-bold text-[var(--text-3)]">جاري تحميل إعدادات النظام ومسارات العمل...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full text-right" dir="rtl">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-scale-in text-white ${
            toastMsg.type === 'ok' ? 'bg-emerald-600 border border-emerald-400/40 shadow-emerald-600/30' : 'bg-red-600 border border-red-400/40 shadow-red-600/30'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMsg.type === 'ok' ? 'check_circle' : 'error'}
          </span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-[var(--line-soft)]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-[#38BDF8] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-none">
            <span className="material-symbols-outlined text-[26px]">tune</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text)] tracking-tight">إعدادات النظام ومسارات العمل</h1>
            <p className="text-xs text-[var(--text-3)] font-medium mt-0.5">
              تخصيص قواعد ومحطات سير العمل لقسم المحدودة، والشركات، وضبط هوية المكتب
            </p>
          </div>
        </div>

        {/* Quick Nav Links to Users & Permissions */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings/users"
            className="px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs font-bold text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
            <span>المستخدمون</span>
          </Link>
          <Link
            href="/settings/permissions"
            className="px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs font-bold text-[var(--text-2)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">key</span>
            <span>الصلاحيات</span>
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-[var(--surface-2)] border border-[var(--glass-border)] rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('workflows')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'workflows'
              ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
              : 'text-[var(--text-3)] hover:text-[var(--text)]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_tree</span>
          <span>محرك مسارات سير العمل (Workflow Builder)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
              : 'text-[var(--text-3)] hover:text-[var(--text)]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">domain</span>
          <span>هوية المكتب وقواعد المهل</span>
        </button>
      </div>

      {/* TAB 1: WORKFLOW BUILDER */}
      {activeTab === 'workflows' && (
        <div className="flex flex-col gap-6">
          
          {/* Top Selection Ribbon for Transaction Types */}
          <div className="glass-card p-5 sm:p-6 rounded-[26px] bg-[var(--surface-glass)] backdrop-blur-[36px] border border-[var(--border)] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-extrabold text-[var(--text)]">اختر نوع المعاملة لتخصيص مسار عملها</h3>
                <p className="text-xs text-[var(--text-3)] mt-0.5">
                  يمكنك إضافة وتعديل وترتيب المحطات الخاصة بكل نوع معاملة في قسم المحدودة والأقسام التجارية
                </p>
              </div>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleSaveWorkflows}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>{saving ? 'جاري الحفظ...' : 'حفظ كافة المسارات'}</span>
                </button>
              )}
            </div>

            {/* Type Selector Pills (Drag Scrollable) */}
            <div ref={workflowTabsScrollRef} className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none select-none">
              {Object.keys(templates).map(key => {
                const item = templates[key]
                const isSelected = selectedTxKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTxKey(key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex-none cursor-pointer border ${
                      isSelected
                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white shadow-md shadow-blue-500/25'
                        : 'bg-[var(--surface-2)] border-[var(--line-soft)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {key === 'formation'
                        ? 'domain_add'
                        : key === 'share_sale'
                        ? 'swap_horiz'
                        : key === 'capital_increase'
                        ? 'trending_up'
                        : key === 'manager_change'
                        ? 'badge'
                        : key === 'address_change'
                        ? 'location_city'
                        : key === 'paper_attestation'
                        ? 'verified'
                        : 'task_alt'}
                    </span>
                    <span>{item.txLabel}</span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] num ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                    }`}>
                      {item.steps.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Workflow Pipeline Editor & Preview */}
          {activeTemplate && (
            <div className="glass-card p-5 sm:p-6 rounded-[26px] bg-[var(--surface-glass)] backdrop-blur-[36px] border border-[var(--border)] shadow-xs flex flex-col gap-6">
              
              {/* Header Info */}
              <div className="flex items-center justify-between border-b border-[var(--line-soft)] pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-black text-[var(--text)]">{activeTemplate.txLabel}</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-[#3B82F6] text-[10px] font-bold border border-blue-500/20">
                      {activeTemplate.steps.length} محطات معتمدة
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-3)] mt-1">{activeTemplate.description}</p>
                </div>
              </div>

              {/* Steps Visual Track (Live Blueprint Layout) */}
              <div className="space-y-3">
                <div className="text-xs font-black text-[var(--text-3)] mb-2">تسلسل خطوات المسار في النظام:</div>
                
                <div className="space-y-2.5">
                  {activeTemplate.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line-soft)] hover:border-[var(--accent)]/40 transition-all flex items-center justify-between gap-4 group"
                    >
                      {editingStepId === step.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-xs flex-none">
                            <span className="num">{idx + 1}</span>
                          </div>
                          <input
                            type="text"
                            className="input flex-1 h-10 text-xs px-3"
                            value={editingStepLabel}
                            onChange={e => setEditingStepLabel(e.target.value)}
                            placeholder="اسم المحطة"
                            autoFocus
                          />
                          <input
                            type="text"
                            className="input w-full sm:w-48 h-10 text-xs px-3"
                            value={editingStepOwner}
                            onChange={e => setEditingStepOwner(e.target.value)}
                            placeholder="الجهة المسؤولة"
                          />
                          <div className="flex items-center gap-1.5 flex-none">
                            <button
                              type="button"
                              onClick={handleSaveEditStep}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                              title="حفظ التعديل"
                            >
                              <span className="material-symbols-outlined text-[15px]">check</span>
                              <span>حفظ</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditStep}
                              className="px-3.5 py-2 rounded-xl bg-[var(--surface-3)] text-[var(--text-3)] hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                              title="إلغاء التعديل"
                            >
                              <span className="material-symbols-outlined text-[15px]">close</span>
                              <span>إلغاء</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Step Number & Details */}
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm flex-none shadow-xs">
                              <span className="num">{idx + 1}</span>
                            </div>
                            <div>
                              <div className="text-sm font-extrabold text-[var(--text)]">{step.label}</div>
                              <div className="text-[11px] text-[var(--text-3)] font-semibold mt-0.5 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[13px]">person</span>
                                <span>المسؤول: {step.owner}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Controls (Edit, Move Up, Move Down, Delete) */}
                          {canEdit && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditStep(step)}
                                className="w-8 h-8 rounded-xl bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[#3B82F6] hover:bg-[var(--surface)] border border-[var(--line-soft)] flex items-center justify-center transition-colors cursor-pointer"
                                title="تعديل اسم أو مسؤول المحطة"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveStep(idx, 'up')}
                                disabled={idx === 0}
                                className="w-8 h-8 rounded-xl bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[#3B82F6] hover:bg-[var(--surface)] border border-[var(--line-soft)] disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                                title="تحريك لأعلى"
                              >
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveStep(idx, 'down')}
                                disabled={idx === activeTemplate.steps.length - 1}
                                className="w-8 h-8 rounded-xl bg-[var(--surface-3)] text-[var(--text-2)] hover:text-[#3B82F6] hover:bg-[var(--surface)] border border-[var(--line-soft)] disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
                                title="تحريك لأسفل"
                              >
                                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStep(step.id)}
                                className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 flex items-center justify-center transition-colors cursor-pointer mr-2"
                                title="حذف هذه الخطوة"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Step Box */}
              {canEdit && (
                <div className="p-4 sm:p-4.5 rounded-2xl bg-[var(--surface-2)] border border-dashed border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
                  <input
                    type="text"
                    placeholder="اسم المحطة الجديدة (مثال: تدقيق المشاور القانوني، كتاب الضرائب...)"
                    value={newStepLabel}
                    onChange={e => setNewStepLabel(e.target.value)}
                    className="input grow bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-3)] border border-[var(--border)] focus:border-[#3B82F6] rounded-xl h-11 text-xs px-3.5"
                  />
                  <input
                    type="text"
                    placeholder="الجهة المسؤولة (مثال: الموظف المختص، مدير القسم...)"
                    value={newStepOwner}
                    onChange={e => setNewStepOwner(e.target.value)}
                    className="input w-full sm:w-56 bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-3)] border border-[var(--border)] focus:border-[#3B82F6] rounded-xl h-11 text-xs px-3.5"
                  />
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-5 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 flex-none cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>إضافة محطة</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERAL OFFICE SETTINGS */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneralSettings} className="glass-card p-5 sm:p-6 rounded-[26px] bg-[var(--surface-glass)] backdrop-blur-[36px] border border-[var(--border)] shadow-xs flex flex-col gap-6">
          <div className="border-b border-[var(--line-soft)] pb-4">
            <h3 className="text-base font-extrabold text-[var(--text)]">هوية المكتب وقواعد الاحتساب</h3>
            <p className="text-xs text-[var(--text-3)] mt-0.5">تعديل الاسم الرسمي المعتمد للمكتب وقواعد غرامات ومهل الوديعة المصرفية</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="field">
              <label className="text-xs font-bold text-[var(--text)]">اسم المكتب الرسمي</label>
              <input
                type="text"
                className="input"
                value={settings.office_name}
                onChange={e => setSettings({ ...settings, office_name: e.target.value })}
                required
                disabled={!canEdit}
              />
            </div>

            <div className="field">
              <label className="text-xs font-bold text-[var(--text)]">العملة الافتراضية</label>
              <input
                type="text"
                className="input"
                value={settings.currency}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                required
                disabled={!canEdit}
              />
            </div>

            <div className="field">
              <label className="text-xs font-bold text-[var(--text)]">مهلة إطلاق الوديعة للشركات الفردية (يوم)</label>
              <input
                type="number"
                className="input num"
                value={settings.penalty_days}
                onChange={e => setSettings({ ...settings, penalty_days: parseInt(e.target.value) || 37 })}
                required
                disabled={!canEdit}
              />
            </div>

            <div className="field">
              <label className="text-xs font-bold text-[var(--text)]">بدء التنبيه الأصفر قبل انتهاء المهلة (يوم)</label>
              <input
                type="number"
                className="input num"
                value={settings.penalty_warn}
                onChange={e => setSettings({ ...settings, penalty_warn: parseInt(e.target.value) || 7 })}
                required
                disabled={!canEdit}
              />
            </div>

            <div className="field">
              <label className="text-xs font-bold text-[var(--text)]">مبلغ الغرامة اليومية (د.ع)</label>
              <input
                type="text"
                className="input num"
                value={formatNumberWithCommas(settings.penalty_daily)}
                onChange={e => setSettings({ ...settings, penalty_daily: parseNumberFromCommas(e.target.value) })}
                required
                disabled={!canEdit}
              />
            </div>

            <div className="field">
              <label className="text-xs font-bold text-[var(--text)]">سقف الغرامة الأقصى (د.ع)</label>
              <input
                type="text"
                className="input num"
                value={formatNumberWithCommas(settings.penalty_max)}
                onChange={e => setSettings({ ...settings, penalty_max: parseNumberFromCommas(e.target.value) })}
                required
                disabled={!canEdit}
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end pt-4 border-t border-[var(--line-soft)]">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">save</span>
                <span>{saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
