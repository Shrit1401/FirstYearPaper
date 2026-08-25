import { getYears, getFlattenedPapers } from "@/lib/papers";
import { BrowseClient } from "./browse-client";
import { filterAvailablePapersByYear } from "@/lib/paper-availability";

export default function BrowsePage() {
  const years = getYears();
  const papers = filterAvailablePapersByYear(getFlattenedPapers());
  return <BrowseClient years={years} papers={papers} />;
}
