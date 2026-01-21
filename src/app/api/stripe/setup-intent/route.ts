import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

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

    // Get the ride request and verify ownership
    const rideRequest = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      include: {
        ride: true,
        passenger: true,
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
        { error: "Not authorized to pay for this request" },
        { status: 403 }
      )
    }

    if (rideRequest.status !== "ACCEPTED") {
      return NextResponse.json(
        { error: "Ride request must be accepted before payment" },
        { status: 400 }
      )
    }

    // Get or create Stripe customer for the passenger
    let stripeCustomerId = rideRequest.passenger.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: rideRequest.passenger.email,
        name: rideRequest.passenger.name || undefined,
        metadata: {
          userId: rideRequest.passenger.id,
        },
      })
      stripeCustomerId = customer.id

      await prisma.user.update({
        where: { id: rideRequest.passengerId },
        data: { stripeCustomerId },
      })
    }

    // Create a Setup Intent to save the card for later charging
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      metadata: {
        rideRequestId: rideRequest.id,
        rideId: rideRequest.rideId,
        passengerId: rideRequest.passengerId,
      },
    })

    // Update the ride request with the setup intent ID
    await prisma.rideRequest.update({
      where: { id: rideRequestId },
      data: {
        stripeSetupIntentId: setupIntent.id,
      },
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    })
  } catch (error) {
    console.error("Error creating setup intent:", error)
    return NextResponse.json(
      { error: "Failed to create setup intent" },
      { status: 500 }
    )
  }
}
