import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Subtract 1 day to account for timezone differences (server is UTC, users may be in US timezones)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  today.setDate(today.getDate() - 1)

  // Get ALL active rides (no filtering)
  const allActiveRides = await prisma.ride.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      id: true,
      ownerId: true,
      departureDate: true,
      isRecurring: true,
      status: true,
      origin: true,
      destination: true,
    },
  })

  // Get rides with the dashboard filter
  const filteredRides = await prisma.ride.findMany({
    where: {
      ownerId: { not: session.user.id },
      status: "ACTIVE",
      OR: [
        { departureDate: { gte: today } },
        { departureDate: null },
        { isRecurring: true },
      ],
    },
    select: {
      id: true,
      ownerId: true,
      departureDate: true,
      isRecurring: true,
      status: true,
      origin: true,
      destination: true,
    },
  })

  return NextResponse.json({
    currentUserId: session.user.id,
    todayValue: today.toISOString(),
    serverTime: new Date().toISOString(),
    allActiveRidesCount: allActiveRides.length,
    allActiveRides,
    filteredRidesCount: filteredRides.length,
    filteredRides,
  })
}
