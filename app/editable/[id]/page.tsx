import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditablePaperClient, type EditablePaperDocument } from "./paper-client";

type Props = { params: Promise<{ id: string }> };

// OCR documents are public files, changed only by a deployment. Generate less
// frequently visited copies on first use and reuse the cached page thereafter.
export function generateStaticParams() {
  return [];
}

function readPaper(id: string): EditablePaperDocument | null {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  const filePath = path.join(
    process.cwd(),
    "public",
    "ocr",
    "papers",
    id + ".json",
  );
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as EditablePaperDocument;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const paper = readPaper((await params).id);
  if (!paper) return { title: "Editable paper not found" };
  return {
    title: paper.name + " - Editable OCR copy",
    description:
      "Editable OCR transcription with LaTeX math preview and the original question paper.",
  };
}

export default async function EditablePaperPage({ params }: Props) {
  const paper = readPaper((await params).id);
  if (!paper) notFound();
  return <EditablePaperClient document={paper} />;
}
