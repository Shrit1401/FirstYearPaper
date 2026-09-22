import fs from "node:fs";
import path from "node:path";
import index from "@/public/midsem/index.json";
export type MidsemQuestion = {
  id: string;
  number: string;
  title: string;
  type: "mcq" | "theory";
  marks: number;
  markdown: string;
  solution: string;
  hint: string;
  source: { paper: string; question: string } | null;
};
export type MidsemPaper = (typeof index.papers)[number] & {
  questions: MidsemQuestion[];
};
export const midsemPapers = index.papers.filter(paper => paper.set === "original");
export function getMidsemPaper(id: string): MidsemPaper | null {
  if (!midsemPapers.some((p) => p.id === id)) return null;
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "public/midsem/papers", id + ".json"),
      "utf8",
    ),
  );
}
