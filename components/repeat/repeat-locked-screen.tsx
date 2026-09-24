"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ImageIcon, RotateCcw, Sigma } from "lucide-react";
import { RepeatPassCard } from "@/components/repeat/repeat-pass-card";

const POINTS = [
  { icon: BookOpen, text: "Midsem papers, question by question" },
  { icon: Sigma, text: "Clean math and original figures, with the scan one tap away" },
  { icon: ImageIcon, text: "A teacher that solves from the original scan and shows its check" },
];

/** Full-page gate shown on /repeat until the account has the ₹29 pass. */
export function RepeatLockedScreen({ loading = false, next = "/repeat/library" }: { loading?: boolean; next?: string }) {
  return (
    <div className="repeat-app dark repeat-locked" aria-busy={loading}>
      <div className="repeat-locked-inner">
        <Link prefetch={false} href="/midsem" className="repeat-locked-back"><ArrowLeft size={13} /> Free papers + solutions</Link>
        <div className="repeat-brand repeat-locked-brand"><span className="repeat-brand-symbol"><RotateCcw size={22} strokeWidth={2.2} /></span><span className="repeat-brand-name">repeat<span className="repeat-version">2.0</span></span></div>
        <h1 className="repeat-locked-title">Your study space for MIT exams.</h1>
        <p className="repeat-locked-lead">The midsem pass costs ₹29 once. It unlocks midsem AI chat and the exam-practice interface. All papers and worked solution downloads remain free.</p>
        <ul className="repeat-locked-points">
          {POINTS.map(({ icon: Icon, text }, index) => (
            <li key={text} style={{ animationDelay: `${120 + index * 50}ms` }}><span className="repeat-locked-point-icon"><Icon size={14} /></span>{text}</li>
          ))}
        </ul>
        <div className="repeat-locked-card">{loading ? <div className="repeat-skeleton" style={{ height: 132, marginTop: 0 }} /> : <RepeatPassCard next={next} />}</div>
      </div>
    </div>
  );
}
