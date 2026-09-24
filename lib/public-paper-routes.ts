import {
  getYears, getSemesters, getBranches, getExamTypes, getSubjectsList,
  getStreams, getStreamTree,
} from "./papers";

/** Every public archive level, including the older stream URLs. */
export function getPublicBrowsePaths(): string[][] {
  const paths = new Map<string, string[]>();
  const add = (path: string[]) => paths.set(JSON.stringify(path), path);
  for (const year of getYears()) {
    add([year]);
    const semesters = getSemesters(year);
    for (const semester of semesters) {
      const base = semesters.length === 1 ? [year] : [year, semester];
      add(base);
      for (const branch of getBranches(year, semester)) {
        add([...base, branch]);
        for (const exam of getExamTypes(year, semester, branch)) {
          add([...base, branch, exam]);
          for (const subject of getSubjectsList(year, semester, branch, exam)) {
            add([...base, branch, exam, subject.name]);
          }
        }
      }
    }
  }
  for (const stream of getStreams()) {
    add([stream]);
    for (const subject of getStreamTree(stream)?.subjects ?? []) {
      add([stream, ...subject.path.split("/")]);
    }
  }
  return [...paths.values()];
}
