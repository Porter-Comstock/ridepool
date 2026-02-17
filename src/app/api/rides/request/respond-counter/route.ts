import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"

// Endpoint for requester to respond to a counter-offer
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId, action } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      )
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'accept' or 'decline'" },
        { status: 400 }
      )
    }

    // Get the request with ride info
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        ride: {
          include: {
            owner: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!rideRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Only the requester (passenger) can respond to counter-offers
    if (rideRequest.passengerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the requester can respond to counter-offers" },
        { status: 403 }
      )
    }

    // Request must be in COUNTERED status
    if (rideRequest.status !== "COUNTERED") {
      return NextResponse.json(
        { error: "This request does not have a pending counter-offer" },
        { status: 400 }
      )
    }

    if (action === "accept") {
      // Accept the counter-offer
      const isFreeRide = rideRequest.counterPrice === null || rideRequest.counterPrice === 0
      const updatedRequest = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          agreedPrice: rideRequest.counterPrice,
          ...(isFreeRide ? { paymentStatus: "NOT_REQUIRED" } : {}),
        },
      })

      // Create confirmation message
      const priceInfo = rideRequest.counterPrice !== null ? ` at $${rideRequest.counterPrice}/seat` : ""
      await prisma.message.create({
        data: {
          senderId: rideRequest.ride.ownerId,
          receiverId: session.user.id,
          rideId: rideRequest.rideId,
          content: `Great! Your ride from ${rideRequest.ride.origin} to ${rideRequest.ride.destination} is confirmed${priceInfo}! Feel free to message me to coordinate.`,
        },
      })

      // Notify the owner
      sendPushNotification(rideRequest.ride.ownerId, {
        title: "Counter-Offer Accepted!",
        body: `${session.user.name || "Passenger"} accepted your counter-offer of $${rideRequest.counterPrice}/seat`,
        url: `/messages/${session.user.id}`,
        data: { rideId: rideRequest.rideId, passengerId: session.user.id },
      }).catch(console.error)

      return NextResponse.json(updatedRequest)
    }

    // Decline the counter-offer
    const updatedRequest = await prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    })

    // Notify the owner
    sendPushNotification(rideRequest.ride.ownerId, {
      title: "Counter-Offer Declined",
      body: `${session.user.name || "Passenger"} declined your counter-offer for the ride to ${rideRequest.ride.destination}`,
      url: "/requests",
      data: { rideId: rideRequest.rideId },
    }).catch(console.error)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error("Error responding to counter-offer:", error)
    return NextResponse.json(
      { error: "Failed to respond to counter-offer" },
      { status: 500 }
    )
  }
}
