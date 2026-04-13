"use client";

import { useEffect } from "react";
import { startSession, endSession } from "@/lib/tracking";

export function SessionTracker() {
  useEffect(() => {
    startSession();
    const onUnload = () => endSession();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      endSession();
    };
  }, []);

  return null;
}
