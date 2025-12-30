import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rideId, message, seatsRequested = 1 } = await request.json()

    if (!rideId) {
      return NextResponse.json({ error: "Ride ID is required" }, { status: 400 })
    }

    // Check if ride exists and is active
    const ride = await prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        _count: {
          select: {
            requests: {
              where: { status: "ACCEPTED" },
            },
          },
        },
      },
    })

    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 })
    }

    if (ride.status !== "ACTIVE") {
      return NextResponse.json({ error: "Ride is no longer active" }, { status: 400 })
    }

    // Can't request your own ride
    if (ride.driverId === session.user.id) {
      return NextResponse.json({ error: "You cannot request your own ride" }, { status: 400 })
    }

    // Check if already requested
    const existingRequest = await prisma.rideRequest.findFirst({
      where: {
        rideId,
        passengerId: session.user.id,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: "You have already requested this ride" },
        { status: 400 }
      )
    }

    // Check if seats available
    const seatsRemaining = ride.seatsAvailable - ride._count.requests
    if (seatsRemaining < seatsRequested) {
      return NextResponse.json(
        { error: "Not enough seats available" },
        { status: 400 }
      )
    }

    // Create the request
    const rideRequest = await prisma.rideRequest.create({
      data: {
        rideId,
        passengerId: session.user.id,
        seatsRequested,
        message: message || null,
      },
    })

    return NextResponse.json(rideRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating ride request:", error)
    return NextResponse.json(
      { error: "Failed to create ride request" },
      { status: 500 }
    )
  }
}
