import { REPEAT_VISIBLE } from "@/lib/feature-visibility";
import { notFound, redirect } from "next/navigation";
import catalog from "@/public/midsem/second-year-index.json";
import { midsemPapers } from "@/lib/midsem";

export function generateStaticParams() {
  return [...catalog.papers, ...midsemPapers].map(({ id }) => ({ id }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = catalog.papers.find(p => p.id === id);
  if (paper) redirect(`/midsem?branch=${paper.branch}#${encodeURIComponent(id)}`);
  const practicePaper = midsemPapers.find(p => p.id === id);
  if (practicePaper) redirect(REPEAT_VISIBLE ? `/repeat/library?paper=${encodeURIComponent(id)}` : practicePaper.paperUrl);
  notFound();
}
