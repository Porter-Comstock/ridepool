/**
 * Gate Rides - Payment Split Test Script
 *
 * Tests that Stripe destination charges correctly split payments:
 * - Rider is charged: agreedPrice + $5 platform fee
 * - Driver receives: agreedPrice (via Stripe Connect, net of application fee)
 * - Gate Rides keeps: $5 platform fee
 *
 * How destination charges work:
 *   1. Full amount is charged to rider
 *   2. Full amount is transferred to driver's Connect account
 *   3. Application fee ($5) is deducted back from driver to Gate Rides
 *   4. Net to driver = charge amount - application fee = agreed price
 *
 * Usage: node --env-file=.env scripts/test-payment-split.mjs
 */

import Stripe from "stripe"

const PLATFORM_FEE_CENTS = 500 // $5.00

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function dollars(cents) {
  return `$${(cents / 100).toFixed(2)}`
}

async function findActiveConnectAccount() {
  const accounts = await stripe.accounts.list({ limit: 20 })
  return accounts.data.find(
    (a) => a.charges_enabled && a.capabilities?.transfers === "active"
  )
}

async function runTest() {
  console.log("=== Gate Rides Payment Split Test ===\n")

  // 1. Find an active Connect account (driver)
  console.log("1. Finding active Connect account (driver)...")
  const account = await findActiveConnectAccount()
  if (!account) {
    console.error("   No active Connect account found!")
    console.error("   A driver needs to complete Stripe Connect onboarding first.")
    process.exit(1)
  }
  console.log(`   Using: ${account.id} (${account.email || account.individual?.email || "unknown"})`)
  console.log(`   Charges: ${account.charges_enabled} | Transfers: ${account.capabilities?.transfers}\n`)

  // 2. Create a test customer (rider)
  console.log("2. Creating test customer (rider)...")
  const customer = await stripe.customers.create({
    name: "Test Rider",
    email: "testrider@colgate.edu",
    metadata: { test: "true" },
  })
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: { token: "tok_visa" },
  })
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id })
  console.log(`   Customer: ${customer.id} | Card: Visa ****${paymentMethod.card.last4}\n`)

  // 3. Run test scenarios
  const testCases = [
    { agreedPrice: 20, label: "$20 ride" },
    { agreedPrice: 10, label: "$10 ride" },
    { agreedPrice: 50, label: "$50 ride" },
    { agreedPrice: 5, label: "$5 ride (edge: fee equals ride cost)" },
    { agreedPrice: 0, label: "$0 ride (free, platform fee only)" },
  ]

  let passed = 0
  let failed = 0

  console.log("3. Running payment split tests...\n")

  for (const { agreedPrice, label } of testCases) {
    const agreedCents = Math.round(agreedPrice * 100)
    const totalCents = agreedCents + PLATFORM_FEE_CENTS

    console.log(`── ${label} ${"─".repeat(Math.max(0, 55 - label.length))}`)
    console.log(`   Rider pays: ${dollars(totalCents)} (${dollars(agreedCents)} ride + ${dollars(PLATFORM_FEE_CENTS)} fee)`)

    try {
      if (agreedCents > 0) {
        // Destination charge with application fee
        const pi = await stripe.paymentIntents.create({
          amount: totalCents,
          currency: "usd",
          customer: customer.id,
          payment_method: paymentMethod.id,
          off_session: true,
          confirm: true,
          application_fee_amount: PLATFORM_FEE_CENTS,
          transfer_data: { destination: account.id },
          metadata: { test: "true", testCase: label },
        })

        // Wait for Stripe to create the transfer and application fee (async)
        let charge
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((r) => setTimeout(r, 2000))
          charge = await stripe.charges.retrieve(pi.latest_charge, {
            expand: ["transfer", "application_fee"],
          })
          if (charge.transfer && charge.application_fee) break
        }

        const transferAmount = charge.transfer?.amount || 0
        const appFeeAmount = charge.application_fee?.amount || 0
        const driverNet = transferAmount - appFeeAmount

        console.log(`   Transfer to driver (gross): ${dollars(transferAmount)}`)
        console.log(`   Application fee (back to Gate Rides): ${dollars(appFeeAmount)}`)
        console.log(`   Driver net: ${dollars(transferAmount)} - ${dollars(appFeeAmount)} = ${dollars(driverNet)}`)

        const driverCorrect = driverNet === agreedCents
        const feeCorrect = appFeeAmount === PLATFORM_FEE_CENTS
        const chargeCorrect = charge.amount === totalCents

        if (driverCorrect && feeCorrect && chargeCorrect) {
          console.log(`   Result: PASS`)
          passed++
        } else {
          console.log(`   Result: FAIL`)
          if (!chargeCorrect) console.log(`     Charge: expected ${dollars(totalCents)}, got ${dollars(charge.amount)}`)
          if (!feeCorrect) console.log(`     Fee: expected ${dollars(PLATFORM_FEE_CENTS)}, got ${dollars(appFeeAmount)}`)
          if (!driverCorrect) console.log(`     Driver net: expected ${dollars(agreedCents)}, got ${dollars(driverNet)}`)
          failed++
        }

        // Refund to keep test account clean
        await stripe.refunds.create({
          payment_intent: pi.id,
          reverse_transfer: true,
          refund_application_fee: true,
        })
      } else {
        // Free ride: charge only the platform fee, no Connect transfer
        const pi = await stripe.paymentIntents.create({
          amount: PLATFORM_FEE_CENTS,
          currency: "usd",
          customer: customer.id,
          payment_method: paymentMethod.id,
          off_session: true,
          confirm: true,
          metadata: { test: "true", testCase: label },
        })

        console.log(`   Charged: ${dollars(PLATFORM_FEE_CENTS)} (Gate Rides only, no driver transfer)`)

        if (pi.status === "succeeded") {
          console.log(`   Result: PASS`)
          passed++
        } else {
          console.log(`   Result: FAIL (status: ${pi.status})`)
          failed++
        }

        await stripe.refunds.create({ payment_intent: pi.id })
      }
    } catch (error) {
      console.log(`   Result: ERROR - ${error.message}`)
      failed++
    }
    console.log()
  }

  // 4. Cleanup
  console.log("4. Cleaning up...")
  await stripe.paymentMethods.detach(paymentMethod.id)
  await stripe.customers.del(customer.id)
  console.log("   Test customer and card deleted.\n")

  // 5. Summary
  console.log("═".repeat(60))
  console.log(`   ${passed} passed, ${failed} failed out of ${testCases.length} tests`)
  console.log()
  if (failed === 0) {
    console.log("   Payment split is working correctly!")
    console.log()
    console.log("   How funds flow for a ride:")
    console.log("   ┌─────────────────────────────────────────────────┐")
    console.log("   │  Rider pays: agreed price + $5.00 fee           │")
    console.log("   │  ↓ Full amount transferred to driver via Stripe │")
    console.log("   │  ↓ $5.00 application fee deducted back          │")
    console.log("   │  Driver nets: agreed price                      │")
    console.log("   │  Gate Rides nets: $5.00                         │")
    console.log("   └─────────────────────────────────────────────────┘")
  } else {
    console.log("   Some tests failed! Review output above.")
  }
  console.log("═".repeat(60))
  console.log("\nStripe Dashboard: https://dashboard.stripe.com/test/payments")
}

runTest().catch((error) => {
  console.error("\nFatal error:", error.message)
  process.exit(1)
})
