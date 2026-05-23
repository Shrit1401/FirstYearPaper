"use client";

import { Quote } from "lucide-react";
import { TESTIMONIALS } from "@/lib/testimonial";
import { cn } from "@/lib/utils";

function TestimonialCard({
  quote,
  author,
  badge,
}: {
  quote: string;
  author: string;
  badge?: string;
}) {
  return (
    <figure
      className={cn(
        "flex w-[min(20rem,75vw)] shrink-0 flex-col rounded-[1.25rem] border border-border/60 bg-card/62 p-4 shadow-sm backdrop-blur-sm",
      )}
    >
      <Quote className="size-3.5 text-muted-foreground/40" aria-hidden />
      <blockquote className="mt-2 flex-1 text-[13px] leading-6 text-muted-foreground">
        {quote}
      </blockquote>
      <figcaption className="mt-3 flex items-center gap-2">
        <span className="text-[13px] font-medium text-foreground">{author}</span>
        {badge ? (
          <span className="rounded-full border border-border/50 bg-background/55 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function TestimonialMarquee({ className }: { className?: string }) {
  const items = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <section className={cn("hero-streams mb-8", className)} aria-label="Student testimonials">
      <div className="mb-3 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
          What students say
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground/70">
          Real feedback from Repeat users at MIT Bengaluru
        </p>
      </div>

      <div className="testimonial-marquee relative overflow-hidden">
        <div className="testimonial-marquee-track flex w-max gap-3">
          {items.map((testimonial, i) => (
            <TestimonialCard
              key={`${testimonial.author}-${i}`}
              quote={testimonial.quote}
              author={testimonial.author}
              badge={testimonial.badge}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
