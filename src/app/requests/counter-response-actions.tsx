"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

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

  const handleAction = async (action: "accept" | "decline") => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/rides/request/respond-counter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
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

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction("accept")}
        disabled={isLoading}
        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {isLoading ? "..." : `Accept $${counterPrice}`}
      </button>
      <button
        onClick={() => handleAction("decline")}
        disabled={isLoading}
        className="px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
      >
        Decline
      </button>
    </div>
  )
}
