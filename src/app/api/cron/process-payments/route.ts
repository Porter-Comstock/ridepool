import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe, dollarsToCents, PLATFORM_FEE_CENTS } from "@/lib/stripe"

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // Find all ACCEPTED ride requests where:
    // - paymentStatus is CARD_SAVED
    // - ride departure time has passed
    // - payment method is saved
    const pendingPayments = await prisma.rideRequest.findMany({
      where: {
        status: "ACCEPTED",
        paymentStatus: "CARD_SAVED",
        stripePaymentMethodId: { not: null },
      },
      include: {
        ride: {
          include: {
            driver: true,
          },
        },
        passenger: true,
      },
    })

    const results = {
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const request of pendingPayments) {
      try {
        // Parse departure time
        if (!request.ride.departureDate) {
          results.skipped++
          continue
        }

        const departureDateTime = new Date(request.ride.departureDate)
        const [hours, minutes] = request.ride.departureTime.split(":")
        departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)

        // Check if departure time has passed
        if (departureDateTime > now) {
          results.skipped++
          continue
        }

        // Mark as processing
        await prisma.rideRequest.update({
          where: { id: request.id },
          data: { paymentStatus: "PROCESSING" },
        })

        // Calculate amounts
        const agreedPrice = request.agreedPrice || 0
        const totalAmountCents = dollarsToCents(agreedPrice) + PLATFORM_FEE_CENTS
        const driverPayoutCents = dollarsToCents(agreedPrice)

        // Check if driver has Stripe Connect
        const driverHasStripe = request.ride.driver.stripeConnectAccountId &&
          request.ride.driver.stripeConnectChargesEnabled

        let paymentIntent

        if (driverHasStripe && driverPayoutCents > 0) {
          // Create payment with destination charge to driver
          paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents,
            currency: "usd",
            customer: request.passenger.stripeCustomerId!,
            payment_method: request.stripePaymentMethodId!,
            off_session: true,
            confirm: true,
            application_fee_amount: PLATFORM_FEE_CENTS,
            transfer_data: {
              destination: request.ride.driver.stripeConnectAccountId!,
            },
            metadata: {
              rideRequestId: request.id,
              rideId: request.rideId,
              passengerId: request.passengerId,
              driverId: request.ride.driverId,
            },
          })
        } else {
          // Driver doesn't have Stripe or it's a free ride - platform keeps all
          paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents,
            currency: "usd",
            customer: request.passenger.stripeCustomerId!,
            payment_method: request.stripePaymentMethodId!,
            off_session: true,
            confirm: true,
            metadata: {
              rideRequestId: request.id,
              rideId: request.rideId,
              passengerId: request.passengerId,
              driverId: request.ride.driverId,
            },
          })
        }

        // Update request with successful payment
        await prisma.rideRequest.update({
          where: { id: request.id },
          data: {
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: "SUCCEEDED",
            chargedAt: new Date(),
          },
        })

        results.processed++
      } catch (error) {
        // Handle payment failure
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.failed++
        results.errors.push(`Request ${request.id}: ${errorMessage}`)

        await prisma.rideRequest.update({
          where: { id: request.id },
          data: {
            paymentStatus: "FAILED",
            paymentFailureReason: errorMessage,
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error("Error processing payments:", error)
    return NextResponse.json(
      { error: "Failed to process payments" },
      { status: 500 }
    )
  }
}
