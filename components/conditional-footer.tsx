"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/repeat") || pathname?.startsWith("/midsem")) return null;

  return (
    <>
      <Footer />
      <Link
        href="http://shrit.in"
        target="_blank"
        className="fixed bottom-6 left-6 z-50 rounded-md border border-border/50 bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:border-border hover:text-foreground"
      >
        made by shrit
      </Link>
    </>
  );
}
