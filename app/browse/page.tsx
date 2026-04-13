import { getYears, getFlattenedPapers } from "@/lib/papers";
import { BrowseClient } from "./browse-client";

export default function BrowsePage() {
  const years = getYears();
  const papers = getFlattenedPapers();
  return <BrowseClient years={years} papers={papers} />;
}
