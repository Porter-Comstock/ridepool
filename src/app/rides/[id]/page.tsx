import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { RequestRideButton } from "./request-button"
import { CancelRideButton } from "./cancel-button"

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const { id } = await params

  const ride = await prisma.ride.findUnique({
    where: { id },
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
      requests: {
        where: { status: "ACCEPTED" },
        include: {
          passenger: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  })

  if (!ride) {
    notFound()
  }

  const isDriver = ride.driverId === session.user.id
  const seatsRemaining = ride.seatsAvailable - ride.requests.length

  // Check if user already has a pending or accepted request
  const existingRequest = await prisma.rideRequest.findFirst({
    where: {
      rideId: ride.id,
      passengerId: session.user.id,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  })

  // Parse recurrence pattern if recurring
  let recurringDays: string[] = []
  let recurringUntil: string | null = null
  if (ride.isRecurring && ride.recurrencePattern) {
    try {
      const pattern = JSON.parse(ride.recurrencePattern)
      recurringDays = pattern.days || []
      recurringUntil = pattern.until || null
    } catch {
      // Invalid JSON, ignore
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/rides"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          ← Back to rides
        </Link>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {ride.origin} → {ride.destination}
                </h1>
                <p className="text-gray-600 mt-2">
                  {ride.isRecurring ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Recurring
                    </span>
                  ) : (
                    ride.departureDate?.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  )}
                </p>
              </div>
              {ride.pricePerSeat ? (
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ${ride.pricePerSeat}
                  </p>
                  <p className="text-sm text-gray-500">per seat</p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">Free</p>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Departure Time</p>
                <p className="font-medium text-gray-900">{ride.departureTime}</p>
              </div>
            </div>

            {ride.isRecurring && recurringDays.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Repeats on</p>
                  <p className="font-medium text-gray-900 capitalize">
                    {recurringDays.join(", ")}
                  </p>
                  {recurringUntil && (
                    <p className="text-sm text-gray-500">
                      Until {new Date(recurringUntil).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Seats Available</p>
                <p className={`font-medium ${seatsRemaining > 0 ? "text-green-600" : "text-red-600"}`}>
                  {seatsRemaining} of {ride.seatsAvailable} remaining
                </p>
              </div>
            </div>

            {ride.notes && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-900">{ride.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Driver Info */}
          <div className="p-6 border-t bg-gray-50">
            <p className="text-sm text-gray-500 mb-3">Driver</p>
            <div className="flex items-center gap-3">
              {ride.driver.image ? (
                <img
                  src={ride.driver.image}
                  alt=""
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {ride.driver.name?.[0] || "?"}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {ride.driver.name || "Anonymous"}
                </p>
                <p className="text-sm text-gray-500">{ride.driver.email}</p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="p-6 border-t">
            {isDriver ? (
              <div className="flex gap-3">
                <Link
                  href={`/rides/${ride.id}/edit`}
                  className="flex-1 text-center bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit Ride
                </Link>
                <CancelRideButton rideId={ride.id} />
              </div>
            ) : existingRequest ? (
              <div className="text-center">
                <p className={`font-medium ${existingRequest.status === "ACCEPTED" ? "text-green-600" : "text-yellow-600"}`}>
                  {existingRequest.status === "ACCEPTED"
                    ? "You're confirmed for this ride!"
                    : "Your request is pending"}
                </p>
              </div>
            ) : seatsRemaining > 0 ? (
              <RequestRideButton rideId={ride.id} />
            ) : (
              <p className="text-center text-red-600 font-medium">
                This ride is full
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
