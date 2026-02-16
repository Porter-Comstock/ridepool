import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

// POST - Confirm SetupIntent and save card to DB
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { setupIntentId } = await request.json()

    if (!setupIntentId) {
      return NextResponse.json(
        { error: "setupIntentId is required" },
        { status: 400 }
      )
    }

    // Retrieve the SetupIntent from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Setup intent has not succeeded" },
        { status: 400 }
      )
    }

    // Verify the SetupIntent belongs to this user
    if (setupIntent.metadata?.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      )
    }

    const paymentMethodId = setupIntent.payment_method as string
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "No payment method attached" },
        { status: 400 }
      )
    }

    // Get payment method details from Stripe
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId)

    if (!pm.card) {
      return NextResponse.json(
        { error: "Payment method is not a card" },
        { status: 400 }
      )
    }

    // Check if user has any existing cards
    const existingCount = await prisma.paymentMethod.count({
      where: { userId: session.user.id },
    })

    // Check for duplicate
    const existing = await prisma.paymentMethod.findUnique({
      where: { stripePaymentMethodId: paymentMethodId },
    })

    if (existing) {
      return NextResponse.json({ paymentMethod: existing })
    }

    // Save to DB
    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: session.user.id,
        stripePaymentMethodId: paymentMethodId,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        isDefault: existingCount === 0,
      },
    })

    return NextResponse.json({ paymentMethod })
  } catch (error) {
    console.error("Error confirming payment method:", error)
    return NextResponse.json(
      { error: "Failed to confirm payment method" },
      { status: 500 }
    )
  }
}
