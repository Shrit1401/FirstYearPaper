import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SlideReader } from "@/components/dsco/slide-reader";
import { DSCO, getModule } from "@/lib/dsco/syllabus";

export function generateStaticParams() {
  return DSCO.modules.map((m) => ({ module: String(m.number) }));
}

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const m = getModule(Number((await params).module));
  return { title: m ? `DSCO module ${m.number}: ${m.title}` : "DSCO" };
}

export default async function DscoModulePage({ params }: { params: Promise<{ module: string }> }) {
  const m = getModule(Number((await params).module));
  if (!m) notFound();
  return <SlideReader module={{ number: m.number, title: m.title }} lectures={m.lectures.map((l) => ({ id: l.id, title: l.title, slides: l.slides.length }))} />;
}
