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

    const { requestId, action } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: "Request ID and action are required" },
        { status: 400 }
      )
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
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

    // Only the ride driver can respond
    if (rideRequest.ride.driverId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the driver can respond to requests" },
        { status: 403 }
      )
    }

    // Update the request status
    const newStatus = action === "accept" ? "ACCEPTED" : "DECLINED"

    const updatedRequest = await prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    })

    // If accepted, create a welcome message and notify the passenger
    if (action === "accept") {
      await prisma.message.create({
        data: {
          senderId: session.user.id,
          receiverId: rideRequest.passengerId,
          rideId: rideRequest.rideId,
          content: `Your ride request from ${rideRequest.ride.origin} to ${rideRequest.ride.destination} has been accepted! Feel free to message me to coordinate.`,
        },
      })

      // Send push notification to the passenger
      sendPushNotification(rideRequest.passengerId, {
        title: "Request Accepted!",
        body: `${session.user.name || "Driver"} accepted your ride to ${rideRequest.ride.destination}`,
        url: `/messages/${session.user.id}`,
        data: { rideId: rideRequest.rideId, driverId: session.user.id },
      }).catch(console.error)
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error("Error responding to request:", error)
    return NextResponse.json(
      { error: "Failed to respond to request" },
      { status: 500 }
    )
  }
}
