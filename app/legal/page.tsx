import Link from "next/link";

export default function LegalPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Legal and Takedown
        </h1>
        <Link
          href="/"
          className="rounded-md border border-border/60 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Back
        </Link>
      </div>

      <div className="space-y-8 text-sm leading-6 text-muted-foreground">
        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">1) No affiliation</h2>
          <p>
            This is an unofficial, student-run educational archive. It is independent
            and is not affiliated with, endorsed by, sponsored by, or operated by
            MAHE, MIT Bengaluru, or any university authority.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">2) Purpose and fair use intent</h2>
          <p>
            Materials are listed for non-commercial academic revision and study support.
            This platform does not claim ownership over institutional papers, logos, or
            names, and uses institution names only for factual identification.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">3) Rights-holder notice</h2>
          <p>
            If you are a rights holder and believe any content infringes copyright,
            trademark, or other rights, send a takedown request with:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>your name and contact information,</li>
            <li>proof of authority or ownership,</li>
            <li>the exact URL(s) and material identified,</li>
            <li>a short statement describing the legal basis of the complaint.</li>
          </ul>
          <p>
            Valid requests are reviewed promptly, and disputed content may be removed
            while review is in progress.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">4) Contact for takedown</h2>
          <p>
            Email: <span className="text-foreground">replace-with-your-legal-email@example.com</span>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-medium text-foreground">5) No legal advice</h2>
          <p>
            This page is a policy notice and not legal advice. For legal interpretation
            or disputes, consult a licensed advocate in your jurisdiction.
          </p>
        </section>
      </div>
    </main>
  );
}
