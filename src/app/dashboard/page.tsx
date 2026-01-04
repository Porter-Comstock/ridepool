import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/dashboard-client"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  // Fetch available rides from OTHER users (for the bulletin)
  // Show all active rides - future rides, recurring rides, or rides with no date set
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const availableRides = await prisma.ride.findMany({
    where: {
      driverId: { not: session.user.id },
      status: "ACTIVE",
      OR: [
        { departureDate: { gte: today } },
        { departureDate: null },
        { isRecurring: true },
      ],
    },
    include: {
      driver: {
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
    driver: ride.driver,
  }))

  return (
    <DashboardClient
      userName={session.user.name || null}
      availableRides={transformedRides}
      pendingRequestsCount={pendingRequestsCount}
      unreadMessagesCount={unreadMessagesCount}
    />
  )
}
