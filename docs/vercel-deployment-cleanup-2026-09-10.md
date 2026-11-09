# Vercel deployment cleanup

Completed on September 10, 2026 after the user approved the exact 26-deployment list. Vercel confirmed all 26 removals. A fresh complete inventory contains exactly the four retained deployments below. The live production target and all five aliases are unchanged. `https://paper.shrit.in/` still returns HTTP 200; the protected preview still redirects to Vercel login as it did before cleanup.

The execution and verification record is `generated/vercel-deployment-cleanup-execution-2026-09-10.json`. No measured reclaimed-byte total is available yet; historical dashboard usage is not retroactively erased.

Audited 2026-09-10T03:50:10.930870+00:00. Project `first-year-paper` (`prj_lZVsD5Ngmd4rxPnBSVvMkIWfrTpr`), scope `shrit1401s-projects`.

During the initial read-only audit, all 30 retained deployments were enumerated using the authenticated GET deployment list endpoint with limit 100 and pagination checked to completion (`next: null`). There were 23 READY and 7 ERROR deployments. No remote changes were made before approval.

Approved and completed cleanup: kept 4 deployments and deleted 26. The removed deployments comprise 7 ERROR deployments, 17 older READY production deployments, and 2 older READY previews.

## Keep

| Deployment ID | Created (UTC) | State / target | Reason |
| --- | --- | --- | --- |
| `dpl_53EZ9RPXEHNtTMmscpUUvsmZKCSE` | 2026-08-25 06:08:22 | READY / production | Current live production deployment |
| `dpl_3JJwBgSjykNpNYFUaBD132F4GWdF` | 2026-05-27 17:02:21 | READY / production | Latest successful production predecessor, API rollback candidate |
| `dpl_BrSHQJD1xmVr8ew6ao11wUjenuys` | 2026-05-27 16:58:11 | READY / production | Second successful production predecessor retained as additional release history; API does not flag it as an instant rollback candidate |
| `dpl_FkuheFJvRviAARmkpSFhL7WrvVTV` | 2026-04-13 21:25:54 | READY / preview | Active branch alias or custom alias target; Latest preview for branch v2 |

## Current active aliases

These are current alias ownership records, rather than the historical alias arrays attached to older deployments. Every target is in the keep list.

| Alias | Current deployment ID |
| --- | --- |
| first-year-paper-git-v2-shrit1401s-projects.vercel.app | `dpl_FkuheFJvRviAARmkpSFhL7WrvVTV` |
| paper.shrit.in | `dpl_53EZ9RPXEHNtTMmscpUUvsmZKCSE` |
| first-year-paper.vercel.app | `dpl_53EZ9RPXEHNtTMmscpUUvsmZKCSE` |
| first-year-paper-shrit1401s-projects.vercel.app | `dpl_53EZ9RPXEHNtTMmscpUUvsmZKCSE` |
| first-year-paper-git-main-shrit1401s-projects.vercel.app | `dpl_53EZ9RPXEHNtTMmscpUUvsmZKCSE` |

The latest preview on the only non-production branch in the inventory, `v2`, is retained conservatively regardless of whether that Git branch is still open. The live commit is `a9fbe11446d51bb5824e08e2bb8e09cb71cd2f09`, created August 25, 2026. This deployment predates the local Repeat 2.0 work.

## Removed deployments

These exact deployments were removed. The production target and complete alias list were rechecked immediately before deletion, and none of these deployments owned an active alias. Vercel's safe removal option additionally protected aliased deployments.

