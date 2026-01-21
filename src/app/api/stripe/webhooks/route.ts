import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    console.error("Webhook signature verification failed:", errorMessage)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const rideRequestId = paymentIntent.metadata.rideRequestId

        if (rideRequestId) {
          await prisma.rideRequest.update({
            where: { id: rideRequestId },
            data: {
              paymentStatus: "SUCCEEDED",
              chargedAt: new Date(),
            },
          })
        }
        break
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const rideRequestId = paymentIntent.metadata.rideRequestId

        if (rideRequestId) {
          const error = paymentIntent.last_payment_error
          await prisma.rideRequest.update({
            where: { id: rideRequestId },
            data: {
              paymentStatus: "FAILED",
              paymentFailureReason: error?.message || "Payment failed",
            },
          })
        }
        break
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string

        if (paymentIntentId) {
          // Find the ride request by payment intent ID
          const rideRequest = await prisma.rideRequest.findFirst({
            where: { stripePaymentIntentId: paymentIntentId },
          })

          if (rideRequest) {
            await prisma.rideRequest.update({
              where: { id: rideRequest.id },
              data: { paymentStatus: "REFUNDED" },
            })
          }
        }
        break
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account

        // Find user by Stripe Connect account ID
        const user = await prisma.user.findFirst({
          where: { stripeConnectAccountId: account.id },
        })

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stripeConnectOnboardingComplete:
                account.details_submitted && account.charges_enabled,
              stripeConnectChargesEnabled: account.charges_enabled,
            },
          })
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    )
  }
}
