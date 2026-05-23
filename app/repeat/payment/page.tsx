import type { Metadata } from "next";
import { RepeatClosed } from "@/components/repeat-closed";

export const metadata: Metadata = {
  title: "Repeat · Closed",
  robots: { index: false, follow: false },
};

export default function RepeatPaymentPage() {
  return <RepeatClosed />;
}
