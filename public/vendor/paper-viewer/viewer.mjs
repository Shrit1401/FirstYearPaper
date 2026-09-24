import { getDocument, GlobalWorkerOptions } from "../pdfjs/5.6.205/pdf.min.mjs";

const assetBase = new URL("../pdfjs/5.6.205/", import.meta.url).href;
GlobalWorkerOptions.workerSrc = `${assetBase}pdf.worker.min.mjs`;
const element = id => document.getElementById(id);
const canvas = element("canvas");
const container = element("paper");
const input = element("page");
const status = element("status");
let documentPdf, currentPage = 1, zoom = 1, generation = 0, rendering;
const controls = ["previous", "next", "page", "smaller", "fit", "larger"].map(element);

function report(type) {
  if (window.parent !== window) window.parent.postMessage({ type }, window.location.origin);
}
function showError(error) {
  console.error("Paper preview failed", error);
  status.textContent = "This paper could not be displayed. Try reopening it, or use Download above.";
  report("paper-preview-error");
}
async function renderPage() {
  if (!documentPdf) return;
  const run = ++generation;
  rendering?.cancel();
  input.value = currentPage;
  element("previous").disabled = currentPage <= 1;
  element("next").disabled = currentPage >= documentPdf.numPages;
  status.textContent = "Loading page…";
  try {
    const page = await documentPdf.getPage(currentPage);
    if (run !== generation) return;
    const natural = page.getViewport({ scale: 1 });
    const padding = window.innerWidth <= 420 ? 16 : 32;
    const width = Math.max(200, container.clientWidth - padding);
    const viewport = page.getViewport({ scale: Math.min(width / natural.width, 2) * zoom });
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * density);
    canvas.height = Math.floor(viewport.height * density);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.setAttribute("aria-label", `Paper page ${currentPage} of ${documentPdf.numPages}`);
    rendering = page.render({ canvasContext: canvas.getContext("2d"), viewport,
      transform: density === 1 ? null : [density, 0, 0, density, 0, 0] });
    await rendering.promise;
    if (run === generation) { status.textContent = ""; report("paper-preview-ready"); }
  } catch (error) {
    if (run === generation && error.name !== "RenderingCancelledException") showError(error);
  }
}
function turnPage(number) {
  if (!documentPdf) return;
  currentPage = Math.min(documentPdf.numPages, Math.max(1, Math.round(number) || 1));
  container.scrollTop = 0;
  renderPage();
}
element("previous").onclick = () => turnPage(currentPage - 1);
element("next").onclick = () => turnPage(currentPage + 1);
input.onchange = () => turnPage(Number(input.value));
element("smaller").onclick = () => { zoom = Math.max(.5, zoom - .25); renderPage(); };
element("larger").onclick = () => { zoom = Math.min(3, zoom + .25); renderPage(); };
element("fit").onclick = () => { zoom = 1; renderPage(); };
let resizeTimer;
window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderPage, 150); });
window.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement) return;
  if (event.key === "ArrowLeft") turnPage(currentPage - 1);
  if (event.key === "ArrowRight") turnPage(currentPage + 1);
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
  element("count").textContent = `of ${documentPdf.numPages}`;
  input.max = documentPdf.numPages;
  controls.forEach(control => { control.disabled = false; });
  turnPage(Number(params.get("page")) || 1);
} catch (error) { showError(error); }
