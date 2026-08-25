"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

function pageGroup(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/browse")) return "browse";
  if (pathname.startsWith("/repeat")) return "repeat";
  if (pathname.startsWith("/editable") || pathname.startsWith("/papers")) return "paper_tools";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/analytics")) return "analytics";
  return "other";
}

function elementLabel(element: HTMLElement) {
  return (
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.textContent ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function PostHogAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    const startedAt = Date.now();
    const reached = new Set<number>();
    let maximumScrollDepth = 0;

    posthog.capture("route_viewed", {
      path: pathname,
      page_group: pageGroup(pathname),
      query_string_present: Boolean(window.location.search),
      referrer_host: document.referrer
        ? (() => {
            try {
              return new URL(document.referrer).host;
            } catch {
              return "invalid";
            }
          })()
        : "direct",
    });

    function updateScrollDepth() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const depth = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));
      maximumScrollDepth = Math.max(maximumScrollDepth, depth);

      for (const milestone of [25, 50, 75, 100]) {
        if (depth >= milestone && !reached.has(milestone)) {
          reached.add(milestone);
          posthog.capture("scroll_depth_reached", {
            path: pathname,
            page_group: pageGroup(pathname),
            depth_percent: milestone,
          });
        }
      }
    }

    window.addEventListener("scroll", updateScrollDepth, { passive: true });
    updateScrollDepth();

    return () => {
      window.removeEventListener("scroll", updateScrollDepth);
      posthog.capture("page_engagement_completed", {
        path: pathname,
        page_group: pageGroup(pathname),
        duration_seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
        maximum_scroll_depth: maximumScrollDepth,
      });
    };
  }, [pathname]);

  useEffect(() => {
    function captureInteraction(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest("a");
      if (anchor instanceof HTMLAnchorElement) {
        let destinationHost = "";
        let isExternal = false;
        try {
          const destination = new URL(anchor.href, window.location.href);
          destinationHost = destination.host;
          isExternal = destination.origin !== window.location.origin;
        } catch {
          destinationHost = "invalid";
        }

        posthog.capture("navigation_clicked", {
          source_path: window.location.pathname,
          destination_url: anchor.href,
          destination_host: destinationHost,
          link_text: elementLabel(anchor),
          is_external: isExternal,
          opens_new_tab: anchor.target === "_blank",
          is_download: anchor.hasAttribute("download"),
        });
        return;
      }

      const button = event.target.closest("button,[role='button']");
      if (button instanceof HTMLElement) {
        posthog.capture("ui_control_clicked", {
          path: window.location.pathname,
          control_label: elementLabel(button),
          control_type:
            button instanceof HTMLButtonElement ? button.type || "button" : button.getAttribute("role"),
          disabled: button.getAttribute("aria-disabled") === "true" ||
            (button instanceof HTMLButtonElement && button.disabled),
        });
      }
    }

    document.addEventListener("click", captureInteraction, true);
    return () => document.removeEventListener("click", captureInteraction, true);
  }, []);

  return null;
}
