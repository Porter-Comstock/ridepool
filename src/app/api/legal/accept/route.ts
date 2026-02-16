import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { termsAcceptedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to accept terms:", error)
    return NextResponse.json(
      { error: "Failed to accept terms" },
      { status: 500 }
    )
  }
}
