import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe, dollarsToCents, centsToDollars, PLATFORM_FEE_CENTS, PLATFORM_FEE_DOLLARS } from "@/lib/stripe"
import Stripe from "stripe"

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
            owner: true,
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

        // Fix #2: Validate stripeCustomerId before processing
        if (!request.passenger.stripeCustomerId) {
          results.failed++
          results.errors.push(`Request ${request.id}: Passenger has no Stripe customer ID`)
          await prisma.rideRequest.update({
            where: { id: request.id },
            data: {
              paymentStatus: "FAILED",
              paymentFailureReason: "Passenger payment profile not set up. Please add a payment method.",
            },
          })
          continue
        }

        // Fix #2: Validate stripePaymentMethodId
        if (!request.stripePaymentMethodId) {
          results.failed++
          results.errors.push(`Request ${request.id}: No payment method saved`)
          await prisma.rideRequest.update({
            where: { id: request.id },
            data: {
              paymentStatus: "FAILED",
              paymentFailureReason: "No payment method on file.",
            },
          })
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

        // Check if owner has Stripe Connect
        const ownerHasStripe = request.ride.owner.stripeConnectAccountId &&
          request.ride.owner.stripeConnectChargesEnabled

        let paymentIntent

        if (ownerHasStripe && driverPayoutCents > 0) {
          // Fix #3: Verify the Connect account is still active before charging
          try {
            const connectAccount = await stripe.accounts.retrieve(
              request.ride.owner.stripeConnectAccountId!
            )
            if (!connectAccount.charges_enabled) {
              results.failed++
              results.errors.push(`Request ${request.id}: Driver's payment account is disabled`)
              await prisma.rideRequest.update({
                where: { id: request.id },
                data: {
                  paymentStatus: "FAILED",
                  paymentFailureReason: "Driver's payment account is currently disabled. Payment will be retried when resolved.",
                },
              })
              continue
            }
          } catch {
            results.failed++
            results.errors.push(`Request ${request.id}: Could not verify driver's payment account`)
            await prisma.rideRequest.update({
              where: { id: request.id },
              data: {
                paymentStatus: "FAILED",
                paymentFailureReason: "Could not verify driver's payment account.",
              },
            })
            continue
          }

          // Create payment with destination charge to owner
          paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents,
            currency: "usd",
            customer: request.passenger.stripeCustomerId,
            payment_method: request.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            application_fee_amount: PLATFORM_FEE_CENTS,
            transfer_data: {
              destination: request.ride.owner.stripeConnectAccountId!,
            },
            metadata: {
              rideRequestId: request.id,
              rideId: request.rideId,
              passengerId: request.passengerId,
              ownerId: request.ride.ownerId,
            },
          })
        } else {
          // Owner doesn't have Stripe Connect or it's a free ride - platform keeps all
          paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmountCents,
            currency: "usd",
            customer: request.passenger.stripeCustomerId,
            payment_method: request.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            metadata: {
              rideRequestId: request.id,
              rideId: request.rideId,
              passengerId: request.passengerId,
              ownerId: request.ride.ownerId,
            },
          })
        }

        // Fix #1: Record payment amounts in DB
        await prisma.rideRequest.update({
          where: { id: request.id },
          data: {
            stripePaymentIntentId: paymentIntent.id,
            paymentStatus: "SUCCEEDED",
            paymentAmount: centsToDollars(totalAmountCents),
            platformFee: PLATFORM_FEE_DOLLARS,
            driverPayout: agreedPrice,
            chargedAt: new Date(),
          },
        })

        results.processed++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        results.errors.push(`Request ${request.id}: ${errorMessage}`)

        // Fix #4: Distinguish transient vs permanent errors
        const isTransient = error instanceof Stripe.errors.StripeConnectionError ||
          error instanceof Stripe.errors.StripeAPIError ||
          (error instanceof Stripe.errors.StripeInvalidRequestError &&
            errorMessage.includes("rate_limit"))

        if (isTransient) {
          // Revert to CARD_SAVED so the next cron run retries
          results.skipped++
          await prisma.rideRequest.update({
            where: { id: request.id },
            data: {
              paymentStatus: "CARD_SAVED",
              paymentFailureReason: `Temporary error, will retry: ${errorMessage}`,
            },
          })
        } else {
          // Permanent failure (card declined, insufficient funds, etc.)
          results.failed++
          await prisma.rideRequest.update({
            where: { id: request.id },
            data: {
              paymentStatus: "FAILED",
              paymentFailureReason: errorMessage,
            },
          })
        }
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
