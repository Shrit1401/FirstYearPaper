# PostHog tracking

Project: [575638, US Cloud](https://us.posthog.com/project/575638).

The site uses the existing `posthog-js` SDK, initialized once in `instrumentation-client.ts`. Do not add the HTML snippet as a second installation.

## Deployment

Set both public values in the hosting provider's **Production** environment before building:

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`: the project's public, write-only token.
- `NEXT_PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`.

These values are compiled into the browser bundle. Changing them requires a new deployment. Production was missing both settings before the 23 September 2026 fix. Local `.env` settings do not automatically populate Vercel.

Development analytics are off by default. Set `NEXT_PUBLIC_ENABLE_ANALYTICS=true` to explicitly test locally. A personal PostHog API key is not needed for browser event capture.

## Coverage

| Area | Events / data |
| --- | --- |
| Site traffic | SDK page views and page leaves, including client-side navigation |
| Navigation | `route_viewed`, `navigation_clicked`, `ui_control_clicked` |
| Engagement | Scroll milestones and `page_engagement_completed` on route exit or page close |
| Browse search | `paper_search_performed`, `paper_search_cleared`, `paper_search_result_opened`, `paper_year_selected` |
| Midsems | `midsem_collection_viewed`, `midsem_branch_selected`, debounced search events, `midsem_file_opened` with course, branch, period and document type |
| PDF viewer | `paper_opened`, `paper_loaded`, `paper_load_failed`, `paper_closed`, download and new-tab actions |
| Accounts | Signups, sign-ins, auth errors, onboarding, profile changes and logout; authenticated users identified by their account ID |
| Editors | Maths and editable-paper PDF exports |
| Existing Repeat flows | Checkout start/failure and payment confirmation; Repeat's public entry points remain hidden |
| Diagnostics | Browser errors, heatmaps, web vitals, network timing and session replay |

Session replay masks input values and does not record network request/response bodies or headers. Existing account identity and explicit search analytics are separate from replay masking. Standard and custom events are distinct: use `$pageview` for traffic, and named events for product actions.

Browsers render PDF contents in their own viewer, so events measure the surrounding paper viewer and its controls, not activity inside the PDF document. A download event records the click, not proof that the file finished saving.

SDK configuration follows the [PostHog Next.js integration](https://posthog.com/docs/libraries/next-js) and [JavaScript configuration reference](https://posthog.com/docs/libraries/js/config).
