# Second-year Semester 3 browsing

The Year 2 landing page prioritizes Semester 3. It presents CSE, EnC and ECE separately. CSE groups the historical CSE, CSS, IT and ICT course prefixes; EnC uses ECM; ECE uses ECE. Other codes, including mathematics, remain under Shared subjects until their branch relevance is confirmed. This is a browsing arrangement, not a claim that historical papers exactly match a student's current syllabus.

The grouping is applied through `lib/semester-three.ts` and `lib/papers.ts`, leaving the source manifest and original PDF URLs intact. The existing All Programs URLs still work. Search uses the new branch labels. Semester 4 and mixed-semester student scans remain reachable through Other second-year archives.

The generated midsem card is explicitly CSE Semester 3 and links to the ten free practice papers and worked answers. It appears before original exam papers. EnC and ECE do not show this card. There are no identified original Semester 3 midsem papers in the current source manifest; original regular and makeup papers retain their recorded exam types.

Source context for separate electronics programs: https://www.manipal.edu/mu/campuses/mahe-bengaluru/academics/institution-list/mit-blr/department-faculty/department-list/electronics-communication-engineering.html

Validation: 39 tests pass, including exact preservation of all 161 Semester 3 archive entries across the new groups. Counts: CSE 74, EnC 20, ECE 43, shared 24. Local route checks cover every new branch, legacy All Programs, Semester 4, Year 1 and the generated paper collection. Production build, TypeScript and lint passed. Interactive visual QA was unavailable because no browser was connected.

Published to paper.shrit.in on 17 September 2026 as deployment dpl_7LKftTk18HqKfWuCnas4c15LEezx. Public Year 2, CSE, EnC, ECE and Shared subjects routes all returned 200 without authentication.
