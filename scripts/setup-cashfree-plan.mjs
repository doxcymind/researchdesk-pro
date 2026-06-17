// One-time setup: creates the ₹499/month plan in Cashfree.
// Run once after adding CASHFREE_CLIENT_ID / CASHFREE_CLIENT_SECRET / CASHFREE_ENV
// to your env, then copy the printed plan_id into CASHFREE_PLAN_ID.
//
//   node --env-file=.env.prod.local scripts/setup-cashfree-plan.mjs
//
const isProd = process.env.CASHFREE_ENV === 'production'
const BASE = isProd ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg'

const planId = process.env.CASHFREE_PLAN_ID || 'scholar_monthly_499'

const res = await fetch(`${BASE}/plans`, {
  method: 'POST',
  headers: {
    'x-client-id': process.env.CASHFREE_CLIENT_ID,
    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
    'x-api-version': '2025-01-01',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    plan_id: planId,
    plan_name: 'Scholar Monthly',
    plan_type: 'PERIODIC',
    plan_currency: 'INR',
    plan_recurring_amount: 499,
    plan_max_amount: 499,
    plan_intervals: 1,
    plan_interval_type: 'MONTH',
    plan_max_cycles: 12,
    plan_note: 'ResearchDesk Pro Scholar 499 per month',
  }),
})

const data = await res.json()
if (!res.ok) {
  console.error('Failed to create plan:', data)
  process.exit(1)
}
console.log('Plan ready. Set CASHFREE_PLAN_ID to:', data.plan_id ?? planId)
console.log(JSON.stringify(data, null, 2))
