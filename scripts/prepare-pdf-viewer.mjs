import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const source = path.join(process.cwd(), "node_modules/pdfjs-dist");
const { version } = JSON.parse(await readFile(path.join(source, "package.json"), "utf8"));
const viewer = await readFile("public/vendor/paper-viewer/viewer.mjs", "utf8");
if (!viewer.includes(`../pdfjs/${version}/pdf.min.mjs`)) {
  throw new Error("Update the paper viewer's PDF.js version when upgrading pdfjs-dist.");
}
const target = path.join(process.cwd(), "public/vendor/pdfjs", version);
await mkdir(target, { recursive: true });
for (const name of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
  await cp(path.join(source, "build", name), path.join(target, name));
}
for (const name of ["cmaps", "standard_fonts", "wasm", "LICENSE"]) {
  await cp(path.join(source, name), path.join(target, name), { recursive: true });
}
