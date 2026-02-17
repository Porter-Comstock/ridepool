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

    const { requestId, action, counterPrice } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      )
    }

    if (!["accept", "decline", "counter"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    // Counter action requires a counterPrice
    if (action === "counter" && (counterPrice === undefined || counterPrice === null || counterPrice === "")) {
      return NextResponse.json(
        { error: "Counter price is required for counter action" },
        { status: 400 }
      )
    }

    // Get the request with ride info
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        ride: true,
      },
    })

    if (!rideRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Only the ride owner can respond
    if (rideRequest.ride.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the owner can respond to requests" },
        { status: 403 }
      )
    }

    // Handle different actions
    if (action === "accept") {
      // Check seats are still available before accepting
      const acceptedCount = await prisma.rideRequest.count({
        where: {
          rideId: rideRequest.rideId,
          status: "ACCEPTED",
        },
      })
      const seatsRemaining = rideRequest.ride.seatsAvailable - acceptedCount
      if (seatsRemaining < rideRequest.seatsRequested) {
        return NextResponse.json(
          { error: "Not enough seats remaining to accept this request" },
          { status: 400 }
        )
      }

      // Accept the proposed price (or original price if they accepted it)
      const agreedPrice = rideRequest.proposedPrice ?? rideRequest.ride.pricePerSeat

      const isFreeRide = agreedPrice === null || agreedPrice === 0

      const updatedRequest = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          agreedPrice,
          ...(isFreeRide ? { paymentStatus: "NOT_REQUIRED" } : {}),
        },
      })

      // Auto-set ride to FULL if no seats remaining after this acceptance
      const newAcceptedCount = acceptedCount + rideRequest.seatsRequested
      if (newAcceptedCount >= rideRequest.ride.seatsAvailable) {
        await prisma.ride.update({
          where: { id: rideRequest.rideId },
          data: { status: "FULL" },
        })
      }

      // Create welcome message
      const priceInfo = agreedPrice !== null ? ` at $${agreedPrice}/seat` : ""
      await prisma.message.create({
        data: {
          senderId: session.user.id,
          receiverId: rideRequest.passengerId,
          rideId: rideRequest.rideId,
          content: `Your ride request from ${rideRequest.ride.origin} to ${rideRequest.ride.destination} has been accepted${priceInfo}! Feel free to message me to coordinate.`,
        },
      })

      // Send push notification to the passenger
      sendPushNotification(rideRequest.passengerId, {
        title: "Request Accepted!",
        body: `${session.user.name || "Driver"} accepted your ride to ${rideRequest.ride.destination}${priceInfo}`,
        url: `/messages/${session.user.id}`,
        data: { rideId: rideRequest.rideId, ownerId: session.user.id },
      }).catch(console.error)

      return NextResponse.json(updatedRequest)
    }

    if (action === "counter") {
      // Send counter-offer
      const parsedCounterPrice = parseFloat(counterPrice)

      const updatedRequest = await prisma.rideRequest.update({
        where: { id: requestId },
        data: {
          status: "COUNTERED",
          counterPrice: parsedCounterPrice,
        },
      })

      // Send push notification to the passenger about counter-offer
      sendPushNotification(rideRequest.passengerId, {
        title: "Counter-Offer Received",
        body: `${session.user.name || "Driver"} countered with $${parsedCounterPrice}/seat for the ride to ${rideRequest.ride.destination}`,
        url: "/requests",
        data: { requestId: rideRequest.id, rideId: rideRequest.rideId },
      }).catch(console.error)

      return NextResponse.json(updatedRequest)
    }

    // Decline
    const updatedRequest = await prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: "DECLINED" },
    })

    // Send notification about decline
    sendPushNotification(rideRequest.passengerId, {
      title: "Request Declined",
      body: `Your request for the ride to ${rideRequest.ride.destination} was declined`,
      url: "/dashboard",
      data: { rideId: rideRequest.rideId },
    }).catch(console.error)

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error("Error responding to request:", error)
    return NextResponse.json(
      { error: "Failed to respond to request" },
      { status: 500 }
    )
  }
}
