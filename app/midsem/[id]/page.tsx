import { notFound, redirect } from "next/navigation";
import catalog from "@/public/midsem/second-year-index.json";
import { midsemPapers } from "@/lib/midsem";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = catalog.papers.find(p => p.id === id);
  if (paper) redirect(`/midsem?branch=${paper.branch}#${encodeURIComponent(id)}`);
  if (midsemPapers.some(p => p.id === id)) redirect(`/repeat/library?paper=${encodeURIComponent(id)}`);
  notFound();
}
