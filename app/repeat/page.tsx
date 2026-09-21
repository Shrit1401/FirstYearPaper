import { midsemPapers, getMidsemPaper } from "@/lib/midsem";
import Practice from "./practice-client";
import "katex/dist/katex.min.css";
import "./repeat-v2.css";
export const metadata = {
  title: "Repeat 2.0 | Midsem practice",
  description:
    "Practice, check your steps, and return to what needs work. Free papers and solutions; one-time ₹29 midsem practice.",
};
export default function Page() {
  return <Practice papers={midsemPapers.map((p) => getMidsemPaper(p.id)!)} />;
}
