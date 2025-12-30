import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"

const ALLOWED_EMAIL_DOMAIN = "colgate.edu"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
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
    async session({ session, user }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login page on error
  },
})
