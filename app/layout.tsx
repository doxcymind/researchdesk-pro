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
  title: { default: "ResearchDesk — AI-Powered Medical Research", template: "%s · ResearchDesk" },
  description: "AI-assisted tools for writing, reviewing, and publishing medical research. From Idea to Manuscript to Publication.",
  icons: { icon: '/logo.webp', apple: '/logo.webp' },
  openGraph: {
    title: "ResearchDesk — The Smartest Way to Write Medical Research",
    description: "AI-assisted tools for writing, reviewing, and publishing medical research.",
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
