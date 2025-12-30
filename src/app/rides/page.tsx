import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { RideSearch } from "./ride-search"

interface SearchParams {
  origin?: string
  destination?: string
  date?: string
}

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const params = await searchParams
  const { origin, destination, date } = params

  // Build where clause
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    // Don't show user's own rides
    driverId: { not: session.user.id },
  }

  if (origin) {
    where.origin = { contains: origin, mode: "insensitive" }
  }

  if (destination) {
    where.destination = { contains: destination, mode: "insensitive" }
  }

  if (date) {
    const searchDate = new Date(date)
    const dayOfWeek = searchDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()

    where.OR = [
      // One-time rides on this date
      {
        isRecurring: false,
        departureDate: {
          gte: new Date(searchDate.setHours(0, 0, 0, 0)),
          lt: new Date(searchDate.setHours(23, 59, 59, 999)),
        },
      },
      // Recurring rides that include this day of week
      {
        isRecurring: true,
        recurrencePattern: { contains: dayOfWeek },
      },
    ]
  }

  const rides = await prisma.ride.findMany({
    where,
    include: {
      driver: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          requests: {
            where: { status: "ACCEPTED" },
          },
        },
      },
    },
    orderBy: [
      { departureDate: "asc" },
      { departureTime: "asc" },
    ],
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Find a Ride</h1>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Search Form */}
        <RideSearch
          defaultOrigin={origin}
          defaultDestination={destination}
          defaultDate={date}
        />

        {/* Results */}
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-4">
            {rides.length} ride{rides.length !== 1 ? "s" : ""} found
          </p>

          {rides.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No rides match your search.</p>
              <p className="text-sm text-gray-400 mt-2">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rides.map((ride) => {
                const seatsRemaining = ride.seatsAvailable - ride._count.requests

                return (
                  <Link
                    key={ride.id}
                    href={`/rides/${ride.id}`}
                    className="block bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-lg">
                          {ride.origin} → {ride.destination}
                        </p>
                        <p className="text-gray-600 mt-1">
                          {ride.isRecurring ? (
                            <>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-2">
                                Recurring
                              </span>
                              {ride.departureTime}
                            </>
                          ) : (
                            <>
                              {ride.departureDate?.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              at {ride.departureTime}
                            </>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-2">
                            {ride.driver.image ? (
                              <img
                                src={ride.driver.image}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300" />
                            )}
                            <span className="text-sm text-gray-600">
                              {ride.driver.name || "Anonymous"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`font-medium ${seatsRemaining > 0 ? "text-green-600" : "text-red-600"}`}>
                          {seatsRemaining > 0 ? `${seatsRemaining} seat${seatsRemaining !== 1 ? "s" : ""} left` : "Full"}
                        </p>
                        {ride.pricePerSeat ? (
                          <p className="text-gray-600 text-sm mt-1">
                            ${ride.pricePerSeat}/seat
                          </p>
                        ) : (
                          <p className="text-green-600 text-sm mt-1">Free</p>
                        )}
                      </div>
                    </div>
                    {ride.notes && (
                      <p className="text-sm text-gray-500 mt-3 border-t pt-3">
                        {ride.notes}
                      </p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
