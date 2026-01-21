import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { stripe } from "@/lib/stripe"

export async function POST() {
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

    // If user already has a Connect account, return it
    if (user.stripeConnectAccountId) {
      return NextResponse.json({
        accountId: user.stripeConnectAccountId,
        alreadyExists: true,
      })
    }

    // Create a new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
      metadata: {
        userId: user.id,
      },
    })

    // Save the account ID to the user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeConnectAccountId: account.id,
      },
    })

    return NextResponse.json({
      accountId: account.id,
      alreadyExists: false,
    })
  } catch (error) {
    console.error("Error creating Connect account:", error)
    return NextResponse.json(
      { error: "Failed to create Connect account" },
      { status: 500 }
    )
  }
}
