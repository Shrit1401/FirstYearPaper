import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "First Year Question Papers | MIT Bengaluru",
  description:
    "Manipal Institute of Technology Bengaluru — First year Mid-sem and End-sem question papers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <div className="min-h-screen flex-1">{children}</div>
        <Footer />
        <Link
          href="http://shrit.in"
          target="_blank"
          className="fixed bottom-6 left-6 z-50 rounded-md border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-border hover:text-foreground"
        >
          made by shrit
        </Link>
      </body>
    </html>
  );
}
