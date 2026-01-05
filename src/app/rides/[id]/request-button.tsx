"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface RequestRideButtonProps {
  rideId: string
  originalPrice: number | null
}

export function RequestRideButton({ rideId, originalPrice }: RequestRideButtonProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [proposedPrice, setProposedPrice] = useState(originalPrice?.toString() || "")
  const [showForm, setShowForm] = useState(false)

  const handleRequest = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/rides/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId,
          message,
          proposedPrice: proposedPrice ? parseFloat(proposedPrice) : null,
        }),
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

  // Check if proposed price differs from original
  const priceChanged = proposedPrice !== "" &&
    parseFloat(proposedPrice) !== originalPrice &&
    !(proposedPrice === "0" && originalPrice === null)

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
    <div className="space-y-4">
      {/* Price input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your offer per seat
        </label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder={originalPrice ? originalPrice.toString() : "0"}
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={proposedPrice}
            onChange={(e) => setProposedPrice(e.target.value)}
          />
        </div>
        {originalPrice !== null && (
          <p className="text-xs text-gray-500 mt-1">
            Original price: ${originalPrice}/seat
            {priceChanged && (
              <span className="text-amber-600 ml-2">
                (Different price - trip maker will review)
              </span>
            )}
          </p>
        )}
        {originalPrice === null && (
          <p className="text-xs text-gray-500 mt-1">
            This ride is free. Enter an amount if you&apos;d like to offer payment.
          </p>
        )}
      </div>

      {/* Message input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message (optional)
        </label>
        <textarea
          placeholder="Add a message for the driver"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleRequest}
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : priceChanged ? "Send Offer" : "Accept & Join"}
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
