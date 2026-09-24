'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Mi } from '@/components/ui/Mi'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { updateMyProfileAction } from '@/app/(app)/settings/users/actions'
import type { Profile } from '@/types/database'

interface Props {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
}

const ROLE_AR_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام الأعلى',
  admin: 'مدير النظام',
  manager: 'مدير العمليات',
  lawyer: 'محامي ومستشار قانوني',
  staff: 'موظف إداري',
}

export default function UserProfileModal({ isOpen, onClose, profile }: Props) {
  useModalBodyLock(isOpen)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [age, setAge] = useState<string>(profile?.age ? String(profile.age) : '')
  const [gender, setGender] = useState<'male' | 'female' | string>(profile?.gender || 'male')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useModalBodyLock(isOpen, onClose)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (profile) {
      setName(profile.name || '')
      setPhone(profile.phone || '')
      setAge(profile.age ? String(profile.age) : '')
      setGender(profile.gender || 'male')
      setBirthDate(profile.birth_date || '')
      setAvatarUrl(profile.avatar_url || '')
    }
    setError(null)
    setSuccess(null)
  }, [profile, isOpen])

  if (!mounted || !isOpen) return null

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('يرجى كتابة الاسم الكامل')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await updateMyProfileAction({
      id: profile?.id || 'db13125d-3aa1-46ab-9159-8fad18746623',
      name: name.trim(),
      phone: phone.trim() || null,
      age: age ? Number(age) : null,
      gender,
      birth_date: birthDate || null,
      avatar_url: avatarUrl || null,
    })

    setLoading(false)

    if (res.success) {
      setSuccess('تم تحديث الملف الشخصي بنجاح ✓')
      setTimeout(() => {
        router.refresh()
        onClose()
      }, 700)
    } else {
      setError(res.error || 'تعذّر حفظ التغييرات')
    }
  }

  const displayName = name.trim() || profile?.name || 'مستخدم'
  const initial = displayName.charAt(0).toUpperCase() || '؟'
  const roleLabel = ROLE_AR_LABELS[profile?.role || 'super_admin'] || 'مدير النظام'

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div
        className="modal"
        style={
          {
            '--modal-max-w': 'var(--modal-sm, 480px)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
          } as React.CSSProperties
        }
      >
        {/* Modal Header */}
        <div className="modal-head" style={{ borderBottom: '1px solid var(--line-soft)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Icon name="user" style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>الملف الشخصي</h3>
              <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
                معلومات الحساب والبيانات الشخصية الخاصة بك
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn"
            aria-label="إغلاق"
          >
            <Icon name="x" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', overflowY: 'auto' }}>
          {error && (
            <div className="login-err" style={{ margin: 0 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '10px 14px', background: 'var(--ok-soft)', border: '1px solid var(--ok)', borderRadius: 'var(--r-md)', color: 'var(--ok)', fontSize: '13px', fontWeight: 700 }}>
              {success}
            </div>
          )}

          {/* Avatar Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '14px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface-2)',
              border: '1px solid var(--line-soft)',
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent) 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                  border: '3px solid var(--surface)',
                  boxShadow: 'var(--shadow-1)',
                }}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: '2px solid var(--surface)',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: '11px',
                }}
                title="تغيير الصورة الشخصية"
                aria-label="تغيير الصورة الشخصية"
              >
                <Mi n="photo_camera" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                {profile?.email || 'muntadhar@khazraji-law.com'}
              </div>
              <div style={{ marginTop: '2px' }}>
                <span className="tag tag-blue" style={{ fontSize: '10.5px', fontWeight: 700 }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div className="field">
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
                الاسم الكامل *
              </label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="اسم المستخدم..."
                required
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
                رقم الهاتف
              </label>
              <input
                type="text"
                className="input num"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07700000000"
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
                العمر (بالسنوات)
              </label>
              <input
                type="number"
                min="18"
                max="100"
                className="input num"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="مثال: 32"
              />
            </div>

            <div className="field">
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '5px' }}>
                الجنس
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--r-md)',
                    border: gender === 'male' ? '1.5px solid var(--accent)' : '1px solid var(--line-soft)',
                    background: gender === 'male' ? 'var(--accent-soft)' : 'var(--surface-2)',
                    color: gender === 'male' ? 'var(--accent)' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Mi n="male" />ذكر
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--r-md)',
                    border: gender === 'female' ? '1.5px solid #ec4899' : '1px solid var(--line-soft)',
                    background: gender === 'female' ? 'rgba(236, 72, 153, 0.1)' : 'var(--surface-2)',
                    color: gender === 'female' ? '#ec4899' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Mi n="female" />أنثى
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--line-soft)', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
              disabled={loading}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: '130px', fontWeight: 700 }}
            >
              {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
