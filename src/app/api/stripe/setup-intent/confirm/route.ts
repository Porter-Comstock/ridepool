import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe, PLATFORM_FEE_DOLLARS } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { rideRequestId } = await request.json()

    if (!rideRequestId) {
      return NextResponse.json(
        { error: "rideRequestId is required" },
        { status: 400 }
      )
    }

    // Get the ride request
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: {
        ride: true,
      },
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

    if (!rideRequest.stripeSetupIntentId) {
      return NextResponse.json(
        { error: "No setup intent found for this request" },
        { status: 400 }
      )
    }

    // Retrieve the setup intent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(
      rideRequest.stripeSetupIntentId
    )

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Setup intent not completed" },
        { status: 400 }
      )
    }

    // Calculate payment amounts
    const agreedPrice = rideRequest.agreedPrice || 0
    const platformFee = PLATFORM_FEE_DOLLARS
    const paymentAmount = agreedPrice + platformFee
    const driverPayout = agreedPrice

    // Update the ride request with payment info
    await prisma.rideRequest.update({
      where: { id: rideRequestId },
      data: {
        stripePaymentMethodId: setupIntent.payment_method as string,
        paymentStatus: "CARD_SAVED",
        paymentAmount,
        platformFee,
        driverPayout,
      },
    })

    return NextResponse.json({
      success: true,
      paymentAmount,
      message: `Card saved. You will be charged $${paymentAmount.toFixed(2)} at departure time.`,
    })
  } catch (error) {
    console.error("Error confirming setup intent:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment setup" },
      { status: 500 }
    )
  }
}
