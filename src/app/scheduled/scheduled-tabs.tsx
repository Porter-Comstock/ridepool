"use client"

import { useState } from "react"
import Link from "next/link"
import { PaymentStatusBadge } from "@/components/payment-status-badge"

interface RideData {
  id: string
  origin: string
  destination: string
  departureDate: string | null
  departureTime: string
  isRecurring: boolean
  status: string
  seatsAvailable: number
  pricePerSeat: number | null
  rideRole: "DRIVER" | "RIDER"
  rideType: string
  requests: Array<{
    id: string
    passenger: {
      id: string
      name: string | null
      image: string | null
    }
  }>
}

interface JoinedRideData {
  id: string
  rideId: string
  agreedPrice: number | null
  paymentStatus: string
  paymentAmount: number | null
  ride: {
    id: string
    origin: string
    destination: string
    departureDate: string | null
    departureTime: string
    isRecurring: boolean
    owner: {
      id: string
      name: string | null
      image: string | null
    }
  }
}

interface PendingRequestData {
  id: string
  seatsRequested: number
  ride: {
    id: string
    origin: string
    destination: string
    departureDate: string | null
    departureTime: string
    isRecurring: boolean
    owner: {
      id: string
      name: string | null
      image: string | null
    }
  }
}

interface ScheduledTabsProps {
  myRides: RideData[]
  joinedRides: JoinedRideData[]
  pendingRequests: PendingRequestData[]
}

function formatLocation(fullAddress: string): string {
  if (!fullAddress) return ""
  const parts = fullAddress.split(",").map(p => p.trim())
  if (parts.length === 0) return fullAddress
  const firstPart = parts[0]
  const startsWithNumber = /^\d/.test(firstPart)
  if (startsWithNumber) {
    return parts.slice(0, 2).join(", ")
  }
  return firstPart
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Flexible"
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

function getStatusColor(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700"
    case "FULL":
      return "bg-yellow-100 text-yellow-700"
    case "COMPLETED":
      return "bg-gray-100 text-gray-700"
    case "CANCELLED":
      return "bg-red-100 text-red-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

const tabs = [
  { key: "my-rides", label: "My Rides" },
  { key: "joined", label: "Joined" },
  { key: "pending", label: "Pending" },
] as const

type TabKey = typeof tabs[number]["key"]

export function ScheduledTabs({ myRides, joinedRides, pendingRequests }: ScheduledTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("my-rides")

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map((tab) => {
          const count = tab.key === "my-rides"
            ? myRides.length
            : tab.key === "joined"
            ? joinedRides.length
            : pendingRequests.length
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#821019] text-[#821019]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? "bg-[#821019]/10 text-[#821019]"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === "my-rides" && (
        <div>
          {myRides.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              You haven&apos;t posted any rides yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myRides.map((ride) => (
                <Link
                  key={ride.id}
                  href={`/rides/${ride.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {formatLocation(ride.origin)} → {formatLocation(ride.destination)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ride.status)}`}>
                          {ride.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {ride.isRecurring ? "Recurring" : formatDate(ride.departureDate)} at {ride.departureTime}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          ride.rideRole === "RIDER"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {ride.rideRole === "RIDER" ? "Need a ride" : ride.rideType === "ROUND_TRIP" ? "Round-trip" : "One-way"}
                        </span>
                        <span>•</span>
                        <span>{ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? "s" : ""}</span>
                        {ride.pricePerSeat != null && ride.pricePerSeat > 0 && (
                          <>
                            <span>•</span>
                            <span>${ride.pricePerSeat}/seat</span>
                          </>
                        )}
                      </div>
                      {ride.requests.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {ride.rideRole === "RIDER" ? "Drivers:" : "Passengers:"}
                          </span>
                          <div className="flex -space-x-2">
                            {ride.requests.slice(0, 3).map((req) => (
                              <div key={req.id} className="relative">
                                {req.passenger.image ? (
                                  <img
                                    src={req.passenger.image}
                                    alt=""
                                    className="w-6 h-6 rounded-full border-2 border-white"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                    <span className="text-xs text-gray-600">
                                      {req.passenger.name?.[0] || "?"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {ride.requests.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                <span className="text-xs text-gray-600">+{ride.requests.length - 3}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "joined" && (
        <div>
          {joinedRides.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              You haven&apos;t joined any rides yet.
            </div>
          ) : (
            <div className="space-y-3">
              {joinedRides.map((request) => (
                <Link
                  key={request.id}
                  href={`/rides/${request.ride.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {formatLocation(request.ride.origin)} → {formatLocation(request.ride.destination)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Confirmed
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {request.ride.isRecurring ? "Recurring" : formatDate(request.ride.departureDate)} at {request.ride.departureTime}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Posted by:</span>
                        <div className="flex items-center gap-1">
                          {request.ride.owner.image ? (
                            <img
                              src={request.ride.owner.image}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {request.ride.owner.name?.[0] || "?"}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-700">
                            {request.ride.owner.name?.split(" ")[0] || "User"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <PaymentStatusBadge
                          paymentStatus={request.paymentStatus}
                          paymentAmount={request.paymentAmount}
                          agreedPrice={request.agreedPrice}
                        />
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "pending" && (
        <div>
          {pendingRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No pending requests.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/rides/${request.ride.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {formatLocation(request.ride.origin)} → {formatLocation(request.ride.destination)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {request.ride.isRecurring ? "Recurring" : formatDate(request.ride.departureDate)} at {request.ride.departureTime}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Requested {request.seatsRequested} seat{request.seatsRequested !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
