import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ScheduledTabs } from "./scheduled-tabs"

export default async function ScheduledPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch all rides the user posted (both DRIVER and RIDER roles), most recent first
  const myRides = await prisma.ride.findMany({
    where: {
      ownerId: session.user.id,
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
      { departureDate: "desc" },
      { createdAt: "desc" },
    ],
  })

  // Fetch rides the user has joined as a passenger (accepted requests on OTHER people's rides)
  const ridesImJoining = await prisma.rideRequest.findMany({
    where: {
      passengerId: session.user.id,
      status: "ACCEPTED",
    },
    include: {
      ride: {
        include: {
          owner: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
    orderBy: {
      ride: { departureDate: "desc" },
    },
  })

  // Pending/countered requests the user has made
  const pendingRequests = await prisma.rideRequest.findMany({
    where: {
      passengerId: session.user.id,
      status: { in: ["PENDING", "COUNTERED"] },
    },
    include: {
      ride: {
        include: {
          owner: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Serialize dates for client component
  const serializedMyRides = myRides.map((ride) => ({
    id: ride.id,
    origin: ride.origin,
    destination: ride.destination,
    departureDate: ride.departureDate?.toISOString() || null,
    departureTime: ride.departureTime,
    isRecurring: ride.isRecurring,
    status: ride.status,
    seatsAvailable: ride.seatsAvailable,
    pricePerSeat: ride.pricePerSeat,
    rideRole: ride.rideRole as "DRIVER" | "RIDER",
    rideType: ride.rideType,
    requests: ride.requests.map((req) => ({
      id: req.id,
      passenger: req.passenger,
    })),
  }))

  const serializedJoined = ridesImJoining.map((request) => ({
    id: request.id,
    rideId: request.rideId,
    agreedPrice: request.agreedPrice,
    paymentStatus: request.paymentStatus,
    paymentAmount: request.paymentAmount,
    ride: {
      id: request.ride.id,
      origin: request.ride.origin,
      destination: request.ride.destination,
      departureDate: request.ride.departureDate?.toISOString() || null,
      departureTime: request.ride.departureTime,
      isRecurring: request.ride.isRecurring,
      owner: request.ride.owner,
    },
  }))

  const serializedPending = pendingRequests.map((request) => ({
    id: request.id,
    seatsRequested: request.seatsRequested,
    ride: {
      id: request.ride.id,
      origin: request.ride.origin,
      destination: request.ride.destination,
      departureDate: request.ride.departureDate?.toISOString() || null,
      departureTime: request.ride.departureTime,
      isRecurring: request.ride.isRecurring,
      owner: request.ride.owner,
    },
  }))

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

      <div className="max-w-4xl mx-auto px-4 py-6">
        <ScheduledTabs
          myRides={serializedMyRides}
          joinedRides={serializedJoined}
          pendingRequests={serializedPending}
        />
      </div>
    </div>
  )
}
