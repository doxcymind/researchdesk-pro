// Minimal type declarations for @cashfreepayments/cashfree-js (ships no types).
// Covers only the surface we use: load() + subscription checkout.
declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeInstance {
    subscriptionsCheckout(options: {
      subsSessionId: string
      redirectTarget?: '_self' | '_blank' | '_top' | '_modal'
    }): Promise<{ error?: unknown; redirect?: boolean }> | void

    checkout(options: {
      paymentSessionId: string
      redirectTarget?: '_self' | '_blank' | '_top' | '_modal'
    }): Promise<{ error?: unknown; redirect?: boolean }> | void
  }

  export function load(options: {
    mode: 'sandbox' | 'production'
  }): Promise<CashfreeInstance>
}
