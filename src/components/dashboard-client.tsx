"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { LocationInput } from "./location-input"
import { NotificationPrompt } from "./notification-prompt"

interface Ride {
  id: string
  origin: string
  destination: string
  departureDate: string | null
  departureTime: string
  seatsAvailable: number
  pricePerSeat: number | null
  isRecurring: boolean
  rideType: "ONE_WAY" | "ROUND_TRIP"
  rideRole: "DRIVER" | "RIDER"
  driver: {
    id: string
    name: string | null
    image: string | null
  }
}

interface DashboardClientProps {
  userName: string | null
  availableRides: Ride[]
  pendingRequestsCount: number
  unreadMessagesCount: number
}

// Extract place name or short address from full Google Places address
// "Syracuse Hancock International Airport, 1000 Col Eileen Collins Blvd, Syracuse, NY" → "Syracuse Hancock International Airport"
// "123 Main St, Hamilton, NY 13346, USA" → "123 Main St, Hamilton"
function formatLocation(fullAddress: string): string {
  if (!fullAddress) return ""

  const parts = fullAddress.split(",").map(p => p.trim())

  if (parts.length === 0) return fullAddress

  const firstPart = parts[0]

  // Check if first part starts with a number (it's a street address, not a place name)
  const startsWithNumber = /^\d/.test(firstPart)

  if (startsWithNumber) {
    // It's an address - return street + city (first two parts)
    return parts.slice(0, 2).join(", ")
  } else {
    // It's a place name - return just the name
    return firstPart
  }
}

