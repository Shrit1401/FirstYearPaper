"use client";

import Image from "next/image";
import { TESTIMONIALS } from "@/lib/testimonial";
import { cn } from "@/lib/utils";

function TestimonialCard({
  quote,
  author,
  badge,
  image,
  imageAlt,
}: {
  quote?: string;
  author: string;
  badge?: string;
  image?: string;
  imageAlt?: string;
}) {
  if (image) {
    return (
      <figure className="mb-3 break-inside-avoid">
        <div className="overflow-hidden rounded-xl border border-border/40">
          <Image
            src={image}
            alt={imageAlt ?? `Message from ${author}`}
            width={390}
            height={844}
            className="block h-auto w-full"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
          />
        </div>
        <figcaption className="mt-2 px-0.5 text-[12px] text-muted-foreground/55">
          {author} · whatsapp
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="mb-3 break-inside-avoid rounded-xl border border-border/40 bg-card/35 px-4 py-3.5">
      <blockquote className="text-[13px] leading-[1.6] text-foreground/82">
        {quote}
      </blockquote>
      <figcaption className="mt-3 text-[12px] text-muted-foreground/55">
        {author}
        {badge ? ` · ${badge}` : null}
      </figcaption>
    </figure>
  );
}

export function TestimonialMarquee({ className }: { className?: string }) {
  return (
    <section className={cn("hero-streams mb-10 mt-2", className)} aria-label="Student testimonials">
      <div className="mb-4 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
          What students say
        </p>
      </div>

      <div className="testimonial-grid columns-1 gap-3 sm:columns-2 lg:columns-3">
        {TESTIMONIALS.map((testimonial) => (
          <TestimonialCard
            key={testimonial.author}
            quote={testimonial.quote}
            author={testimonial.author}
            badge={testimonial.badge}
            image={testimonial.image}
            imageAlt={testimonial.imageAlt}
          />
        ))}
      </div>
    </section>
  );
}
