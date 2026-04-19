import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ConditionalFooter } from "@/components/conditional-footer";
import { SessionTracker } from "@/components/session-tracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "End Sem / Mid Sem Question Papers | MIT Bengaluru";
const siteDescription =
  "Unofficial student-run archive for MIT Bengaluru first-year Mid-sem and End-sem question papers. This project is independent and is not affiliated with or endorsed by MAHE.";

export const metadata: Metadata = {
  title: {
    default: siteName,
    template: "%s | MIT Bengaluru QP",
  },
  description: siteDescription,
  keywords: [
    "MIT Bengaluru",
    "Manipal",
    "first year",
    "question papers",
    "midsem",
    "endsem",
    "past papers",
    "Core stream",
    "CS stream",
    "Common",
  ],
  authors: [{ name: "shrit", url: "https://shrit.in" }],
  creator: "shrit",
  openGraph: {
    type: "website",
    title: siteName,
    description: siteDescription,
    siteName: "MIT Bengaluru End Sem / Mid Sem Question Papers",
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          async
          src="https://cdn.seline.com/seline.js"
          data-token="88834da29712e27"
        ></script>
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <AuthProvider>
          <SessionTracker />
          <div className="min-h-screen flex-1">{children}</div>
          <ConditionalFooter />
          <Link
            href="http://shrit.in"
            target="_blank"
            className="fixed bottom-6 left-6 z-50 rounded-md border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-border hover:text-foreground"
          >
            made by shrit
          </Link>
        </AuthProvider>
      </body>
    </html>
  );
}