// Get today's date in YYYY-MM-DD format for date input min attribute
function getTodayString(): string {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

export function DashboardClient({
  userName,
  availableRides,
  pendingRequestsCount,
  unreadMessagesCount,
}: DashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"bulletin" | "create">("bulletin")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [today, setToday] = useState("")

  // Set today's date on client side only to avoid hydration mismatch
  useEffect(() => {
    setToday(getTodayString())
  }, [])

  const [formData, setFormData] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    departureTime: "",
    seatsAvailable: 1,
    pricePerSeat: "",
    notes: "",
    rideType: "ONE_WAY" as "ONE_WAY" | "ROUND_TRIP",
    rideRole: "RIDER" as "DRIVER" | "RIDER",
    returnDate: "",
    returnTime: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    setSuccess("")

    try {
      // Get timezone offset in minutes (e.g., -300 for EST which is UTC-5)
      const timezoneOffset = new Date().getTimezoneOffset()

      const payload = {
        ...formData,
        isRecurring: false,
        timezoneOffset,
      }

      console.log("Submitting ride with data:", payload)

      const response = await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create ride")
      }

      setSuccess("Ride posted successfully!")
      setFormData({
        origin: "",
        destination: "",
        departureDate: "",
        departureTime: "",
        seatsAvailable: 1,
        pricePerSeat: "",
        notes: "",
        rideType: "ONE_WAY",
        rideRole: "RIDER",
        returnDate: "",
        returnTime: "",
      })

      // Switch to bulletin tab after a delay
      setTimeout(() => {
        setActiveTab("bulletin")
        setSuccess("")
        window.location.reload()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#821019] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#821019]">Gate Rides</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/scheduled"
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Scheduled</span>
            </Link>
            <Link
              href="/messages"
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg relative"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>
            <Link
              href="/requests"
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg relative"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </Link>
            <Link
              href="/profile"
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => setActiveTab("bulletin")}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === "bulletin"
                  ? "text-[#821019] border-[#821019]"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Ride Bulletin
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === "create"
                  ? "text-[#821019] border-[#821019]"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              Create Ride
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "bulletin" ? (
          <div className="space-y-4">
            {availableRides.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500 mb-4">No rides available right now.</p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="text-[#821019] font-medium hover:underline"
                >
                  Be the first to post a ride!
                </button>
              </div>
            ) : (
              availableRides.map((ride) => (
                <Link
                  key={ride.id}
                  href={`/rides/${ride.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header with emoji and driver */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg">
                      {ride.rideRole === "DRIVER" ? "🚗" : "🙋"}
                    </span>
                    <div className="flex items-center gap-2">
                      {ride.driver.image ? (
                        <img
                          src={ride.driver.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {ride.driver.name?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <span className="text-xs text-gray-500">
                        {ride.driver.name?.split(" ")[0] || "User"}
                      </span>
                    </div>
                  </div>

                  {/* Origin and Destination - full width */}
                  <p className="font-medium text-gray-900 mb-1">
                    {formatLocation(ride.origin)}
                  </p>
                  <p className="text-gray-500 text-sm mb-2">
                    ↓ to
                  </p>
                  <p className="font-medium text-gray-900 mb-3">
                    {formatLocation(ride.destination)}
                  </p>

                  {/* Date/Time */}
                  <p className="text-sm text-gray-500 mb-2">
                    {ride.departureDate
                      ? new Date(ride.departureDate).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                      : "Flexible date"}{" "}
                    at {ride.departureTime}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ride.rideType === "ROUND_TRIP"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {ride.rideType === "ROUND_TRIP" ? "Round-trip" : "One-way"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? "s" : ""}
                    </span>
                    {ride.pricePerSeat && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        ${ride.pricePerSeat}/seat
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <div className="mt-3 flex justify-end">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      ride.rideRole === "DRIVER"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {ride.rideRole === "DRIVER" ? "Request to Join" : "Offer to Drive"}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Post a New Ride</h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are you looking for?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rideRole: "RIDER" })}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      formData.rideRole === "RIDER"
                        ? "border-[#821019] bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl block mb-1">🙋</span>
                    <span className="font-medium">I need a ride</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rideRole: "DRIVER" })}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      formData.rideRole === "DRIVER"
                        ? "border-[#821019] bg-red-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl block mb-1">🚗</span>
                    <span className="font-medium">I&apos;ll be driving</span>
                  </button>
                </div>
              </div>

              {/* Trip Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rideType"
                      checked={formData.rideType === "ONE_WAY"}
                      onChange={() => setFormData({ ...formData, rideType: "ONE_WAY" })}
                      className="text-[#821019] focus:ring-[#821019]"
                    />
                    <span>One-way</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rideType"
                      checked={formData.rideType === "ROUND_TRIP"}
                      onChange={() => setFormData({ ...formData, rideType: "ROUND_TRIP" })}
                      className="text-[#821019] focus:ring-[#821019]"
                    />
                    <span>Round-trip</span>
                  </label>
                </div>
              </div>

              {/* Origin & Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Origin
                  </label>
                  <LocationInput
                    value={formData.origin}
                    onChange={(value) => setFormData({ ...formData, origin: value })}
                    placeholder="e.g., Colgate University"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destination
                  </label>
                  <LocationInput
                    value={formData.destination}
                    onChange={(value) => setFormData({ ...formData, destination: value })}
                    placeholder="e.g., Syracuse Airport"
                    required
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure Date
                  </label>
                  <input
                    type="date"
                    required
                    min={today}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departure Time
                  </label>
                  <input
                    type="time"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  />
                </div>
              </div>

              {/* Return Date & Time (for round-trip) */}
              {formData.rideType === "ROUND_TRIP" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Date
                    </label>
                    <input
                      type="date"
                      required
                      min={formData.departureDate || today}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                      value={formData.returnDate}
                      onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Return Time
                    </label>
                    <input
                      type="time"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                      value={formData.returnTime}
                      onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Seats & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.rideRole === "DRIVER" ? "Seats Available" : "Seats Needed"}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                    value={formData.seatsAvailable}
                    onChange={(e) => setFormData({ ...formData, seatsAvailable: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per Seat (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                      value={formData.pricePerSeat}
                      onChange={(e) => setFormData({ ...formData, pricePerSeat: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any additional details..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#821019] focus:border-[#821019]"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#821019] text-white py-3 rounded-lg font-medium hover:bg-[#6a0d14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Posting..." : "Post Ride"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Notification Prompt */}
      <NotificationPrompt />
    </div>
  )
}
