"use client"

import { useState, useEffect } from "react"

interface ConnectStatus {
  connected: boolean
  onboardingComplete: boolean
  chargesEnabled: boolean
}

export function StripeConnectButton() {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/stripe/connect/status")
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error("Error checking status:", error)
    } finally {
      setLoading(false)
    }
  }

  const startOnboarding = async () => {
    setActionLoading(true)
    try {
      // First, create an account if needed
      const createResponse = await fetch("/api/stripe/connect/create-account", {
        method: "POST",
      })
      if (!createResponse.ok) {
        throw new Error("Failed to create account")
      }

      // Then get the onboarding link
      const linkResponse = await fetch("/api/stripe/connect/onboarding-link", {
        method: "POST",
      })
      if (!linkResponse.ok) {
        throw new Error("Failed to get onboarding link")
      }

      const { url } = await linkResponse.json()
      window.location.href = url
    } catch (error) {
      console.error("Error starting onboarding:", error)
      alert("Failed to start setup. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  const openDashboard = async () => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/stripe/connect/dashboard-link", {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to get dashboard link")
      }

      const { url } = await response.json()
      window.open(url, "_blank")
    } catch (error) {
      console.error("Error opening dashboard:", error)
      alert("Failed to open dashboard. Please try again.")
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>
    )
  }

  if (status?.onboardingComplete) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium text-green-800">
            Payment setup complete
          </span>
        </div>
        <p className="text-sm text-green-700 mb-3">
          You can receive payments for your rides.
        </p>
        <button
          onClick={openDashboard}
          disabled={actionLoading}
          className="text-sm text-green-700 hover:text-green-800 font-medium disabled:opacity-50"
        >
          {actionLoading ? "Opening..." : "View Stripe Dashboard →"}
        </button>
      </div>
    )
  }

  if (status?.connected && !status?.onboardingComplete) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span className="font-medium text-yellow-800">Setup incomplete</span>
        </div>
        <p className="text-sm text-yellow-700 mb-3">
          Complete your Stripe setup to receive payments.
        </p>
        <button
          onClick={startOnboarding}
          disabled={actionLoading}
          className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
        >
          {actionLoading ? "Loading..." : "Complete Setup"}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-3">
        Connect your bank account to receive payments when you drive others.
      </p>
      <button
        onClick={startOnboarding}
        disabled={actionLoading}
        className="bg-[#821019] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6a0d14] disabled:opacity-50"
      >
        {actionLoading ? "Loading..." : "Set Up Payments"}
      </button>
    </div>
  )
}
