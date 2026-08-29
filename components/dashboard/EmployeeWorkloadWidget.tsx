'use client'

import { Icon } from '@/components/ui/Icon'
import type { ProfileWithStats } from '@/lib/data/profiles'

interface Props {
  profiles: ProfileWithStats[]
  topLawyers?: Array<{ id: string; name: string; doneCount: number }>
}

export default function EmployeeWorkloadWidget({ profiles, topLawyers = [] }: Props) {
  const activeMembers = profiles.filter(p => p.active)

  return (
    <div className="card card-pad" style={{ background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="users" style={{ width: '20px', height: '20px' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              توزيع أحمال العمل وإنجاز المحامين (Employee Workload)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              تراقب حجم المعاملات الموكلة لكل عضو وإنجازه الشهر الحالي
            </span>
          </div>
        </div>

        <span className="tag tag-work">
          {activeMembers.length} أعضاء نشطين
        </span>
      </div>

      {/* Workload Cards per Team Member */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {activeMembers.map(member => {
          const topStat = topLawyers.find(l => l.name.includes(member.name) || member.name.includes(l.name))
          const doneCount = topStat ? topStat.doneCount : 0
          const mockActiveCount = member.role === 'admin' ? 2 : member.role === 'manager' ? 5 : 3

          return (
            <div
              key={member.id}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line-soft)',
                borderRadius: 'var(--r-md)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '13.5px', color: 'var(--text)' }}>{member.name}</strong>
                <span className="tag tag-mute" style={{ fontSize: '10.5px' }}>
                  {member.title || member.role}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)' }}>
                <span>معاملات جارية: <strong>{mockActiveCount}</strong></span>
                <span>إنجاز الشهر: <strong style={{ color: 'var(--ok)' }}>{doneCount}</strong></span>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '6px', borderRadius: '3px', background: 'var(--surface-2)', overflow: 'hidden', marginTop: '2px' }}>
                <div
                  style={{
                    width: `${Math.min(100, (mockActiveCount / 8) * 100)}%`,
                    height: '100%',
                    background: mockActiveCount > 6 ? 'var(--warn)' : 'var(--accent)',
                    borderRadius: '3px',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
