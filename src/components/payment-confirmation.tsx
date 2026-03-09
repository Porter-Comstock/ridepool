"use client"

import { useState, useEffect, useCallback } from "react"
import { AddCardModal } from "./add-card-modal"
import { PLATFORM_FEE_DOLLARS } from "@/lib/constants"

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

interface PaymentConfirmationProps {
  rideRequestId: string
  agreedPrice: number | null
}

function brandDisplay(brand: string): string {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners",
    jcb: "JCB",
    unionpay: "UnionPay",
  }
  return brands[brand] || brand.charAt(0).toUpperCase() + brand.slice(1)
}

export function PaymentConfirmation({
  rideRequestId,
  agreedPrice,
}: PaymentConfirmationProps) {
  const [cards, setCards] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platformFee = PLATFORM_FEE_DOLLARS
  const ridePrice = agreedPrice || 0
  const totalAmount = ridePrice + platformFee

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/payment-methods")
      if (res.ok) {
        const data = await res.json()
        setCards(data.paymentMethods)
        // Pre-select the default card
        const defaultCard = data.paymentMethods.find((c: PaymentMethod) => c.isDefault)
        if (defaultCard) {
          setSelectedCardId(defaultCard.id)
        } else if (data.paymentMethods.length > 0) {
          setSelectedCardId(data.paymentMethods[0].id)
        }
      }
    } catch {
      setError("Failed to load payment methods")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleConfirm = async () => {
    if (!selectedCardId) return

    setConfirming(true)
    setError(null)

    try {
      const res = await fetch("/api/stripe/payment-methods/select-for-ride", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideRequestId,
          paymentMethodId: selectedCardId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to confirm payment")
      }

      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
        <div className="h-8 bg-gray-200 rounded w-full" />
      </div>
    )
  }

  // No cards on file
  if (cards.length === 0) {
    return (
      <div
        className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"
        onClick={(e) => e.preventDefault()}
      >
        <p className="text-sm text-amber-800 mb-2">
          Add a payment method to confirm this ride
        </p>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowAddCard(true)
          }}
          className="px-3 py-1.5 bg-[#821019] text-white text-sm rounded-lg font-medium hover:bg-[#6a0d14]"
        >
          Add Card
        </button>

        <AddCardModal
          isOpen={showAddCard}
          onClose={() => setShowAddCard(false)}
          onSuccess={() => {
            setShowAddCard(false)
            setLoading(true)
            fetchCards()
          }}
        />
      </div>
    )
  }

  // Has cards - show confirmation
  const selectedCard = cards.find((c) => c.id === selectedCardId)

  return (
    <div
      className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
      onClick={(e) => e.preventDefault()}
    >
      <p className="text-sm font-medium text-blue-900 mb-2">
        Confirm payment for this ride
      </p>

      {/* Card selector */}
      {cards.length === 1 && selectedCard ? (
        <p className="text-sm text-blue-800 mb-2">
          Your {brandDisplay(selectedCard.brand)} ending in {selectedCard.last4} will be charged{" "}
          <strong>${totalAmount.toFixed(2)}</strong> after departure
        </p>
      ) : (
        <div className="mb-2">
          <select
            value={selectedCardId || ""}
            onChange={(e) => {
              e.stopPropagation()
              setSelectedCardId(e.target.value)
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1.5 bg-white text-gray-900 mb-1"
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                {brandDisplay(card.brand)} ending in {card.last4}
                {card.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-blue-700">
            Will be charged <strong>${totalAmount.toFixed(2)}</strong> after departure
          </p>
        </div>
      )}

      <p className="text-xs text-blue-600 mb-3">
        ${ridePrice.toFixed(2)} ride + ${platformFee.toFixed(2)} platform fee
      </p>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleConfirm()
          }}
          disabled={confirming || !selectedCardId}
          className="px-3 py-1.5 bg-[#821019] text-white text-sm rounded-lg font-medium hover:bg-[#6a0d14] disabled:opacity-50"
        >
          {confirming ? "Confirming..." : "Confirm"}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setShowAddCard(true)
          }}
          className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
        >
          Add New Card
        </button>
      </div>

      <AddCardModal
        isOpen={showAddCard}
        onClose={() => setShowAddCard(false)}
        onSuccess={() => {
          setShowAddCard(false)
          setLoading(true)
          fetchCards()
        }}
      />
    </div>
  )
}
