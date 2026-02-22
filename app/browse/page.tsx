import { getStreams, getFlattenedPapers } from "@/lib/papers";
import { BrowseClient } from "./browse-client";

export default function BrowsePage() {
  const streams = getStreams();
  const papers = getFlattenedPapers();
  return <BrowseClient streams={streams} papers={papers} />;
}
