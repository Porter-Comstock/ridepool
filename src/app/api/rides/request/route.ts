import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rideId, message, seatsRequested = 1, proposedPrice } = await request.json()

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
    if (ride.ownerId === session.user.id) {
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

    // Determine if this is an auto-confirm (accepting original price) or needs negotiation
    const originalPrice = ride.pricePerSeat
    const parsedProposedPrice = proposedPrice !== undefined && proposedPrice !== null && proposedPrice !== ""
      ? parseFloat(proposedPrice)
      : null

    // Auto-confirm if:
    // 1. Requester accepts original price (proposedPrice matches original or is null/undefined)
    // 2. Both are free (null/0)
    const acceptsOriginalPrice =
      parsedProposedPrice === null ||
      parsedProposedPrice === originalPrice ||
      (parsedProposedPrice === 0 && (originalPrice === null || originalPrice === 0))

    if (acceptsOriginalPrice) {
      // Auto-confirm: Create request with ACCEPTED status
      const rideRequest = await prisma.rideRequest.create({
        data: {
          rideId,
          passengerId: session.user.id,
          seatsRequested,
          message: message || null,
          proposedPrice: originalPrice,
          agreedPrice: originalPrice,
          status: "ACCEPTED",
        },
      })

      // Create welcome message from owner to passenger
      await prisma.message.create({
        data: {
          senderId: ride.ownerId,
          receiverId: session.user.id,
          rideId: ride.id,
          content: `Your ride request from ${ride.origin} to ${ride.destination} has been automatically confirmed! Feel free to message me to coordinate.`,
        },
      })

      // Notify the owner about the auto-confirmed request
      sendPushNotification(ride.ownerId, {
        title: "Ride Request Auto-Confirmed",
        body: `${session.user.name || "Someone"} accepted your price and joined your ride to ${ride.destination}`,
        url: "/scheduled",
        data: { requestId: rideRequest.id, rideId },
      }).catch(console.error)

      // Notify the passenger that they're confirmed
      sendPushNotification(session.user.id, {
        title: "Ride Confirmed!",
        body: `You're confirmed for the ride to ${ride.destination}`,
        url: `/messages/${ride.ownerId}`,
        data: { rideId },
      }).catch(console.error)

      return NextResponse.json(rideRequest, { status: 201 })
    }

    // Price differs - create as PENDING for trip maker review
    const rideRequest = await prisma.rideRequest.create({
      data: {
        rideId,
        passengerId: session.user.id,
        seatsRequested,
        message: message || null,
        proposedPrice: parsedProposedPrice,
        status: "PENDING",
      },
    })

    // Notify the owner about the new request with different price
    const priceInfo = parsedProposedPrice !== null
      ? ` (offering $${parsedProposedPrice}/seat)`
      : ""
    sendPushNotification(ride.ownerId, {
      title: "New Ride Request",
      body: `${session.user.name || "Someone"} wants to join your ride to ${ride.destination}${priceInfo}`,
      url: "/requests",
      data: { requestId: rideRequest.id, rideId },
    }).catch(console.error)

    return NextResponse.json(rideRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating ride request:", error)
    return NextResponse.json(
      { error: "Failed to create ride request" },
      { status: 500 }
    )
  }
}
