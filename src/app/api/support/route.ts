import { Resend } from "resend"
import { NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)

const SUPPORT_EMAIL = "porter.comstock@gmail.com"

const categoryLabels: Record<string, string> = {
  general: "General Question",
  ride_issue: "Ride Issue",
  payment: "Payment Problem",
  account: "Account Help",
  bug: "Bug Report",
  feature: "Feature Request",
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, category, subject, message, userId } = body

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const categoryLabel = categoryLabels[category] || category

    const { error } = await resend.emails.send({
      from: "Gate Rides Support <support@updates.gaterides.com>",
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[${categoryLabel}] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #821019;">New Support Request</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">From:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">Category:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${categoryLabel}</td>
            </tr>
            ${userId ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">User ID:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><code>${userId}</code></td>
            </tr>
            ` : `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee; font-weight: bold;">User ID:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><em>Not signed in</em></td>
            </tr>
            `}
          </table>

          <h3 style="color: #333;">Subject</h3>
          <p style="background: #f5f5f5; padding: 12px; border-radius: 4px;">${subject}</p>

          <h3 style="color: #333;">Message</h3>
          <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; white-space: pre-wrap;">${message}</div>

          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #888; font-size: 12px;">
            This message was sent from the Gate Rides support form.
            Reply directly to this email to respond to ${name}.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Failed to send support email:", error)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Support API error:", error)
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    )
  }
}