| Deployment ID | Created (UTC) | State / target | Branch |
| --- | --- | --- | --- |
| `dpl_A2dha4ArPugchdhUF4DqcmX1Pcuf` | 2026-08-25 06:03:05 | ERROR / production | main |
| `dpl_GiSyUyZRqgfmgEH512XZaGTU1oXy` | 2026-08-25 06:01:23 | ERROR / production | main |
| `dpl_HZvwwkmDqtVPAebrvQ4kvr7iQRh1` | 2026-08-25 05:56:10 | ERROR / production | main |
| `dpl_6J7F7yKNPZk76dLa5XkdkkcuTLMG` | 2026-08-25 05:52:15 | ERROR / production | main |
| `dpl_H2SfVeeAR2i2uPdpRY9vNkB6cSTY` | 2026-05-27 16:57:30 | ERROR / production | main |
| `dpl_Dzjk5dZ3hEPK61nYc4kDzsr85vGU` | 2026-05-27 08:53:04 | ERROR / production | main |
| `dpl_D91h4gD5vKgTe8dqMpHxwuBsJ4rM` | 2026-05-27 08:52:00 | ERROR / production | main |
| `dpl_7itVEPKz3rQADh1ozoN1Sehii6qa` | 2026-05-25 18:17:24 | READY / production | main |
| `dpl_tNpzySK9StY7JjJEFf1TwgebACkf` | 2026-05-25 17:45:59 | READY / production | main |
| `dpl_BgELVVs88UCmsikMhSn1zHsf7fiU` | 2026-05-23 07:00:18 | READY / production | main |
| `dpl_4oZqyvX3635RzBWYwTacoLL2yGR3` | 2026-05-23 06:57:43 | READY / production | main |
| `dpl_G2ns1qavA9dNezskGpbKy418GZDx` | 2026-05-21 19:05:32 | READY / production | main |
| `dpl_8fQZ6odHig5qv68zPDeo6kcAB1ud` | 2026-05-21 18:45:21 | READY / production | main |
| `dpl_7S6EMs6gtGCvQucWKLYHDpEy5Bx8` | 2026-05-13 01:10:19 | READY / production | main |
| `dpl_9sgKAZGUaM7TjJBfbW4ChGa7Js9f` | 2026-05-13 00:59:42 | READY / production | main |
| `dpl_FW6jqUeUP9rTZmGyyBNWkPmEWKRL` | 2026-04-26 18:24:45 | READY / production | main |
| `dpl_7PjpWinTh8m7UtzLfZhVhmeeNW3E` | 2026-04-24 07:22:18 | READY / production | main |
| `dpl_G4KXmmWyrQs9TcsMeSuRsw1ftE9H` | 2026-04-24 07:09:28 | READY / production | main |
| `dpl_AHKs6tzRqu8d88427hwV6F8et96v` | 2026-04-19 19:11:36 | READY / production | main |
| `dpl_AVAwSPf5cg1KpbX6Z2qBYEVmAGND` | 2026-04-16 11:15:32 | READY / production | main |
| `dpl_6j8ZC4cM2QdDsDPxdhmA94G5Jvg5` | 2026-04-14 07:05:45 | READY / production | main |
| `dpl_APBzzFKgEMzcE3dWhuLopCmrwpVr` | 2026-04-13 21:44:52 | READY / production | main |
| `dpl_DMkVLAFnbE5xQUN9ukkXAWY4XeEb` | 2026-04-13 21:42:06 | READY / production | main |
| `dpl_7JnwT9J5VCqMyisYGYkPJ1TbUa7i` | 2026-04-13 21:25:33 | READY / production | main |
| `dpl_HGvpmssqmnGYe6YiTrNge2PgCxug` | 2026-04-13 18:48:53 | READY / preview | v2 |
| `dpl_Dz1Xp6h8P8WtCUdY7yuqDee5Rhs4` | 2026-04-13 18:33:06 | READY / preview | v2 |

## Storage measurement and retention

No reclaimable GB figure is established by this audit. The deployment list and detail endpoints returned no retained output size, and the live Git deployment file-tree endpoint returned `404 File tree not found`. The 3.05 GB dashboard reading cannot be assigned precisely across these candidate deployments from those responses.

The project already uses 30-day retention for production, preview, canceled, and errored deployments, with `deploymentsToKeep: 10`. Current Vercel policy exceptions retain the latest 20 READY production deployments, the latest 20 READY non-production deployments, and the latest 10 deployments overall. This project has exactly 20 READY production deployments and 3 READY previews; all 7 errors are within the latest 10 overall. Those exceptions explain why shortening the retention period alone may not remove this inventory. [Vercel retention documentation](https://vercel.com/docs/deployment-retention).

Deployment Storage measures retained build/static output; Functions Storage measures retained function bundles. Billing uses GB-months and daily project maximums, so deleting a deployment does not erase already recorded usage. [Vercel Deployment Storage documentation](https://vercel.com/docs/deployment-storage).

Compare both storage metrics in team Usage after Vercel processes the cleanup. The sanitized original inventory and exact IDs are in `generated/vercel-deployment-cleanup-2026-09-10.json`; the separate execution record contains the completed action and verification results.

## Smaller future deployments

The local Repeat JPEG archive was optimized with lossless `jpegtran` on September 10. All 10,081 images retained identical decoded RGB pixels and dimensions. Only smaller results replaced originals: 10,034 replacements and 47 unchanged files, with zero mismatches or processing errors.

| Scan archive | Bytes |
| --- | ---: |
| Before | 867,452,203 |
| After | 791,897,463 |
| Saved | 75,554,740 (8.71%) |

Original bytes remain backed up under ignored `generated/repeat-v2/storage-backups/`. Image URLs, question data, original PDFs, and diagram associations are unchanged. The full verification report is `generated/repeat-v2/storage-report-20260910T035110.114499Z.json`. `npm run repeat:optimize` previews future savings; add `-- --apply` to apply verified smaller files.

`.vercelignore` now excludes local presentations, video, agent scratch files, OCR intermediates, and backups from CLI uploads while preserving app source and all public assets. These local changes have not been deployed and do not alter the storage already recorded in the Vercel dashboard.
