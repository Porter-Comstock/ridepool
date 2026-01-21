"use client"

import { useState } from "react"
import { PaymentModal } from "./payment-modal"

interface PaymentStatusBadgeProps {
  rideRequestId: string
  paymentStatus: string
  paymentAmount: number | null
  agreedPrice: number | null
}

export function PaymentStatusBadge({
  rideRequestId,
  paymentStatus,
  paymentAmount,
  agreedPrice,
}: PaymentStatusBadgeProps) {
  const [showModal, setShowModal] = useState(false)

  // Calculate total amount (agreed price + $5 platform fee)
  const totalAmount = (agreedPrice || 0) + 5

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case "PENDING":
        return {
          label: "Payment Required",
          className: "bg-red-100 text-red-700",
          showButton: true,
        }
      case "CARD_SAVED":
        return {
          label: `$${totalAmount.toFixed(2)} scheduled`,
          className: "bg-blue-100 text-blue-700",
          showButton: false,
        }
      case "PROCESSING":
        return {
          label: "Processing...",
          className: "bg-yellow-100 text-yellow-700",
          showButton: false,
        }
      case "SUCCEEDED":
        return {
          label: `$${paymentAmount?.toFixed(2) || totalAmount.toFixed(2)} paid`,
          className: "bg-green-100 text-green-700",
          showButton: false,
        }
      case "FAILED":
        return {
          label: "Payment Failed",
          className: "bg-red-100 text-red-700",
          showButton: true,
        }
      case "REFUNDED":
        return {
          label: "Refunded",
          className: "bg-gray-100 text-gray-700",
          showButton: false,
        }
      case "NOT_REQUIRED":
        return {
          label: "Free",
          className: "bg-gray-100 text-gray-600",
          showButton: false,
        }
      default:
        return {
          label: "Unknown",
          className: "bg-gray-100 text-gray-700",
          showButton: false,
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
        {status.showButton && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowModal(true)
            }}
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#821019] text-white hover:bg-[#6a0d14]"
          >
            Add Card
          </button>
        )}
      </div>

      <PaymentModal
        rideRequestId={rideRequestId}
        amount={totalAmount}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false)
          window.location.reload()
        }}
      />
    </>
  )
}
