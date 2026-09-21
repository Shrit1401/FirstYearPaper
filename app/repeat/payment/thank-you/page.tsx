import type { Metadata } from "next";
import { Suspense } from "react";
import { ThankYouClient } from "./thank-you-client";

export const metadata: Metadata = {
  title: "Payment received",
  robots: { index: false, follow: false },
};

export default function RepeatPaymentThankYouPage() {
  return (
    <Suspense fallback={null}>
      <ThankYouClient />
    </Suspense>
  );
}
