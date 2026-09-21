import { notFound, redirect } from "next/navigation";
import { midsemPapers } from "@/lib/midsem";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!midsemPapers.some((p) => p.id === id)) notFound();
  redirect(`/midsem#${encodeURIComponent(id)}`);
}
