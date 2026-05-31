import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog — Medical Research Writing Guides',
  description: 'Guides, tips, and tutorials for medical researchers. Learn how to write case reports, submit to top journals, and format citations correctly.',
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
