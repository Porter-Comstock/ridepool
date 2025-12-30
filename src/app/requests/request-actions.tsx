"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface RequestActionsProps {
  requestId: string
  passengerId: string
}

export function RequestActions({ requestId, passengerId }: RequestActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (action: "accept" | "decline") => {
    setIsLoading(true)

    try {
      const response = await fetch("/api/rides/request/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      })

      if (!response.ok) {
        throw new Error("Failed to update request")
      }

      router.refresh()

      // If accepted, redirect to messaging
      if (action === "accept") {
        router.push(`/messages/${passengerId}`)
      }
    } catch (error) {
      alert("Failed to update request")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction("accept")}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        Accept
      </button>
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
