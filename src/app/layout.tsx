import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Casebird - Hong Kong Legal Research Assistant",
  description:
    "AI-powered legal research assistant for Hong Kong lawyers. Search 1.3M+ legal cases with semantic and keyword matching.",
  keywords: [
    "Hong Kong law",
    "legal research",
    "case law",
    "HKLII",
    "legal AI",
    "court cases",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} antialiased h-screen overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
