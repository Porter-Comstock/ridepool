import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // If no Connect account, return not connected status
    if (!user.stripeConnectAccountId) {
      return NextResponse.json({
        connected: false,
        onboardingComplete: false,
        chargesEnabled: false,
      })
    }

    // Retrieve the account from Stripe to get current status
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId)

    // Update the user record with current status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeConnectOnboardingComplete:
          account.details_submitted && account.charges_enabled,
        stripeConnectChargesEnabled: account.charges_enabled,
      },
    })

    return NextResponse.json({
      connected: true,
      onboardingComplete: account.details_submitted && account.charges_enabled,
      chargesEnabled: account.charges_enabled,
      detailsSubmitted: account.details_submitted,
      payoutsEnabled: account.payouts_enabled,
    })
  } catch (error) {
    console.error("Error checking Connect status:", error)
    return NextResponse.json(
      { error: "Failed to check Connect status" },
      { status: 500 }
    )
  }
}
