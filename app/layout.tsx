import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond, Playfair_Display } from "next/font/google";
import "./globals.css";
import PosthogProvider from '@/lib/components/PosthogProvider';

const dmSans = DM_Sans({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "ResearchDesk — Write Medical Research, Case Reports & Review Articles", template: "%s · ResearchDesk" },
  description: "ResearchDesk is an AI-powered workspace for writing medical research. Draft case reports, review articles, systematic reviews and meta-analyses — with built-in PubMed search, Vancouver citations, AI section review, and journal matching.",
  keywords: ["medical research writing", "case report", "review article", "systematic review", "meta-analysis", "PubMed", "Vancouver citations", "AI research assistant", "journal submission", "clinical study", "medical manuscript"],
  icons: { icon: '/logo.webp', apple: '/logo.webp' },
  openGraph: {
    title: "ResearchDesk — The Smartest Way to Write Medical Research",
    description: "Draft case reports, review articles, systematic reviews and meta-analyses — with built-in PubMed search, Vancouver citations, AI section review, and journal matching.",
    siteName: "ResearchDesk",
    type: "website",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${playfair.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PosthogProvider />
        {children}
      </body>
    </html>
  );
}
