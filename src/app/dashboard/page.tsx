import { auth, signOut } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch user's posted rides
  const myRides = await prisma.ride.findMany({
    where: {
      driverId: session.user.id,
      status: "ACTIVE",
    },
    orderBy: [
      { departureDate: "asc" },
      { createdAt: "desc" },
    ],
    take: 5,
  })

  // Count pending requests for user's rides
  const pendingRequestsCount = await prisma.rideRequest.count({
    where: {
      ride: { driverId: session.user.id },
      status: "PENDING",
    },
  })

  // Count unread messages
  const unreadMessagesCount = await prisma.message.count({
    where: {
      receiverId: session.user.id,
      read: false,
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#821019] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[#821019]">Gate Rides</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Profile
            </Link>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/" })
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            Welcome, <span className="font-medium">{session.user.name}</span>!
          </p>
          <p className="text-sm text-gray-500 mt-1">{session.user.email}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/rides/new"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Post a Ride</h2>
                <p className="text-sm text-gray-500">Offer seats in your car</p>
              </div>
            </div>
          </Link>

          <Link
            href="/rides"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Find a Ride</h2>
                <p className="text-sm text-gray-500">Search for available rides</p>
              </div>
            </div>
          </Link>

          <Link
            href="/requests"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group relative"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Ride Requests</h2>
                <p className="text-sm text-gray-500">Manage incoming requests</p>
              </div>
            </div>
            {pendingRequestsCount > 0 && (
              <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </Link>

          <Link
            href="/messages"
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow group relative"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Messages</h2>
                <p className="text-sm text-gray-500">Coordinate with others</p>
              </div>
            </div>
            {unreadMessagesCount > 0 && (
              <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadMessagesCount}
              </span>
            )}
          </Link>
        </div>

        {/* My Posted Rides */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Posted Rides</h2>
            {myRides.length > 0 && (
              <Link href="/rides/my" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            )}
          </div>

          {myRides.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">You haven&apos;t posted any rides yet.</p>
              <Link
                href="/rides/new"
                className="inline-block mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Post your first ride
              </Link>
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
                    <div>
                      <p className="font-medium text-gray-900">
                        {ride.origin} → {ride.destination}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {ride.isRecurring ? (
                          <>Recurring · {ride.departureTime}</>
                        ) : (
                          <>
                            {ride.departureDate?.toLocaleDateString()} · {ride.departureTime}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? "s" : ""}
                      </p>
                      {ride.pricePerSeat && (
                        <p className="text-sm text-gray-500">${ride.pricePerSeat}/seat</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
