# EPIC 04 · AI & Product Integration

Scope: [DX-024](https://github.com/IOANN-K/DniproXP/issues/24), [DX-025](https://github.com/IOANN-K/DniproXP/issues/25), [DX-026](https://github.com/IOANN-K/DniproXP/issues/26), [DX-027](https://github.com/IOANN-K/DniproXP/issues/27), [DX-028](https://github.com/IOANN-K/DniproXP/issues/28).

## Implemented in frontend

| Issue  | Delivery                                                                                                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DX-024 | Typed `QuestGenerationProvider`, deterministic local templates for all six categories, Zod input/output validation, cancellable async generation; no external model, network request or secret.                                                  |
| DX-025 | Organizer-only `/organizer/quests/generate`: idea → editable content → preview → explicit acknowledgement → own organization's draft. Existing editor handles complete scheduling/location and publication.                                      |
| DX-026 | Wizard in organizer navigation and ordinary create form; `/demo` in shared desktop/mobile navigation; role-aware entry links; active states, focus, responsive layout and menu closure.                                                          |
| DX-027 | Eight-step guide tied to real repository state: application → approval → report → confirmation → progress → group result → private receipt → reward. New run preserves history; guarded full reset backs up before replacing state and logs out. |
| DX-028 | Runtime-validated proposed generation request/response/error contracts and [backend handoff](backend-integration-handoff.md). NestJS endpoints are **not** implemented by this frontend work.                                                    |

### Generator boundaries

- Input: goal 20–1000 characters, one of six categories, district 3–80 characters, capacity integer 1–500, planned duration 0.5–12 hours.
- Rule-based content proposes instructions, a local illustrative photo and editable 150 XP / 75 points. These are **not awards**. Safety and feasibility still require human review.
- Dates, time, exact address and verified location remain blank. No invented partners, coordinates or confirmed results. Organizer text is rendered as text, never executed as HTML or instructions to the application.
- Session-only work is namespaced by account. Reload restores valid content in the same tab; malformed/blocked storage safely falls back to memory. This is not encrypted storage or a durable backup: do not enter sensitive data on a shared browser.
- Saving calls the existing organizer API/repository with the current role/ownership checks. The pending save rejects if the account changes. Double submission is locked within the wizard; production idempotency remains a backend requirement.
- A generated draft is not a published quest. Scheduling, organization approval, publication validation and administrator moderation remain separate. Generating/saving never creates impact records or XP transactions.

## Demo walkthrough

1. Open `/demo`; optionally use the wizard for a **separate draft**. The pre-approved fixture below is for demonstration, not a publication bypass for user quests.
2. Open step 1 as volunteer, submit an application.
3. Step 2 switches to the fixture owner, approve the application.
4. Step 3 switches back; submit a substantive report and actual hours. No XP yet.
5. Step 4: organizer reviews and confirms once. XP, points, actual hours, completion, activity and personal impact share one repository commit.
6. Check dashboard. Organizer may separately publish measured team results once per quest; empty measurements are unknown, not zero.
7. Open receipt; name is opt-in, private report/contact data are not exported. Download PNG.
8. Open reward details, request exchange, explicitly confirm. Only bonus points are spent, never accumulated XP.

Progress means **ready data**, not proof someone opened a screen or downloaded a PNG. Rejected/cancelled applications do not count as successful steps. Receipt readiness is linked to the canonical completion event, not an unrelated transaction.

### Replay vs full reset

- **New demo quest**: preserves all prior history, uses a new identity, grants nothing immediately.
- **Full local reset**: demo admin only, modal explains losses, exact `СКИНУТИ` required. First saves the exact current v5 snapshot to `dniproxp:platform:v5:before-reset:<revision>`. If backup or snapshot persistence fails, aborts without changing the in-memory state/session. Restore seed without re-awarding legacy XP. Logs out and clears wizard drafts / seen-XP namespace, not unrelated applications or old backups.
- Browser backups are inspectable JSON snapshots, not a secure archive. There is no automatic restore UI or production reset endpoint.

## Verification

Run from repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter web test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/local/bin/chromium pnpm --filter web test:e2e
pnpm --filter web build
```

Browser tests cover draft editing/restoration/single save, cancellation, validation, account isolation, discard confirmation, route guards/mobile navigation, safe reset and real application → approval → report → confirmation → reward UI. Existing City Impact tests remain in the suite. [Screenshots](screenshots/product-integration/README.md) are actual local renders, not mockups.

## Integration status / limitations

Work is on `Sergiy`, based on `26a5b7e` (City Impact). `main` now contains EPIC 02 (`fa629e2`) and EPIC 03 (`593fd5b6ce98dde93b304279347880796cfc1e56`); that work is **not integrated into this branch**. No merge/rebase/force push was performed. Shared router, repository and entity changes must be reconciled by the team before merging. Cross-epic compatibility is not asserted: those commits have not been combined or tested with this branch.

The app still uses one local v5 repository. Authentication and role switching are demo-only, not production authorization. External AI, NestJS domain endpoints, server sessions, database migrations, uploads and production idempotency are future work; see handoff. Existing repository-wide lint debt and the production bundle warning must not be presented as new-feature test failures or hidden by disabling rules.

## Recorded local results

- Frozen-lockfile install: passed; no lockfile changes required.
- Vitest: **61/61**, four files (30 new EPIC04 checks plus 31 existing City Impact checks).
- Playwright/Chromium: **11/11** (five new EPIC04 flows plus six existing City Impact flows).
- TypeScript + production Vite build: passed; existing large-chunk warning remains (main JS about 988 kB uncompressed).
- Targeted ESLint on new feature code/tests, scenario and organizer adapter: passed.
- Full web ESLint: **6 errors, 3 warnings**, same baseline count as before EPIC04. Existing hooks/refresh issues remain in shared layout/router/gamification/participation/button files, plus map/form warnings. No rules disabled.
- 13 actual desktop/mobile screenshots checked individually; wizard, edit, preview, validation, demo, reset dialog and mobile menu.

These are local mock-branch checks, not a staging/backend or combined EPIC02/03 integration result.
