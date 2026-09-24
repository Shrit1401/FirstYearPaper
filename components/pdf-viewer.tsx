"use client";

import { REPEAT_VISIBLE } from "@/lib/feature-visibility";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ExternalLink,
  Download,
  FileText,
  Loader2,
  Edit3,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trackPaperView } from "@/lib/tracking";
import { useHydrated } from "@/lib/use-hydrated";
import { resolvePublicPaperHref } from "@/lib/paper-url";
import posthog from "posthog-js";

/** Minimal PDF.js viewer app shape (embedded iframe). */
type EmbeddedPdfApp = {
  initialized?: boolean;
  pdfViewer?: { currentPageNumber?: number };
  findBar?: {
    open?: () => void;
    close?: () => void;
    findField?: HTMLInputElement;
    findMsg?: { textContent: string };
    highlightAll?: { checked: boolean };
    caseSensitive?: { checked: boolean };
    dispatchEvent: (type: string, findPrev?: boolean) => void;
  };
  page?: number;
};

/** Close find UI and clear “phrase not found” / stale query (citation opens). */
function resetEmbeddedPdfFindBar(app: EmbeddedPdfApp | undefined) {
  const bar = app?.findBar;
  if (!bar) return;
  try {
    if (bar.findField) {
      bar.findField.value = "";
      bar.findField.classList.remove("notFound");
      bar.findField.removeAttribute("data-status");
    }
    if (bar.findMsg) bar.findMsg.textContent = "";
    bar.close?.();
  } catch {
    // ignore cross-origin or viewer version quirks
  }
}

type Props = {
  href: string;
  name: string;
  children: React.ReactNode;
  viewerHref?: string;
  viewerPage?: number;
  viewerSearch?: string;
  externalHref?: string;
  downloadHref?: string;
  editableId?: string;
  repeatPaperId?: string;
  showPracticeLink?: boolean;
  /** Short label (e.g. "Q3B · page 2") shown near the PDF; use contextTitleDetail for full tooltip. */
  contextTitle?: string;
  /** Full question text for hover tooltip when contextTitle is shortened. */
  contextTitleDetail?: string;
  contextBody?: string;
  contextMeta?: string;
  /** Citation opens: page jump only, no PDF find (avoids “phrase not found”). */
  citationPageMarker?: boolean;
  onOpen?: () => void;
};

