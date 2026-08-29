/**
 * السجل الزمني الدائم للشركة (Company Timeline)
 * ------------------------------------------------------------
 * دالة مساعدة خادمية فقط — تُستدعى من داخل إجراءات الخادم الأخرى
 * (تأسيس شركة، إطلاق وديعة، إصدار هوية، تكليف حسابات ختامية...)
 * لتسجيل كل حدث مهم تلقائياً بلا أي إدخال يدوي.
 * تدعم التخزين المزدوج (Supabase + Disk JSON) بدون رمي أي شاشة خطأ حمراء.
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { TimelineEventType, ViewCompanyTimeline } from '@/types/database'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'

export type { TimelineEventType }
export type TimelineEvent = ViewCompanyTimeline

/** يسجّل حدثاً في السجل الزمني الدائم للشركة — يحفظ على القرص والمستودع بلا أي شاشة خطأ */
export async function logTimelineEvent(payload: {
  company_id: string
  event_type: TimelineEventType | string
  title: string
  description?: string
  actor_name?: string
  related_link?: string
}) {
  const eventId = 'tl_' + Math.random().toString(36).substring(2, 9)
  const newEvent: TimelineEvent = {
    id: eventId,
    company_id: payload.company_id,
    event_type: payload.event_type,
    title: payload.title,
    description: payload.description || null,
    actor_name: payload.actor_name || null,
    related_link: payload.related_link || null,
    created_at: new Date().toISOString(),
  }

  // 1. التخزين القرصي المباشر بدعم دوام البيانات
  try {
    const diskEvents = readJsonFile<TimelineEvent[]>('company_timeline.json', [])
    diskEvents.unshift(newEvent)
    writeJsonFile('company_timeline.json', diskEvents)
  } catch (err) {
    console.warn('logTimelineEvent disk notice:', err)
  }

  // 2. الحفظ السحابي في Supabase
  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('company_timeline').insert({
      id: eventId,
      company_id: payload.company_id,
      event_type: payload.event_type,
      title: payload.title,
      description: payload.description || null,
      actor_name: payload.actor_name || null,
      related_link: payload.related_link || null,
    })
    if (error) {
      console.warn('logTimelineEvent Supabase notice:', error.message)
    }
  } catch (err) {
    console.warn('logTimelineEvent Supabase exception:', err)
  }
}

/** يجلب السجل الزمني الكامل لشركة، الأحدث أولاً مع دمج التخزين القرصي */
export async function getCompanyTimeline(companyId: string): Promise<TimelineEvent[]> {
  const diskEvents = readJsonFile<TimelineEvent[]>('company_timeline.json', [])
  const companyDiskEvents = diskEvents.filter(e => e.company_id === companyId)

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('company_timeline')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error || !data) {
      return companyDiskEvents
    }

    const map = new Map<string, TimelineEvent>()
    companyDiskEvents.forEach(e => map.set(e.id, e))
    ;(data as TimelineEvent[]).forEach(e => map.set(e.id, e))

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )
  } catch (err) {
    console.warn('getCompanyTimeline exception fallback:', err)
    return companyDiskEvents
  }
}
