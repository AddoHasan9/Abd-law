/** مفتاح VAPID العام — عام بطبيعته (يُرسل للمتصفح عند الاشتراك). الخاص في جدول app_secrets على الخادم. */
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKJDEbfHBbB52kUQ7SXKwcIIhLiEWEs7hHl8Elv9ct5rUkccCdjfMNDpjCQglAEL6IJuKmnzc7Af8Kr6L26ssfw'

export interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
}
