import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics sign-in",
  robots: { index: false, follow: false },
};

export default function AnalyticsGateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
