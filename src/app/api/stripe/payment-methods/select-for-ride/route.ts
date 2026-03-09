import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PLATFORM_FEE_DOLLARS } from "@/lib/stripe"

// POST - Assign a saved payment method to a ride request
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rideRequestId, paymentMethodId } = await request.json()

    if (!rideRequestId || !paymentMethodId) {
      return NextResponse.json(
        { error: "rideRequestId and paymentMethodId are required" },
        { status: 400 }
      )
    }

    // Verify the ride request belongs to the user and is ACCEPTED
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: { ride: true },
    })

    if (!rideRequest) {
      return NextResponse.json(
        { error: "Ride request not found" },
        { status: 404 }
      )
    }

    if (rideRequest.passengerId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      )
    }

    if (rideRequest.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Ride request must be accepted" },
        { status: 400 }
      )
    }

    // Verify the payment method belongs to the user
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    })

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      )
    }

    if (paymentMethod.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized to use this payment method" },
        { status: 403 }
      )
    }

    // Calculate amounts
    const agreedPrice = rideRequest.agreedPrice || 0
    const platformFee = PLATFORM_FEE_DOLLARS
    const paymentAmount = agreedPrice + platformFee
    const driverPayout = agreedPrice

    // Update the ride request (clear any previous failure reason)
    const updated = await prisma.rideRequest.update({
      where: { id: rideRequestId },
      data: {
        stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
        paymentStatus: "CARD_SAVED",
        paymentAmount,
        platformFee,
        driverPayout,
        paymentFailureReason: null,
      },
    })

    return NextResponse.json({
      success: true,
      paymentAmount,
      platformFee,
      driverPayout,
      paymentStatus: updated.paymentStatus,
    })
  } catch (error) {
    console.error("Error selecting payment method for ride:", error)
    return NextResponse.json(
      { error: "Failed to select payment method" },
      { status: 500 }
    )
  }
}
