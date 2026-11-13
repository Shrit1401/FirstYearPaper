import { getDocument, GlobalWorkerOptions } from "../pdfjs/5.6.205/pdf.min.mjs";

const assetBase = new URL("../pdfjs/5.6.205/", import.meta.url).href;
GlobalWorkerOptions.workerSrc = `${assetBase}pdf.worker.min.mjs`;
const element = id => document.getElementById(id);
const container = element("paper");
const holder = element("pages");
const status = element("status");
const controls = ["smaller", "fit", "larger"].map(element);
let documentPdf, zoom = 1, layoutRun = 0, ready = false, currentFocus = null;
/** One entry per page: { box, natural, rendered, task } */
const pages = [];

function report(type) {
  if (window.parent !== window) window.parent.postMessage({ type }, window.location.origin);
}
function showError(error) {
  console.error("Paper preview failed", error);
  status.textContent = "This paper could not be displayed. Try reopening it, or use Download above.";
  report("paper-preview-error");
}
function scaleFor(natural) {
  const padding = window.innerWidth <= 420 ? 16 : 32;
  const width = Math.max(200, container.clientWidth - padding);
  return Math.min(width / natural.width, 2) * zoom;
}

// Pages are drawn only when they come near the screen, so long papers stay light.
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) drawPage(Number(entry.target.dataset.index));
}, { root: container, rootMargin: "800px 0px" });

async function drawPage(index) {
  const slot = pages[index];
  if (!slot || slot.rendered === layoutRun) return;
  const run = layoutRun;
  slot.rendered = run;
  slot.task?.cancel();
  try {
    const page = await documentPdf.getPage(index + 1);
    if (run !== layoutRun) return;
    const viewport = page.getViewport({ scale: scaleFor(slot.natural) });
    const density = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width * density);
    canvas.height = Math.floor(viewport.height * density);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", `Paper page ${index + 1} of ${pages.length}`);
    slot.task = page.render({ canvasContext: canvas.getContext("2d"), viewport,
      transform: density === 1 ? null : [density, 0, 0, density, 0, 0] });
    await slot.task.promise;
    if (run !== layoutRun) return;
    slot.box.replaceChildren(canvas, ...slot.marks);
    if (!ready) { ready = true; status.textContent = ""; report("paper-preview-ready"); }
  } catch (error) {
    if (error?.name === "RenderingCancelledException") return;
    if (slot.rendered === run) slot.rendered = -1;
    if (!ready) showError(error);
  }
}

function layout() {
  if (!documentPdf) return;
  // Keep the reader at the same spot in the paper when the size changes.
  const ratio = holder.scrollHeight ? container.scrollTop / holder.scrollHeight : 0;
  layoutRun++;
  for (const slot of pages) {
    slot.task?.cancel();
    const { width, height } = slot.natural;
    const scale = scaleFor(slot.natural);
    slot.box.style.width = `${width * scale}px`;
    slot.box.style.height = `${height * scale}px`;
    observer.unobserve(slot.box);
    observer.observe(slot.box);
  }
  // A highlighted question stays in view; otherwise keep the reading spot.
  if (currentFocus) scrollToFocus(false);
  else container.scrollTop = ratio * holder.scrollHeight;
}

element("smaller").onclick = () => { zoom = Math.max(.5, zoom - .25); layout(); };
element("larger").onclick = () => { zoom = Math.min(3, zoom + .25); layout(); };
element("fit").onclick = () => { zoom = 1; layout(); };
let resizeTimer, lastWidth = 0;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (container.clientWidth !== lastWidth) { lastWidth = container.clientWidth; layout(); }
    else if (currentFocus) scrollToFocus(false);
  }, 150);
});

try {
  const params = new URLSearchParams(window.location.search);
  if (!params.get("file")) throw new Error("No paper selected");
  const file = new URL(params.get("file"), window.location.origin);
  if (file.origin !== window.location.origin) throw new Error("Paper must use this site's archive");
  // One cacheable download per PDF, with no native browser PDF plugin or
  // repeated byte-range requests. The worker renders pages locally.
  documentPdf = await getDocument({ url: file.href, disableRange: true,
    isEvalSupported: false, cMapUrl: `${assetBase}cmaps/`, cMapPacked: true,
    standardFontDataUrl: `${assetBase}standard_fonts/`, wasmUrl: `${assetBase}wasm/` }).promise;
  const count = documentPdf.numPages;
  element("count").textContent = `${count} page${count === 1 ? "" : "s"}`;
  for (let i = 0; i < count; i++) {
    const page = await documentPdf.getPage(i + 1);
    const box = document.createElement("div");
    box.className = "page";
    box.dataset.index = String(i);
    holder.append(box);
    pages.push({ box, natural: page.getViewport({ scale: 1 }), rendered: -1, task: null, marks: [] });
  }
  lastWidth = container.clientWidth;
  layout();
  const start = Number(params.get("page"));
  if (params.get("focus")) focus(params.get("focus"), false);
  else if (start > 1 && start <= count) pages[start - 1].box.scrollIntoView();
  controls.forEach(control => { control.disabled = false; });
} catch (error) { showError(error); }

/**
 * Highlight a question: "page:x0,y0,x1,y1;page:..." in PDF points from the
 * page's top-left. The first area is scrolled into the middle of the view.
 */
function focus(spec, smooth = true) {
  currentFocus = spec;
  for (const slot of pages) { slot.marks.forEach(m => m.remove()); slot.marks = []; }
  const areas = String(spec).split(";").map(part => {
    const [page, rect] = part.split(":");
    const [x0, y0, x1, y1] = (rect || "").split(",").map(Number);
    return { index: Number(page) - 1, x0, y0, x1, y1 };
  }).filter(a => pages[a.index] && [a.x0, a.y0, a.x1, a.y1].every(Number.isFinite));
  for (const a of areas) {
    const slot = pages[a.index];
    const { width, height } = slot.natural;
    const mark = document.createElement("div");
    mark.className = "mark";
    Object.assign(mark.style, { left: `${(a.x0 / width) * 100}%`, top: `${(a.y0 / height) * 100}%`,
      width: `${((a.x1 - a.x0) / width) * 100}%`, height: `${((a.y1 - a.y0) / height) * 100}%` });
    slot.marks.push(mark);
    slot.box.append(mark);
  }
  scrollToFocus(smooth);
}

function scrollToFocus(smooth) {
  const first = String(currentFocus).split(";")[0].split(":");
  const slot = pages[Number(first[0]) - 1];
  const [, y0, , y1] = (first[1] || "").split(",").map(Number);
  if (!slot || !Number.isFinite(y0)) return;
  const area = { y0, y1 };
  const boxTop = slot.box.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  const markTop = boxTop + (area.y0 / slot.natural.height) * slot.box.offsetHeight;
  const markHeight = ((area.y1 - area.y0) / slot.natural.height) * slot.box.offsetHeight;
  const top = Math.max(0, markTop - Math.max(24, (container.clientHeight - markHeight) / 3));
  container.scrollTo({ top, behavior: smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
}

window.addEventListener("message", event => {
  if (event.origin !== window.location.origin || event.data?.type !== "paper-focus") return;
  if (pages.length) focus(event.data.focus);
});
