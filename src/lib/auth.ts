import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

const ALLOWED_EMAIL_DOMAIN = "colgate.edu"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt", // Use JWT for Edge runtime compatibility
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow @colgate.edu emails
      if (user.email) {
        const emailDomain = user.email.split("@")[1]
        if (emailDomain !== ALLOWED_EMAIL_DOMAIN) {
          return false // Reject sign-in
        }
      } else {
        return false // No email, reject
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      // Add user ID to token on first sign-in
      if (user) {
        token.id = user.id
        // Fetch termsAcceptedAt from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { termsAcceptedAt: true },
        })
        token.termsAcceptedAt = dbUser?.termsAcceptedAt ?? null
      }
      // Refresh termsAcceptedAt on session update
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { termsAcceptedAt: true },
        })
        token.termsAcceptedAt = dbUser?.termsAcceptedAt ?? null
      }
      return token
    },
    async session({ session, token }) {
      // Add user ID and termsAcceptedAt to session from token
      if (session.user && token.id) {
        session.user.id = token.id as string
        session.user.termsAcceptedAt = (token.termsAcceptedAt as Date | null) ?? null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Handle callback redirects
      if (url.startsWith(baseUrl)) return url
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
