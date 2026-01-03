"use client"

import { useState, useEffect } from "react"
import { IOSInstallPrompt } from "./ios-install-prompt"

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isIOSSafari, setIsIOSSafari] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check platform
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
    const standalone = window.matchMedia("(display-mode: standalone)").matches

    setIsIOSSafari(isIOS && isSafari)
    setIsStandalone(standalone)

    // Check if notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      return
    }

    // Check current permission status
    if (Notification.permission === "granted") {
      checkSubscription()
      return
    }

    // Check if prompt was dismissed
    const dismissed = localStorage.getItem("notification-prompt-dismissed")
    if (dismissed) return

    // Show prompt after a delay
    const timer = setTimeout(() => {
      // For iOS Safari not installed, don't show notification prompt
      // The IOSInstallPrompt will show instead
      if (isIOS && isSafari && !standalone) return

      setShowPrompt(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error("Error checking subscription:", error)
    }
  }

  async function handleEnableNotifications() {
    try {
      const permission = await Notification.requestPermission()

      if (permission !== "granted") {
        setShowPrompt(false)
        return
      }

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      // Send subscription to server
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      })

      if (response.ok) {
        setIsSubscribed(true)
        setShowPrompt(false)
      }
    } catch (error) {
      console.error("Error enabling notifications:", error)
    }
  }

  function handleDismiss() {
    localStorage.setItem("notification-prompt-dismissed", "true")
    setShowPrompt(false)
  }

  // Show iOS install prompt for iOS Safari users not in standalone mode
  if (isIOSSafari && !isStandalone) {
    return <IOSInstallPrompt />
  }

  if (!showPrompt || isSubscribed) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-40">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#821019] rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Enable Notifications</h3>
          <p className="text-sm text-gray-600 mt-1">
            Get notified about new rides, requests, and messages.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          Not now
        </button>
        <button
          onClick={handleEnableNotifications}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#821019] rounded-lg hover:bg-[#6a0d14]"
        >
          Enable
        </button>
      </div>
    </div>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}
