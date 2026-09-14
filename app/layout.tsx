import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./workspace.css";
import './content.css';
import { siteURL } from '../lib/site';
import WebAnalytics from '../components/web-analytics';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteURL),
  title: "leanlab — Lean 4 online editor",
  description: "Learn Lean 4 in your browser. An online editor with runnable programs, proof checking, guided lessons, and a syntax reference.",
  openGraph: { title: "leanlab — Lean 4 online editor", description: "Run Lean 4 programs, check proofs, and follow guided tutorials.", type: "website", images: [{ url: '/og.png', width: 1733, height: 908, alt: 'leanlab — Lean 4 online editor' }] },
  twitter: { card: "summary_large_image", title: "leanlab — Lean 4 online editor", images: ['/og.png'] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="text/plain" href="/llms.txt" title="Guide for agents" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <WebAnalytics />
      </body>
    </html>
  );
}
