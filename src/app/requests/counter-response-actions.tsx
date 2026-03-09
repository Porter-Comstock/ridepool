"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CardSelector } from "@/components/card-selector"

interface CounterResponseActionsProps {
  requestId: string
  counterPrice: number
}

export function CounterResponseActions({
  requestId,
  counterPrice,
}: CounterResponseActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showCardSelector, setShowCardSelector] = useState(false)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)

  const handleCardSelected = useCallback((id: string) => {
    setPaymentMethodId(id)
  }, [])

  const handleAccept = async () => {
    if (!paymentMethodId) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/rides/request/respond-counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept", paymentMethodId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to respond to counter-offer")
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to respond to counter-offer")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecline = async () => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/rides/request/respond-counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "decline" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to respond to counter-offer")
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to respond to counter-offer")
    } finally {
      setIsLoading(false)
    }
  }

  if (showCardSelector) {
    return (
      <div className="space-y-3">
        <CardSelector
          agreedPrice={counterPrice}
          onCardSelected={handleCardSelected}
        />
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={isLoading || !paymentMethodId}
            className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "..." : `Confirm & Accept $${counterPrice}`}
          </button>
          <button
            onClick={() => setShowCardSelector(false)}
            disabled={isLoading}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => setShowCardSelector(true)}
        disabled={isLoading}
        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? "..." : `Accept $${counterPrice}`}
      </button>
      <button
        onClick={handleDecline}
        disabled={isLoading}
        className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  )
}
