import syllabus from "./syllabus.json";

// Built by scripts/dsco/build-decks.py from the lecture decks: module → lecture → slide text.
export type Slide = { n: number; text: string };
export type Lecture = { id: string; title: string; source: string; slides: Slide[] };
export type Module = { number: number; title: string; lectures: Lecture[] };

export const DSCO = syllabus as { subject: string; name: string; modules: Module[] };

export function getModule(n: number): Module | undefined {
  return DSCO.modules.find((m) => m.number === n);
}

/** Light module summaries for the picker (no slide text shipped to the client). */
export function moduleCards() {
  return DSCO.modules.map((m) => ({
    number: m.number,
    title: m.title,
    lectures: m.lectures.map((l) => ({ id: l.id, title: l.title, slides: l.slides.length })),
  }));
}
