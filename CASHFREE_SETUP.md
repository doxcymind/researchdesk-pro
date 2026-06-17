# Cashfree Setup — Go-Live Checklist

ResearchDesk Pro's billing runs on **Cashfree Subscriptions** (PG API `2025-01-01`).
Deal: **7-day free trial → ₹499/month**, plan `scholar`. Login is Google OAuth, so
the user's mobile is collected once at checkout (Cashfree needs it for the mandate).

Work through these in order. None of the app code needs changing — this is all
account + config.

---

## 1. Create the Cashfree account
- [ ] Sign up at https://www.cashfree.com and complete **KYC** (business + bank details).
- [ ] Enable the **Subscriptions** product (recurring mandates need explicit activation — this is the slow step, start it first).
- [ ] Grab your **App ID** and **Secret Key** from Dashboard → Developers → API Keys
      (do the **sandbox** keys first to test, then production).

## 2. Add environment variables
Add to `.env.prod.local` (and Vercel project env). Start with sandbox values.

```
CASHFREE_CLIENT_ID=<App ID>
CASHFREE_CLIENT_SECRET=<Secret Key>      # also signs webhooks
CASHFREE_ENV=sandbox                      # flip to "production" when live
CASHFREE_PLAN_ID=scholar_monthly_499      # set in step 3
```

> The Secret Key doubles as the webhook signing key — no separate webhook secret.

## 3. Create the ₹499 plan (once)
```
node --env-file=.env.prod.local scripts/setup-cashfree-plan.mjs
```
Copy the printed `plan_id` into `CASHFREE_PLAN_ID`. Re-run against production env
later (a sandbox plan won't exist in production).

## 4. Supabase migration
Run in the Supabase SQL editor:
```sql
alter table profiles add column if not exists cashfree_subscription_id text;
```
(Phone is stored on `auth.users.user_metadata.phone` — no column needed.)

## 5. Configure the webhook
- [ ] Dashboard → Developers → Webhooks → add endpoint:
      `https://<your-domain>/api/cashfree/webhook`
- [ ] Subscribe to the subscription events (auth status, payment success/failed, status changed).
- [ ] Signature is verified automatically using `CASHFREE_CLIENT_SECRET`
      (`base64(HMAC-SHA256(x-webhook-timestamp + rawBody, secret))`).

## 6. Test in sandbox
- [ ] Deploy/preview with `CASHFREE_ENV=sandbox` (payments are disabled on `localhost` by design — use a deployed URL).
- [ ] Click upgrade → confirm the **mobile-number modal** appears (Google login has no phone).
- [ ] Complete the sandbox mandate → confirm the user flips to `scholar` (via webhook + the `/api/cashfree/activate` fallback).
- [ ] Confirm the phone is NOT re-asked on a second attempt (persisted to `user_metadata`).

## 7. Go live
- [ ] Set `CASHFREE_ENV=production` and swap in production keys + production `CASHFREE_PLAN_ID`.
- [ ] Point the production webhook at the live domain.

---

## How the code fits together
| File | Role |
|------|------|
| `lib/cashfree.ts` | Base URL, auth headers, `normalizeIndianPhone` |
| `app/api/cashfree/subscribe/route.ts` | Creates subscription (7-day trial), requires/persists phone, returns `subscription_session_id` |
| `app/api/cashfree/activate/route.ts` | Verifies status with Cashfree (+ email whitelist) — fallback to webhook |
| `app/api/cashfree/webhook/route.ts` | Signed webhook → sets `scholar` / `free` |
| `lib/hooks/useCashfree.ts` | `openCashfreeCheckout` — loads SDK, prompts for phone if needed |
| `lib/components/PhonePrompt.tsx` | One-time mobile-number modal |
| `scripts/setup-cashfree-plan.mjs` | One-time plan creator |

## Things to double-check against the live dashboard
- The frontend SDK call is `cashfree.subscriptionsCheckout({ subsSessionId })` — confirm
  the method/option names against your dashboard's integration snippet (written from docs, not yet run live).
- `authorization_amount` is ₹1 (refundable) for mandate validation — adjust if your dashboard recommends a different amount or `0` for e-NACH.
