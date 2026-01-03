import webpush from "web-push"
import { prisma } from "./prisma"

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:support@gate-rides.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  data?: Record<string, unknown>
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    url: payload.url || "/dashboard",
    data: payload.data,
  })

  const sendPromises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        notificationPayload
      )
    } catch (error: unknown) {
      // If subscription is expired or invalid, remove it
      if (
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        (error.statusCode === 404 || error.statusCode === 410)
      ) {
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        })
      }
      console.error(`Failed to send notification to ${subscription.endpoint}:`, error)
    }
  })

  await Promise.all(sendPromises)
}

/**
 * Send push notification to all subscribed users except one (usually the sender)
 */
export async function sendPushToAllExcept(
  excludeUserId: string,
  payload: NotificationPayload
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      userId: { not: excludeUserId },
    },
  })

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    url: payload.url || "/dashboard",
    data: payload.data,
  })

  const sendPromises = subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        notificationPayload
      )
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "statusCode" in error &&
        (error.statusCode === 404 || error.statusCode === 410)
      ) {
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        })
      }
      console.error(`Failed to send notification to ${subscription.endpoint}:`, error)
    }
  })

  await Promise.all(sendPromises)
}
