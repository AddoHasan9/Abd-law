/* عامل الإشعارات — يستقبل تنبيهات الهاتف ويعرضها حتى والموقع مغلق */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'مكتب الخزرجي', body: event.data ? event.data.text() : '' } }
  const title = data.title || 'مكتب الخزرجي'
  const isReminder = String(data.tag || '').startsWith('reminder') || data.tag === 'test'
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      // بصوت النظام (ليس صامتاً) + اهتزاز؛ التذكير يبقى ظاهراً حتى يُغلق (الحاسبة)
      silent: false,
      vibrate: [220, 120, 220, 120, 320],
      requireInteraction: isReminder,
      timestamp: Date.now(),
      data: { url: data.url || '/dashboard' },
    })
    // إن كان الموقع مفتوحاً: نبلّغ الصفحة لتشغيل نغمة وإظهار رسالة
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) c.postMessage({ type: 'push', title, body: data.body || '', url: data.url || '/dashboard' })
  })())
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || '/dashboard', self.location.origin).href
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if (c.url.startsWith(self.location.origin)) {
        await c.focus()
        if ('navigate' in c) await c.navigate(target)
        return
      }
    }
    await self.clients.openWindow(target)
  })())
})
