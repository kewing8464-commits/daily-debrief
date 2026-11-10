// Daily Debrief service worker: shows reminders and opens the debrief when one is tapped.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  const title = data.title || 'Daily Debrief'
  const badge = self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : Promise.resolve()
  event.waitUntil(Promise.all([
    self.registration.showNotification(title, {
      body: data.body || 'Vibe check 🌙',
      tag: data.tag || 'debrief',
      icon: '/icons/192',
      badge: '/icons/192',
      data: { url: data.url || '/' },
    }),
    badge,
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if ('focus' in w) {
        await w.focus()
        if ('navigate' in w) return w.navigate(url)
        return
      }
    }
    return self.clients.openWindow(url)
  })())
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
