import { Resend } from 'resend'

/** Shared Resend client. */
export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Sender identity for all outbound email.
 *
 * Defaults to Resend's shared test domain (`onboarding@resend.dev`) so email
 * keeps working out of the box. For production deliverability + brand trust,
 * verify researchdeskpro.com in Resend, then set:
 *
 *   EMAIL_FROM_ADDRESS=hello@researchdeskpro.com
 *
 * Everything below flips automatically — no code change needed.
 */
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'

/** Transactional / product email (welcome, onboarding, auto-replies). */
export const EMAIL_FROM = `ResearchDesk Pro <${FROM_ADDRESS}>`

/** Contact-form notifications to the team inbox. */
export const EMAIL_FROM_CONTACT = `ResearchDesk Contact <${FROM_ADDRESS}>`
