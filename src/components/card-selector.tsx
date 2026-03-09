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

interface CardSelectorProps {
  agreedPrice: number | null
  onCardSelected: (paymentMethodId: string) => void
  onAddCard?: () => void
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

export function CardSelector({
  agreedPrice,
  onCardSelected,
}: CardSelectorProps) {
  const [cards, setCards] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
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
        const defaultCard = data.paymentMethods.find((c: PaymentMethod) => c.isDefault)
        if (defaultCard) {
          setSelectedCardId(defaultCard.id)
          onCardSelected(defaultCard.id)
        } else if (data.paymentMethods.length > 0) {
          setSelectedCardId(data.paymentMethods[0].id)
          onCardSelected(data.paymentMethods[0].id)
        }
      }
    } catch {
      setError("Failed to load payment methods")
    } finally {
      setLoading(false)
    }
  }, [onCardSelected])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  if (loading) {
    return (
      <div className="animate-pulse p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="h-4 bg-blue-100 rounded w-40 mb-2" />
        <div className="h-8 bg-blue-100 rounded w-full" />
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800 mb-2">
          Add a payment method to continue
        </p>
        <p className="text-xs text-amber-700 mb-3">
          ${ridePrice.toFixed(2)} ride + ${platformFee.toFixed(2)} platform fee = ${totalAmount.toFixed(2)} total
        </p>
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <button
          onClick={() => setShowAddCard(true)}
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

  const selectedCard = cards.find((c) => c.id === selectedCardId)

  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <p className="text-sm font-medium text-blue-900 mb-2">
        Payment method
      </p>

      {cards.length === 1 && selectedCard ? (
        <p className="text-sm text-blue-800 mb-2">
          {brandDisplay(selectedCard.brand)} ending in {selectedCard.last4} will be charged{" "}
          <strong>${totalAmount.toFixed(2)}</strong> after departure
        </p>
      ) : (
        <div className="mb-2">
          <select
            value={selectedCardId || ""}
            onChange={(e) => {
              setSelectedCardId(e.target.value)
              onCardSelected(e.target.value)
            }}
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

      <p className="text-xs text-blue-600 mb-2">
        ${ridePrice.toFixed(2)} ride + ${platformFee.toFixed(2)} platform fee
      </p>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <button
        onClick={() => setShowAddCard(true)}
        className="text-xs text-blue-700 hover:underline"
      >
        Use a different card
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
