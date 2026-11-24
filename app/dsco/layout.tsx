import type { Metadata } from "next";
import "./dsco.css";

export const metadata: Metadata = {
  title: "DSCO lecture slides",
  description: "Every CSS 2104 Digital Systems & Computer Organization lecture deck, module by module.",
};

export default function DscoLayout({ children }: { children: React.ReactNode }) {
  return <div className="dsco-root">{children}</div>;
}
