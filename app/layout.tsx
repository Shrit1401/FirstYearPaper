import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { AuthProvider } from "@/components/auth-provider";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ConditionalFooter } from "@/components/conditional-footer";
import { SessionTracker } from "@/components/session-tracker";
import { PostHogAnalytics } from "@/components/posthog-analytics";
import { Toaster } from "@/components/ui/sonner";
import { clientAnalyticsEnabled } from "@/lib/client-analytics";
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
  "Student-run archive for MIT Bengaluru question papers. Affiliated with MAHE, with compute sponsored by MAHE.";

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
    <ConvexAuthNextjsServerProvider>
      <html lang="en" className="dark">
        <head>
          {clientAnalyticsEnabled && <script
            async
            src="https://cdn.seline.com/seline.js"
            data-token="88834da29712e27"
          ></script>}
        </head>
        <body
          suppressHydrationWarning
          className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
        >
          <ConvexClientProvider>
            <AuthProvider>
              <SessionTracker />
              <PostHogAnalytics />
              <div className="min-h-screen flex-1">{children}</div>
              <ConditionalFooter />
              <Toaster position="bottom-center" />
            </AuthProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
