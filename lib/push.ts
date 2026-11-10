import webpush from 'web-push'

export type PushTarget = { endpoint: string; p256dh: string; auth: string }
export type PushPayload = { title: string; body: string; url: string; tag: string }

let configured = false
function configure() {
  if (configured) return
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:hello@example.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '', process.env.VAPID_PRIVATE_KEY ?? '')
  configured = true
}

/** Send one notification. 'gone' means the device unsubscribed or the app was removed; forget it. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<'ok' | 'gone' | 'error'> {
  configure()
  try {
    await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, JSON.stringify(payload), { TTL: 60 * 60 })
    return 'ok'
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    return status === 404 || status === 410 ? 'gone' : 'error'
  }
}