export function PaperViewer({
  href,
  name,
  children,
  viewerHref,
  viewerPage,
  viewerSearch,
  externalHref,
  downloadHref,
  editableId,
  repeatPaperId,
  showPracticeLink = !href.startsWith("/midsem/imported/"),
  contextTitle,
  contextTitleDetail,
  contextBody,
  contextMeta,
  citationPageMarker,
  onOpen,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [framePulse, setFramePulse] = useState(false);
  const mounted = useHydrated();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const openedAtRef = useRef<number | null>(null);

  const repeatHref = repeatPaperId
    ? `/repeat/library?paper=${encodeURIComponent(repeatPaperId)}`
    : `/repeat/library?source=${encodeURIComponent(href)}`;
  const cleanName = name.replace(/\.pdf$/i, "");
  const resolvedFileHref = resolvePublicPaperHref(href);
  const previewHref = `/vendor/paper-viewer/index.html?file=${encodeURIComponent(resolvedFileHref)}${viewerPage ? `&page=${viewerPage}` : ""}`;
  const iframeHref = viewerHref ?? previewHref;
  const openHref = externalHref ?? iframeHref;
  const saveHref = resolvePublicPaperHref(downloadHref ?? href);
  const isCustomViewer = iframeHref.includes(
    "/vendor/pdf-viewer/web/viewer.html",
  );
  const isOnsiteViewer = iframeHref.includes("/vendor/paper-viewer/");
  const iframeSrc = isCustomViewer || isOnsiteViewer
    ? iframeHref
    : `${iframeHref}${iframeHref.includes("#") ? "&" : "#"}toolbar=1&navpanes=0&view=FitH`;

  function openViewer(e: React.MouseEvent | React.KeyboardEvent) {
    e.preventDefault();
    setLoaded(false);
    setClosing(false);
    setOpen(true);
    openedAtRef.current = Date.now();
    trackPaperView(href, cleanName);
    posthog.capture("paper_opened", {
      paper_name: cleanName,
      paper_href: href,
      source_path: window.location.pathname,
      has_editable_copy: Boolean(editableId),
      citation_open: Boolean(citationPageMarker),
      requested_page: viewerPage ?? null,
      has_search_highlight: Boolean(viewerSearch?.trim()),
    });
    onOpen?.();
  }

  const close = useCallback(() => {
    posthog.capture("paper_closed", {
      paper_name: cleanName,
      paper_href: href,
      source_path: window.location.pathname,
      loaded,
      open_duration_seconds: openedAtRef.current
        ? Math.max(0, Math.round((Date.now() - openedAtRef.current) / 1000))
        : 0,
    });
    openedAtRef.current = null;
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 180);
  }, [cleanName, href, loaded]);

  function capturePaperAction(
    action: "editable_copy" | "download" | "new_tab",
    surface: "desktop" | "mobile",
  ) {
    posthog.capture("paper_action_clicked", {
      action,
      surface,
      paper_name: cleanName,
      paper_href: href,
      source_path: window.location.pathname,
      viewer_loaded: loaded,
    });
  }

  const markLoaded = useCallback(() => {
    setLoaded(true);
    posthog.capture("paper_loaded", {
      paper_name: cleanName,
      paper_href: href,
      source_path: window.location.pathname,
      load_duration_ms: openedAtRef.current
        ? Date.now() - openedAtRef.current
        : null,
      custom_viewer: isCustomViewer || isOnsiteViewer,
    });
  }, [cleanName, href, isCustomViewer, isOnsiteViewer]);

  const markLoadError = useCallback(() => {
    posthog.capture("paper_load_failed", {
      paper_name: cleanName,
      paper_href: href,
      source_path: window.location.pathname,
      custom_viewer: isCustomViewer || isOnsiteViewer,
    });
  }, [cleanName, href, isCustomViewer, isOnsiteViewer]);

  useEffect(() => {
    if (!open || !isOnsiteViewer) return;
    function onPreviewMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "paper-preview-ready" && !loaded) markLoaded();
      if (event.data?.type === "paper-preview-error") markLoadError();
    }
    window.addEventListener("message", onPreviewMessage);
    return () => window.removeEventListener("message", onPreviewMessage);
  }, [open, isOnsiteViewer, loaded, markLoaded, markLoadError]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || !citationPageMarker) return;
    const start = window.setTimeout(() => setFramePulse(true), 0);
    const t = window.setTimeout(() => setFramePulse(false), 3200);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(t);
    };
  }, [open, citationPageMarker]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || !loaded || !isCustomViewer) return;
    const targetPage = viewerPage;
    const targetQuery = citationPageMarker ? "" : viewerSearch?.trim();
    if (!targetPage && !targetQuery) return;

    let attempts = 0;
    const maxAttempts = 40;
    const timer = window.setInterval(() => {
      attempts += 1;
      let app: EmbeddedPdfApp | undefined;
      try {
        const frameWindow = iframeRef.current?.contentWindow as
          (Window & { PDFViewerApplication?: EmbeddedPdfApp }) | undefined;
        app = frameWindow?.PDFViewerApplication;
      } catch {
        if (attempts >= maxAttempts) window.clearInterval(timer);
        return;
      }
      if (!app?.initialized) {
        if (attempts >= maxAttempts) window.clearInterval(timer);
        return;
      }

      if (targetPage) {
        if (typeof app.page === "number") {
          app.page = targetPage;
        } else if (app.pdfViewer) {
          app.pdfViewer.currentPageNumber = targetPage;
        }
      }

      if (citationPageMarker) {
        resetEmbeddedPdfFindBar(app);
      } else if (targetQuery && app.findBar) {
        app.findBar.open?.();
        if (app.findBar.findField) {
          app.findBar.findField.value = targetQuery;
        }
        if (app.findBar.highlightAll) {
          app.findBar.highlightAll.checked = true;
        }
        if (app.findBar.caseSensitive) {
          app.findBar.caseSensitive.checked = false;
        }
        app.findBar.dispatchEvent("");
      } else {
        resetEmbeddedPdfFindBar(app);
      }

      window.clearInterval(timer);
    }, 180);

    return () => window.clearInterval(timer);
  }, [
    open,
    loaded,
    isCustomViewer,
    viewerPage,
    viewerSearch,
    citationPageMarker,
  ]);

  /** Citation opens: PDF.js may still open / retain find UI — clear it a few times after load. */
  useEffect(() => {
    if (!open || !loaded || !isCustomViewer || !citationPageMarker) return;

    const delays = [0, 100, 250, 500, 1000, 2000];
    const timers = delays.map((ms) =>
      window.setTimeout(() => {
        try {
          const w = iframeRef.current?.contentWindow as
            (Window & { PDFViewerApplication?: EmbeddedPdfApp }) | undefined;
          resetEmbeddedPdfFindBar(w?.PDFViewerApplication);
        } catch {
          /* cross-origin iframe (e.g. misconfigured framing headers) */
        }
      }, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [open, loaded, isCustomViewer, citationPageMarker]);

  const viewer = open ? (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col bg-background",
        closing ? "animate-pdf-out" : "animate-pdf-in",
      )}
    >
      {/* ── Chrome bar ── */}
      <div className="flex h-11 shrink-0 items-center border-b border-border/60 bg-background px-2 gap-1">
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground active:opacity-60"
        >
          <X className="size-4" />
        </button>

        {/* Divider */}
        <div className="mx-1 h-4 w-px shrink-0 bg-border/60" />

        {/* Paper name */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-[13px] font-medium leading-none text-foreground">
            {cleanName}
          </span>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 pl-2">
          {REPEAT_VISIBLE && showPracticeLink && <a
            href={repeatHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            aria-label="Practice this paper in Repeat 2.0"
          >
            <RotateCcw className="size-3.5" />
            <span>Repeat 2.0</span>
          </a>}
          {editableId ? (
            <a
              href={"/editable/" + editableId}
              onClick={() => capturePaperAction("editable_copy", "desktop")}
              className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground active:opacity-60 sm:flex"
            >
              <Edit3 className="size-3.5" />
              Editable copy
            </a>
          ) : null}
          <a
            href={saveHref}
            download={`${cleanName}.pdf`}
            onClick={() => capturePaperAction("download", "desktop")}
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground active:opacity-60 sm:flex"
          >
            <Download className="size-3.5" />
            Download
          </a>
          <a
            href={openHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => capturePaperAction("new_tab", "desktop")}
            aria-label="Open in new tab"
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground active:opacity-60"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>

      {/* ── PDF area ── */}
      <div
        className={cn(
          "relative min-h-0 flex-1 bg-[#404040] transition-shadow duration-500",
          framePulse &&
            "shadow-[inset_0_0_0_2px_rgba(251,191,36,0.45),0_0_24px_rgba(251,191,36,0.12)]",
        )}
      >
        {contextTitle || contextBody || contextMeta ? (
          <div
            className="absolute left-3 top-3 z-10 flex max-w-[min(18rem,calc(100%-15rem))] flex-col gap-1.5 rounded-xl border border-amber-500/35 bg-black/50 px-2.5 py-2 shadow-lg backdrop-blur-md"
            title={
              contextTitleDetail?.trim() ||
              [contextTitle, contextMeta, contextBody]
                .filter(Boolean)
                .join("\n\n") ||
              undefined
            }
          >
            <div className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                aria-hidden
              />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/95">
                {citationPageMarker ? "Page marker" : "Highlighted in PDF"}
              </span>
            </div>
            {citationPageMarker && viewerPage ? (
              <p className="text-[11px] font-semibold leading-tight text-white">
                Opened to page {viewerPage}
              </p>
            ) : null}
            {citationPageMarker ? (
              <p className="text-[10px] leading-snug text-white/55">
                No in-PDF search — scan this page. Exam PDFs often differ
                slightly from the index text.
              </p>
            ) : null}
            {contextTitle ? (
              <p className="line-clamp-2 text-[12px] font-medium leading-snug text-white/92">
                {contextTitle}
              </p>
            ) : null}
            {contextMeta ? (
              <p className="line-clamp-1 text-[10px] leading-tight text-white/55">
                {contextMeta}
              </p>
            ) : null}
            {contextBody ? (
              <details className="group border-t border-white/10 pt-1.5 mt-0.5">
                <summary className="cursor-pointer list-none text-[10px] text-white/45 transition-colors hover:text-white/70 [&::-webkit-details-marker]:hidden">
                  <span className="underline decoration-white/25 underline-offset-2">
                    Index excerpt
                  </span>
                </summary>
                <p className="mt-1.5 max-h-28 overflow-y-auto text-[11px] leading-relaxed text-white/70">
                  {contextBody}
                </p>
              </details>
            ) : null}
          </div>
        ) : null}
        {!loaded && !isOnsiteViewer && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={iframeSrc}
          src={iframeSrc}
          className={cn(
            "h-full w-full border-0 transition-opacity duration-300",
            loaded || isOnsiteViewer ? "opacity-100" : "opacity-0",
          )}
          onLoad={isOnsiteViewer ? undefined : markLoaded}
          onError={markLoadError}
          title={cleanName}
        />
      </div>

      {/* ── Mobile bottom bar ── */}
      <div className="flex shrink-0 gap-2 border-t border-border/60 bg-background px-3 py-2.5 sm:hidden">
        {editableId ? (
          <a
            href={"/editable/" + editableId}
            onClick={() => capturePaperAction("editable_copy", "mobile")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 py-2 text-[13px] font-medium text-foreground transition-colors duration-100 hover:bg-muted active:opacity-70"
          >
            <Edit3 className="size-3.5" />
            Edit
          </a>
        ) : null}
        <a
          href={saveHref}
          download={`${cleanName}.pdf`}
          onClick={() => capturePaperAction("download", "mobile")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 py-2 text-[13px] font-medium text-foreground transition-colors duration-100 hover:bg-muted active:opacity-70"
        >
          <Download className="size-3.5" />
          Download
        </a>
        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => capturePaperAction("new_tab", "mobile")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-muted hover:text-foreground active:opacity-70"
        >
          <ExternalLink className="size-3.5" />
          New tab
        </a>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openViewer}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openViewer(e)}
        className="cursor-pointer"
      >
        {children}
      </div>
      {mounted && createPortal(viewer, document.body)}
    </>
  );
}
