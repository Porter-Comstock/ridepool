import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/dashboard-client"

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
  // Show all active rides - future rides, recurring rides, or rides with no date set
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const availableRides = await prisma.ride.findMany({
    where: {
      ownerId: { not: session.user.id },
      status: "ACTIVE",
      OR: [
        { departureDate: { gte: today } },
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
