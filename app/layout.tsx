import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') || 'localhost:3000';
  const origin = new URL(`${host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'}://${host}`);
  return {
  metadataBase: origin,
  title: "leanlab — Lean 4 online editor",
  description: "Learn Lean 4 in your browser. An online editor with runnable programs, proof checking, guided lessons, and a syntax reference.",
  openGraph: { title: "leanlab — Lean 4 online editor", description: "Run Lean 4 programs, check proofs, and follow guided tutorials.", type: "website", images: [{ url: new URL('/og.png', origin).href, width: 1733, height: 908, alt: 'leanlab — Lean 4 online editor' }] },
  twitter: { card: "summary_large_image", title: "leanlab — Lean 4 online editor", images: [new URL('/og.png', origin).href] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
