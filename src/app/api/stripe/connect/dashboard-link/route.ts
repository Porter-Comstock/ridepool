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

    if (!user?.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "No Connect account found" },
        { status: 400 }
      )
    }

    // Create a login link to the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      user.stripeConnectAccountId
    )

    return NextResponse.json({ url: loginLink.url })
  } catch (error) {
    console.error("Error creating dashboard link:", error)
    return NextResponse.json(
      { error: "Failed to create dashboard link" },
      { status: 500 }
    )
  }
}
