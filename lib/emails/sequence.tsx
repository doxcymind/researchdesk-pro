import * as React from 'react'
import { EmailShell, H1, P, Accent, CTA } from './EmailLayout'

/**
 * Onboarding drip — emails #2–#5. Email #1 (WelcomeEmail) sends immediately at
 * signup; these are scheduled via Resend `scheduledAt` at the day offsets below.
 * Edit copy freely; keep the brand voice (the senior resident who explains things).
 */

const DASHBOARD = 'https://researchdeskpro.com/dashboard'
const NEW_PROJECT = 'https://researchdeskpro.com/new-project'
const PRICING = 'https://researchdeskpro.com/pricing'

const greet = (name?: string) => name?.split(' ')[0] || 'Researcher'

interface EmailProps { name?: string; unsubscribeUrl?: string }

// Email #2 — Day 1 — belief: system > talent
function WhyDoctorsDontPublish({ name, unsubscribeUrl }: EmailProps) {
  return (
    <EmailShell unsubscribeUrl={unsubscribeUrl}>
      <H1>The #1 reason doctors never publish</H1>
      <P>Hi {greet(name)}, it isn&apos;t intelligence. It isn&apos;t even time (though it feels like it). The real reason most doctors never publish is simpler: <Accent>no one ever gave them a system.</Accent></P>
      <P>You were taught to diagnose, to operate, to manage a ward at 2 AM. You were never taught how a paper is actually built — section by section, from a blank page to a submission.</P>
      <P>Here&apos;s the secret the prolific authors know: <Accent>a paper is just a structure you fill in.</Accent> Introduction, Methods, Results, Discussion. Pick a section. Write the bullet points. Expand them. Move on. Momentum beats motivation every time.</P>
      <P>That&apos;s the whole idea behind ResearchDesk Pro — we hand you the structure so the blank page stops winning.</P>
      <CTA href={DASHBOARD}>Open your workspace →</CTA>
    </EmailShell>
  )
}

// Email #3 — Day 3 — illustrative story / social proof
function SixWeekStory({ name, unsubscribeUrl }: EmailProps) {
  return (
    <EmailShell unsubscribeUrl={unsubscribeUrl}>
      <H1>From blank page to published in 6 weeks</H1>
      <P>Hi {greet(name)} — here&apos;s a story we hear all the time (this one&apos;s a composite, but you&apos;ll recognise it).</P>
      <P>A second-year resident. Post-call most days. Convinced they had &quot;no time for research.&quot; They saw one unusual case on duty — the kind everyone says &quot;you should write that up&quot; about, and then never does.</P>
      <P>This time they did. Not a thesis. Not an original article. <Accent>A case report</Accent> — six sections, a clear structure, 30 focused minutes at a time. Six weeks later: submitted. A few weeks after that: a real line on their CV.</P>
      <P>The lesson isn&apos;t &quot;work harder.&quot; It&apos;s <Accent>start small and start structured.</Accent> The fastest publication you&apos;ll ever land is the case report sitting on your ward right now.</P>
      <CTA href={NEW_PROJECT}>Start your first case report →</CTA>
    </EmailShell>
  )
}

// Email #4 — Day 5 — product demo / activation
function BlankPageToDraft({ name, unsubscribeUrl }: EmailProps) {
  return (
    <EmailShell unsubscribeUrl={unsubscribeUrl}>
      <H1>Blank page → first draft in 10 minutes</H1>
      <P>Hi {greet(name)}, let&apos;s make this concrete. Here&apos;s what a session inside ResearchDesk Pro actually looks like:</P>
      <P>
        <Accent>1.</Accent> Pick your study type — the right sections appear automatically.<br />
        <Accent>2.</Accent> Drop in your notes or results. The AI shapes a structured first draft — Introduction funnel, Methods, the lot.<br />
        <Accent>3.</Accent> You do the real work: edit with your clinical judgement. References format themselves in Vancouver.
      </P>
      <P>The AI doesn&apos;t think for you — it removes the blank page so you can. What used to be 20 hours of staring becomes an evening of editing.</P>
      <CTA href={DASHBOARD}>Try it on a real section →</CTA>
    </EmailShell>
  )
}

// Email #5 — Day 7 — vision + offer
function CVInTwelveMonths({ name, unsubscribeUrl }: EmailProps) {
  return (
    <EmailShell unsubscribeUrl={unsubscribeUrl}>
      <H1>Your CV, twelve months from now</H1>
      <P>Hi {greet(name)}, picture your CV a year from today with one small habit in place:</P>
      <P>
        <Accent>One case report.</Accent> <Accent>One review.</Accent> <Accent>One original article.</Accent><br />
        Three lines that change interviews, promotions, and fellowship applications — built from work you were already doing on the wards.
      </P>
      <P>That&apos;s not a heroic sprint. It&apos;s a sustainable system — exactly what ResearchDesk Pro is built to give you. And we keep it student- and resident-friendly, because the people who need this most are usually the ones being paid the least.</P>
      <P>Take a look at the plans, pick the one that fits your year, and let&apos;s get your name indexed.</P>
      <CTA href={PRICING}>See plans & start →</CTA>
    </EmailShell>
  )
}

export interface SequenceEmail {
  id: string
  /** Days after signup to send. */
  dayOffset: number
  subject: string
  build: (name?: string, unsubscribeUrl?: string) => React.ReactElement
}

export const welcomeSequence: SequenceEmail[] = [
  { id: 'why-publish',   dayOffset: 1, subject: 'The #1 reason doctors never publish',        build: (name, u) => <WhyDoctorsDontPublish name={name} unsubscribeUrl={u} /> },
  { id: 'six-week-story', dayOffset: 3, subject: 'From blank page to published in 6 weeks',     build: (name, u) => <SixWeekStory name={name} unsubscribeUrl={u} /> },
  { id: 'product-demo',  dayOffset: 5, subject: 'Blank page → first draft in 10 minutes',      build: (name, u) => <BlankPageToDraft name={name} unsubscribeUrl={u} /> },
  { id: 'cv-offer',      dayOffset: 7, subject: 'Your CV, twelve months from now',             build: (name, u) => <CVInTwelveMonths name={name} unsubscribeUrl={u} /> },
]
