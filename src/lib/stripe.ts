import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
})

// Platform fee
export const PLATFORM_FEE_CENTS = 500
export const PLATFORM_FEE_DOLLARS = 5.0

// Helper to convert dollars to cents
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

// Helper to convert cents to dollars
export function centsToDollars(cents: number): number {
  return cents / 100
}
