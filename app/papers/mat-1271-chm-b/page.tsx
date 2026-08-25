import type { Metadata } from "next";
import { MathPaperEditor } from "./paper-editor";

export const metadata: Metadata = {
  title: "MAT 1271-CHM-B Editable Question Paper",
  description:
    "An editable, LaTeX-rendered transcription of the July 2023 Engineering Mathematics II question paper.",
};

export default function Mat1271PaperPage() {
  return <MathPaperEditor />;
}
