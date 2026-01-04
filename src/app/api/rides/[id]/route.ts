import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET a single ride
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const ride = await prisma.ride.findUnique({
      where: { id },
      include: {
        driver: {
          select: { id: true, name: true, image: true },
        },
      },
    })

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 })
    }

    return NextResponse.json(ride)
  } catch (error) {
    console.error("Error fetching ride:", error)
    return NextResponse.json({ error: "Failed to fetch ride" }, { status: 500 })
  }
}

// UPDATE a ride
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if ride exists and user is the driver
    const existingRide = await prisma.ride.findUnique({
      where: { id },
    })

    if (!existingRide) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 })
    }

    if (existingRide.driverId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the driver can edit this ride" },
        { status: 403 }
      )
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
    } = body

    // Build recurrence pattern JSON
    const recurrencePattern = isRecurring
      ? JSON.stringify({ days: recurringDays, until: recurringUntil })
      : null

    const updatedRide = await prisma.ride.update({
      where: { id },
      data: {
        origin,
        destination,
        departureDate: isRecurring ? null : departureDate ? new Date(departureDate) : null,
        departureTime,
        seatsAvailable: parseInt(seatsAvailable),
        pricePerSeat: pricePerSeat ? parseFloat(pricePerSeat) : null,
        notes: notes || null,
        isRecurring,
        recurrencePattern,
        rideType: rideType || undefined,
        rideRole: rideRole || undefined,
        returnDate: returnDate ? new Date(returnDate) : null,
        returnTime: returnTime || null,
      },
    })

    return NextResponse.json(updatedRide)
  } catch (error) {
    console.error("Error updating ride:", error)
    return NextResponse.json({ error: "Failed to update ride" }, { status: 500 })
  }
}

// CANCEL a ride
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if ride exists and user is the driver
    const existingRide = await prisma.ride.findUnique({
      where: { id },
      include: {
        requests: {
          where: { status: "ACCEPTED" },
          include: {
            passenger: { select: { id: true } },
          },
        },
      },
    })

    if (!existingRide) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 })
    }

    if (existingRide.driverId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the driver can cancel this ride" },
        { status: 403 }
      )
    }

    // Update ride status to CANCELLED
    const cancelledRide = await prisma.ride.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    // Notify accepted passengers via message
    for (const request of existingRide.requests) {
      await prisma.message.create({
        data: {
          senderId: session.user.id,
          receiverId: request.passenger.id,
          rideId: id,
          content: `Unfortunately, the ride from ${existingRide.origin} to ${existingRide.destination} has been cancelled.`,
        },
      })
    }

    return NextResponse.json(cancelledRide)
  } catch (error) {
    console.error("Error cancelling ride:", error)
    return NextResponse.json({ error: "Failed to cancel ride" }, { status: 500 })
  }
}
