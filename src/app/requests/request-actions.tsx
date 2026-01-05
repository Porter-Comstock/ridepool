"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface RequestActionsProps {
  requestId: string
  passengerId: string
  originalPrice: number | null
  proposedPrice: number | null
}

export function RequestActions({
  requestId,
  passengerId,
  originalPrice,
  proposedPrice,
}: RequestActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [counterPrice, setCounterPrice] = useState(originalPrice?.toString() || "")

  const pricesDiffer = proposedPrice !== null && proposedPrice !== originalPrice

  const handleAction = async (action: "accept" | "decline" | "counter") => {
    setIsLoading(true)

    try {
      const body: Record<string, unknown> = { requestId, action }
      if (action === "counter") {
        body.counterPrice = parseFloat(counterPrice)
      }

      const response = await fetch("/api/rides/request/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update request")
      }

      router.refresh()

      // If accepted, redirect to messaging
      if (action === "accept") {
        router.push(`/messages/${passengerId}`)
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update request")
    } finally {
      setIsLoading(false)
      setShowCounterForm(false)
    }
  }

  if (showCounterForm) {
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Your counter-offer per seat
          </label>
          <div className="relative">
            <span className="absolute left-2 top-1.5 text-gray-500 text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("counter")}
            disabled={isLoading || !counterPrice}
            className="px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send Counter"}
          </button>
          <button
            onClick={() => setShowCounterForm(false)}
            disabled={isLoading}
            className="px-3 py-1.5 text-gray-600 text-sm hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => handleAction("accept")}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {pricesDiffer ? `Accept $${proposedPrice}` : "Accept"}
      </button>
      {pricesDiffer && (
        <button
          onClick={() => setShowCounterForm(true)}
          disabled={isLoading}
          className="px-4 py-2 bg-amber-100 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
        >
          Counter
        </button>
      )}
      <button
        onClick={() => handleAction("decline")}
        disabled={isLoading}
        className="px-4 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  )
}
