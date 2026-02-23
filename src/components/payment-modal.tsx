"use client"

import { useState, useEffect } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements } from "@stripe/react-stripe-js"
import { PaymentForm } from "./payment-form"

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
)

interface PaymentModalProps {
  rideRequestId: string
  amount: number
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function PaymentModal({
  rideRequestId,
  amount,
  isOpen,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && !clientSecret) {
      fetchSetupIntent()
    }
  }, [isOpen])

  const fetchSetupIntent = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideRequestId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to initialize payment")
      }

      const { clientSecret } = await response.json()
      setClientSecret(clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Add Payment Method
        </h2>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#821019]"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
            <button
              onClick={fetchSetupIntent}
              className="block mt-2 text-sm font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#821019",
                },
              },
            }}
          >
            <PaymentForm
              rideRequestId={rideRequestId}
              amount={amount}
              onSuccess={() => {
                onSuccess()
                onClose()
              }}
              onCancel={onClose}
            />
          </Elements>
        )}
      </div>
    </div>
  )
}
