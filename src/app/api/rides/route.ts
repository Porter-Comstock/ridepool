import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPushToAllExcept } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      origin,
      destination,
      departureDate,
      departureTime,
      seatsAvailable,
      pricePerSeat,
      notes,
      isRecurring,
      recurringDays,
      recurringUntil,
      rideType,
      rideRole,
      returnDate,
      returnTime,
      timezoneOffset,
    } = body

    // Validation
    if (!origin || !destination || !departureTime || !seatsAvailable) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (isRecurring && (!recurringDays?.length || !recurringUntil)) {
      return NextResponse.json(
        { error: "Recurring rides require days and end date" },
        { status: 400 }
      )
    }

    if (!isRecurring && !departureDate) {
      return NextResponse.json(
        { error: "One-time rides require a departure date" },
        { status: 400 }
      )
    }

    // Validate that departure date/time is not in the past (using client's timezone)
    if (!isRecurring && departureDate) {
      // Client sends their timezone offset in minutes (e.g., 300 for EST = UTC-5)
      // getTimezoneOffset() returns positive for timezones behind UTC
      const offsetMinutes = typeof timezoneOffset === "number" ? timezoneOffset : 0

      // Calculate what time it is RIGHT NOW in the client's timezone
      const serverNow = new Date()
      const clientNowMs = serverNow.getTime() - offsetMinutes * 60 * 1000
      const clientNow = new Date(clientNowMs)

      // Extract client's local date and time
      const clientDateStr = clientNow.toISOString().split("T")[0] // "YYYY-MM-DD"
      const clientTimeStr = clientNow.toISOString().split("T")[1].substring(0, 5) // "HH:MM"

      // Debug logging (visible in Vercel logs)
      console.log("Time validation:", {
        serverNow: serverNow.toISOString(),
        timezoneOffset: offsetMinutes,
        clientDateStr,
        clientTimeStr,
        departureDate,
        departureTime,
      })

      // Check if the departure date is in the past
      if (departureDate < clientDateStr) {
        return NextResponse.json(
          { error: "This date has already passed. Please select today or a future date." },
          { status: 400 }
        )
      }

      // If departure is today, check if the time has already passed
      if (departureDate === clientDateStr && departureTime < clientTimeStr) {
        return NextResponse.json(
          { error: "This time has already passed. Please select a later time." },
          { status: 400 }
        )
      }
    }

    // Validate return date is not before departure date for round trips
    if (rideType === "ROUND_TRIP" && returnDate && departureDate) {
      if (returnDate < departureDate) {
        return NextResponse.json(
          { error: "Return date must be on or after departure date" },
          { status: 400 }
        )
      }
    }

    // Build recurrence pattern JSON
    const recurrencePattern = isRecurring
      ? JSON.stringify({ days: recurringDays, until: recurringUntil })
      : null

    const ride = await prisma.ride.create({
      data: {
        ownerId: session.user.id,
        origin,
        destination,
        departureDate: isRecurring ? null : new Date(departureDate),
        departureTime,
        seatsAvailable: parseInt(seatsAvailable),
        pricePerSeat: pricePerSeat ? parseFloat(pricePerSeat) : null,
        notes: notes || null,
        isRecurring,
        recurrencePattern,
        rideType: rideType || "ONE_WAY",
        rideRole: rideRole || "DRIVER",
        returnDate: returnDate ? new Date(returnDate) : null,
        returnTime: returnTime || null,
      },
    })

    // Send push notification to all users except the poster
    const dateInfo = isRecurring
      ? "Recurring ride"
      : new Date(departureDate).toLocaleDateString()

    const notificationTitle = rideRole === "RIDER"
      ? "Someone Needs a Ride"
      : "New Ride Available"

    const notificationBody = rideRole === "RIDER"
      ? `Looking for a ride: ${origin} → ${destination} on ${dateInfo}`
      : `${origin} → ${destination} on ${dateInfo}`

    sendPushToAllExcept(session.user.id, {
      title: notificationTitle,
      body: notificationBody,
      url: `/rides/${ride.id}`,
      data: { rideId: ride.id },
    }).catch(console.error) // Don't await, fire and forget

    return NextResponse.json(ride, { status: 201 })
  } catch (error) {
    console.error("Error creating ride:", error)
    return NextResponse.json(
      { error: "Failed to create ride" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const origin = searchParams.get("origin")
    const destination = searchParams.get("destination")
    const date = searchParams.get("date")

    const where: Record<string, unknown> = {
      status: "ACTIVE",
    }

    if (origin) {
      where.origin = { contains: origin, mode: "insensitive" }
    }

    if (destination) {
      where.destination = { contains: destination, mode: "insensitive" }
    }

    if (date) {
      const searchDate = new Date(date)
      where.OR = [
        // One-time rides on this date
        { departureDate: searchDate },
        // Recurring rides that include this day
        { isRecurring: true },
      ]
    }

    const rides = await prisma.ride.findMany({
      where,
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
        { departureTime: "asc" },
      ],
    })

    return NextResponse.json(rides)
  } catch (error) {
    console.error("Error fetching rides:", error)
    return NextResponse.json(
      { error: "Failed to fetch rides" },
      { status: 500 }
    )
  }
}
