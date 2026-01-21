"use client"

import { useState } from "react"
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js"

interface PaymentFormProps {
  rideRequestId: string
  amount: number
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({
  rideRequestId,
  amount,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Confirm the setup intent with Stripe
      const { error: stripeError } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      })

      if (stripeError) {
        setError(stripeError.message || "An error occurred")
        setLoading(false)
        return
      }

      // Notify our backend that the card was saved
      const response = await fetch("/api/stripe/setup-intent/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideRequestId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to confirm payment setup")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">
          Your card will be saved and charged <strong>${amount.toFixed(2)}</strong> at the scheduled departure time.
        </p>
      </div>

      <PaymentElement />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 px-4 py-2 bg-[#821019] text-white rounded-lg font-medium hover:bg-[#6a0d14] disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Card"}
        </button>
      </div>
    </form>
  )
}
