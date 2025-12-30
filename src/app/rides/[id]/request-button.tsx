"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function RequestRideButton({ rideId }: { rideId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [showForm, setShowForm] = useState(false)

  const handleRequest = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId, message }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to request ride")
      }

      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Request to Join
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <textarea
        placeholder="Add a message for the driver (optional)"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={handleRequest}
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send Request"}
        </button>
        <button
          onClick={() => setShowForm(false)}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
