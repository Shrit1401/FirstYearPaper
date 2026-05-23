import type { Metadata } from "next";
import { RepeatClosed } from "@/components/repeat-closed";

export const metadata: Metadata = {
  title: "Repeat · Closed",
  description: "Repeat is done for the semester. Thank you for the support.",
  robots: { index: false, follow: false },
};

export default function RepeatPage() {
  return <RepeatClosed />;
}
