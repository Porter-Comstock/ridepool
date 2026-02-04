import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/dashboard-client"

// Disable caching - always fetch fresh data
export const dynamic = "force-dynamic"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const params = await searchParams
  const initialTab = params.tab === "bulletin" ? "bulletin" : "create"

  // Fetch available rides from OTHER users (for the bulletin)
  // Show rides from yesterday onwards to account for timezone differences
  // (server runs in UTC, users may be up to 12 hours behind)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 1)
  cutoffDate.setHours(0, 0, 0, 0)

  const availableRides = await prisma.ride.findMany({
    where: {
      ownerId: { not: session.user.id },
      status: "ACTIVE",
      OR: [
        { departureDate: { gte: cutoffDate } },
        { departureDate: null },
        { isRecurring: true },
      ],
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: [
      { departureDate: "asc" },
      { createdAt: "desc" },
    ],
    take: 50,
  })

  // Count pending requests for user's rides
  const pendingRequestsCount = await prisma.rideRequest.count({
    where: {
      ride: { ownerId: session.user.id },
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

  // Transform the rides to match the expected format
  const transformedRides = availableRides.map((ride) => ({
    id: ride.id,
    origin: ride.origin,
    destination: ride.destination,
    departureDate: ride.departureDate?.toISOString() || null,
    departureTime: ride.departureTime,
    seatsAvailable: ride.seatsAvailable,
    pricePerSeat: ride.pricePerSeat,
    isRecurring: ride.isRecurring,
    rideType: ride.rideType,
    rideRole: ride.rideRole,
    owner: ride.owner,
  }))

  return (
    <DashboardClient
      userName={session.user.name || null}
      availableRides={transformedRides}
      pendingRequestsCount={pendingRequestsCount}
      unreadMessagesCount={unreadMessagesCount}
      initialTab={initialTab}
    />
  )
}
