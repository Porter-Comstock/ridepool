"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function CancelRideButton({ rideId }: { rideId: string }) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async () => {
    setIsCancelling(true)

    try {
      const response = await fetch(`/api/rides/${rideId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel ride")
      }

      router.push("/dashboard")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong")
      setIsConfirming(false)
    } finally {
      setIsCancelling(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={isCancelling}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isCancelling ? "Cancelling..." : "Confirm Cancel"}
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg font-medium hover:bg-red-200 transition-colors"
    >
      Cancel Ride
    </button>
  )
}
