import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

// Extract place name or short address from full Google Places address
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

export default async function ScheduledPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch rides the user is driving
  const myRides = await prisma.ride.findMany({
    where: {
      driverId: session.user.id,
    },
    include: {
      requests: {
        where: { status: "ACCEPTED" },
        include: {
          passenger: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
    orderBy: [
      { status: "asc" },
      { departureDate: "asc" },
      { createdAt: "desc" },
    ],
  })

  // Fetch rides the user is a passenger on (accepted requests)
  const passengerRides = await prisma.rideRequest.findMany({
    where: {
      passengerId: session.user.id,
      status: "ACCEPTED",
    },
    include: {
      ride: {
        include: {
          driver: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
    orderBy: {
      ride: { departureDate: "asc" },
    },
  })

  // Pending requests the user has made
  const pendingRequests = await prisma.rideRequest.findMany({
    where: {
      passengerId: session.user.id,
      status: "PENDING",
    },
    include: {
      ride: {
        include: {
          driver: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const formatDate = (date: Date | null) => {
    if (!date) return "Flexible"
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusColor = (status: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">My Rides</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* Rides I'm Driving */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🚗</span> Rides I&apos;m Driving
          </h2>
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
                          ride.rideType === "ROUND_TRIP"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {ride.rideType === "ROUND_TRIP" ? "Round-trip" : "One-way"}
                        </span>
                        <span>•</span>
                        <span>{ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? "s" : ""} available</span>
                        {ride.pricePerSeat && (
                          <>
                            <span>•</span>
                            <span>${ride.pricePerSeat}/seat</span>
                          </>
                        )}
                      </div>
                      {ride.requests.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Passengers:</span>
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
        </section>

        {/* Rides I'm a Passenger On */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🎫</span> Rides I&apos;m Joining
          </h2>
          {passengerRides.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              You haven&apos;t joined any rides yet.
            </div>
          ) : (
            <div className="space-y-3">
              {passengerRides.map((request) => (
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
                        <span className="text-xs text-gray-500">Driver:</span>
                        <div className="flex items-center gap-1">
                          {request.ride.driver.image ? (
                            <img
                              src={request.ride.driver.image}
                              alt=""
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                {request.ride.driver.name?.[0] || "?"}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-gray-700">
                            {request.ride.driver.name?.split(" ")[0] || "User"}
                          </span>
                        </div>
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
        </section>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-xl">⏳</span> Pending Requests
            </h2>
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
          </section>
        )}
      </div>
    </div>
  )
}
