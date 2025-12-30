import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { RequestActions } from "./request-actions"

export default async function RequestsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Get pending requests for rides the user has posted
  const incomingRequests = await prisma.rideRequest.findMany({
    where: {
      ride: { driverId: session.user.id },
      status: "PENDING",
    },
    include: {
      ride: {
        select: {
          id: true,
          origin: true,
          destination: true,
          departureDate: true,
          departureTime: true,
          isRecurring: true,
        },
      },
      passenger: {
        select: {
          id: true,
          name: true,
          image: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Get user's own requests (as a passenger)
  const myRequests = await prisma.rideRequest.findMany({
    where: {
      passengerId: session.user.id,
    },
    include: {
      ride: {
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Ride Requests</h1>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Incoming Requests (for drivers) */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Incoming Requests
            {incomingRequests.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                {incomingRequests.length}
              </span>
            )}
          </h2>

          {incomingRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">No pending requests for your rides.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {request.passenger.image ? (
                        <img
                          src={request.passenger.image}
                          alt=""
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {request.passenger.name?.[0] || "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {request.passenger.name || "Anonymous"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {request.passenger.email}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          Requesting: {request.ride.origin} → {request.ride.destination}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {request.ride.isRecurring
                            ? `Recurring at ${request.ride.departureTime}`
                            : `${request.ride.departureDate?.toLocaleDateString()} at ${request.ride.departureTime}`}
                        </p>
                        {request.message && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            &quot;{request.message}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <RequestActions
                      requestId={request.id}
                      passengerId={request.passenger.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Requests (as passenger) */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            My Requests
          </h2>

          {myRequests.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">You haven&apos;t requested any rides.</p>
              <Link
                href="/rides"
                className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Find a ride
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {request.ride.origin} → {request.ride.destination}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Driver: {request.ride.driver.name || "Anonymous"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.ride.isRecurring
                          ? `Recurring at ${request.ride.departureTime}`
                          : `${request.ride.departureDate?.toLocaleDateString()} at ${request.ride.departureTime}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === "ACCEPTED"
                            ? "bg-green-100 text-green-800"
                            : request.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "DECLINED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {request.status}
                      </span>
                      {request.status === "ACCEPTED" && (
                        <Link
                          href={`/messages/${request.ride.driver.id}`}
                          className="block mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Message driver
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
