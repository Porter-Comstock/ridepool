"use client"

import { PLATFORM_FEE_DOLLARS } from "@/lib/constants"

interface PaymentStatusBadgeProps {
  paymentStatus: string
  paymentAmount: number | null
  agreedPrice: number | null
}

export function PaymentStatusBadge({
  paymentStatus,
  paymentAmount,
  agreedPrice,
}: PaymentStatusBadgeProps) {
  const totalAmount = (agreedPrice || 0) + PLATFORM_FEE_DOLLARS

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case "PENDING":
        return {
          label: "Payment Required",
          className: "bg-red-100 text-red-700",
        }
      case "CARD_SAVED":
        return {
          label: `$${totalAmount.toFixed(2)} scheduled`,
          className: "bg-blue-100 text-blue-700",
        }
      case "PROCESSING":
        return {
          label: "Processing...",
          className: "bg-yellow-100 text-yellow-700",
        }
      case "SUCCEEDED":
        return {
          label: `$${paymentAmount?.toFixed(2) || totalAmount.toFixed(2)} paid`,
          className: "bg-green-100 text-green-700",
        }
      case "FAILED":
        return {
          label: "Payment Failed",
          className: "bg-red-100 text-red-700",
        }
      case "REFUNDED":
        return {
          label: "Refunded",
          className: "bg-gray-100 text-gray-700",
        }
      case "NOT_REQUIRED":
        return {
          label: "No driver fee",
          className: "bg-gray-100 text-gray-600",
        }
      default:
        return {
          label: "Unknown",
          className: "bg-gray-100 text-gray-700",
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}
      >
        {status.label}
      </span>
    </div>
  )
}
