"use client"

import { useState, useEffect, useCallback } from "react"
import { AddCardModal } from "./add-card-modal"

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
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

export function PaymentMethodsSection() {
  const [cards, setCards] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/payment-methods")
      if (res.ok) {
        const data = await res.json()
        setCards(data.paymentMethods)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCards()
  }, [fetchCards])

  const handleSetDefault = async (id: string) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/stripe/payment-methods/${id}/default`, {
        method: "PUT",
      })
      if (res.ok) {
        await fetchCards()
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this card?")) return

    setActionLoading(id)
    try {
      const res = await fetch(`/api/stripe/payment-methods/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        await fetchCards()
      }
    } catch {
      // Silently fail
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-7 bg-gray-200 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {cards.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-3">
            No payment methods saved. Add a card to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-600">
                  {brandDisplay(card.brand).slice(0, 4)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {brandDisplay(card.brand)} ending in {card.last4}
                    {card.isDefault && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    Expires {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!card.isDefault && (
                  <button
                    onClick={() => handleSetDefault(card.id)}
                    disabled={actionLoading === card.id}
                    className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Set default
                  </button>
                )}
                <button
                  onClick={() => handleRemove(card.id)}
                  disabled={actionLoading === card.id}
                  className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-[#821019] hover:text-[#821019] transition-colors"
      >
        + Add New Card
      </button>

      <AddCardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false)
          fetchCards()
        }}
      />
    </>
  )
}
