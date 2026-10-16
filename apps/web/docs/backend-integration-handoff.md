# DX-028 · Backend integration handoff

## Status and ownership

**Proposal, not live API.** Current `apps/api/src/app.controller.ts` exposes only `GET /` returning `Hello World!`. Frontend adapters use a single local repository; this change does not configure a model, authentication server, NestJS domain controller or PostgreSQL migration.

Retain [existing domain contracts](frontend-api-contracts.md); this document specifies a proposed `/v1` namespace and canonical nested error envelope. Coordinate the final naming with backend before wiring clients. TypeScript/Zod boundary for generation lives in `src/features/quest-generation/contracts.ts`; implementation entry point is `QuestGenerationProvider`, currently bound to `ruleBasedProvider`.

## Generation proxy contract

`POST /v1/quest-generations`, authenticated ORGANIZER. Server resolves organization from the session and checks access; do not trust role, owner, rewards, moderation or verification supplied by the client. Generation is not database publication.

Request (validated by `generationRequestSchema`):

```json
{
  "schemaVersion": 1,
  "input": {
    "goal": "Зібрати команду для сортування звичайних відходів",
    "categoryId": "eco",
    "district": "Соборний",
    "capacity": 12,
    "durationHours": 2
  }
}
```

Response `200`, `generationResponseSchema`:

```ts
type GenerationResponse = {
  schemaVersion: 1;
  provider: "rule-based" | "remote-ai";
  values: QuestFormValues;
  warnings: string[];
};
```

`QuestFormValues` is the complete draft DTO from `entities/types.ts`, validated by `questDraftSchema`: title, description, fullDescription, categoryId, district, address, date, time, capacity, difficulty, xp, rewardPoints, image, requirements, bring, instructions, durationHours, locationId. The current draft uses strings for multiline requirements/bring; map to arrays at the persistence boundary, not by silently changing frontend form types. Empty date/time/address/location are valid for a draft. Current photos are four allowlisted local illustrations; future uploads require a separate validated media resource, not arbitrary model URLs or data URI payloads.

- Backend validates model output with the same domain limits before returning it; invalid/truncated provider data → 503, never a partially published quest.
- Provider identity and warnings are set by server policy, not trusted model text. Preserve blank unknown facts. Never claim verified outcomes, fabricate partner identity or convert planned hours into confirmed impact.
- Treat organizer goal as untrusted quoted data. Model must not execute tools, fetch arbitrary URLs, publish, alter balances or read private volunteer reports. UI renders all fields as plain text.
- Keep model keys server-side (secret manager/environment), never `VITE_*`. No browser-to-model call. Separate provider timeout, size/cost budget, rate limit per account/org, and audit metadata (request id, provider/version, latency), without raw personal data in logs by default.
- The future remote implementation of `QuestGenerationProvider.generate` must accept AbortSignal. Suggested transport timeout: 15 s; cancel/unmount should stop updating UI. Timeout/cancellation can still incur provider cost; cancellation is not a guaranteed server rollback.
- No automatic retry for a generative POST after uncertain outcome. Offer explicit retry. Honor `Retry-After` for 429, sanitize error messages. Show an explicit local fallback choice on remote failure, never silently label a template as AI output. No remote adapter/fallback is enabled today.

## Errors

Canonical proposed envelope (`apiErrorSchema`):

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Перевір поля",
    "requestId": "req-123",
    "fields": { "input.goal": ["20–1000 символів"] }
  }
}
```

| HTTP | Code                 | Client behavior                                               |
| ---- | -------------------- | ------------------------------------------------------------- |
| 401  | UNAUTHENTICATED      | Reauthenticate; preserve unsaved work for the same account.   |
| 403  | FORBIDDEN            | No role/org access; do not retry automatically.               |
| 404  | NOT_FOUND            | Entity inaccessible/not found; do not leak private existence. |
| 409  | CONFLICT             | Refresh entity/revision; user reviews conflict.               |
| 422  | VALIDATION_FAILED    | Field messages + accessible summary.                          |
| 429  | RATE_LIMITED         | `retryAfterSeconds` + Retry-After, explicit retry.            |
| 503  | PROVIDER_UNAVAILABLE | Safe failure/local-template choice.                           |
| 500  | INTERNAL_ERROR       | Safe generic message and request id, never stack/key.         |

The older draft document's flat `{code,message,fieldErrors}` shape is superseded by this **proposal**; no current live client depends on either HTTP shape. Confirm one version in OpenAPI before building the adapter.

## Domain endpoint mapping (all proposed)

| Existing adapter/repository operation | Proposed server boundary                                                                  | Required server invariant                                                                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| authAdapter / authSession             | `/v1/auth/{login,logout,session,register}`                                                | HttpOnly Secure SameSite cookie or approved token strategy; CSRF for cookie writes; no public ADMIN registration. Demo switch not shipped.                          |
| organizerApi.save                     | POST `/v1/organizer/quests`, PATCH `/:id`                                                 | Owner from session, draft validation; idempotency key on create, expected revision/If-Match on edit. Return stored entity + revision.                               |
| transitionQuest / moderation          | POST `/:id/{publish,start,complete,cancel}`; `/v1/admin/quests/:id/moderation`            | Validate lifecycle, future date and organization; publication waits moderation; editing after participation blocked by current rules.                               |
| join / reviewApplication              | POST `/v1/quests/:id/participations`; `/v1/organizer/participations/:id/{approve,reject}` | Capacity reserved transactionally, unique participant/quest, ownership and valid transitions; rejection reason required.                                            |
| submitReport / rejectReport           | POST `/v1/participations/:id/report`; organizer `/:id/reject-report`                      | Own active participation; text limits, nullable actual hours, safe attachment refs; no reward on submission.                                                        |
| confirmDemo                           | POST `/v1/organizer/participations/:id/confirm`                                           | Atomically completion + XP + points + actual hours + activity + individual impact; unique `(user,quest,completion)`; repeated confirmation returns original result. |
| publishCollectiveImpact               | PUT `/v1/organizer/quests/:id/impact`                                                     | Owner, measured metrics, one group record per quest; edit replaces record, no duplicated totals/XP.                                                                 |
| public impact / private receipts      | GET `/v1/impact?...`, `/v1/users/me/impact-receipts/:id`                                  | Public projection excludes user ids/private reports/contact data; receipt only owner; unknown coordinates remain null, source required.                             |
| redeem                                | POST `/v1/rewards/:id/redemptions`                                                        | Lock balance and stock, unique one redemption/user/reward, idempotency key; spend only points, never XP; return updated balance + redemption.                       |
| aggregate selectors                   | GET `/v1/users/me/dashboard`, `/v1/leaderboard`, `/v1/users/me/transactions`              | Confirmed ledger only, public-safe projections, explicit period boundaries.                                                                                         |

### Transaction, time and privacy rules

- Database unique constraints enforce idempotency even with concurrent tabs/retries; UI locks are not sufficient. Store idempotency key + request hash + response; reused key with different payload → 409. After network ambiguity, read by key/entity before repeating mutation.
- Server-generated UTC instants; convert organizer date/time with `Europe/Kyiv` and DST validation. Draft form keeps local calendar strings, published API uses ISO instants plus display timezone. Inclusive impact filters represent Kyiv calendar days, not UTC midnight assumptions.
- Missing actual hours/metrics are unknown, not zero. Imported historical participation may have XP without measured hours; do not create invented measurements.
- Personal receipt exports a privacy-safe summary with name opt-in. Do not expose private receipt links or internal identifiers in shared PNGs. Public coordinates are verified area locations, not precise sensitive meeting points.
- Validate uploads (type, size, malware, EXIF removal, consent/access) independently. Existing demo photo selectors do not implement uploads or evidence verification.

## Replacement and rollout plan

1. Reconcile team branches first: this `Sergiy` includes EPIC01+04; inspected `main` EPIC02 commit `fa629e2` and EPIC03 commit `593fd5b` are not integrated. Review shared entity/router/repository conflicts; agree mission/team identity contracts with their owners rather than guessing them.
2. Define OpenAPI/DTOs and database migrations; implement server RBAC, transactions, unique constraints, time and media policies. Add NestJS integration tests for forbidden cross-org access, duplicate/concurrent confirmation and redemption, capacity exhaustion, output validation and errors.
3. Introduce an explicit mock/HTTP adapter selection at composition root, shared query keys and typed DTO mapping. Switch provider independently from domain storage so a local template can still produce a server-saved draft.
4. On successful mutation invalidate quest, participation, dashboard, leaderboard, transactions, receipts and aggregate queries as appropriate. On account change cancel in-flight requests and clear **private** query caches. Current mock hooks subscribe to repository; they are not an implemented HTTP cache adapter.
5. Do not upload localStorage automatically. Local demo data/credentials are not trusted user records. Offer explicit export if needed; production starts from server state. Keep browser schema migrations separate from database migrations.
6. Behind an environment/feature flag, run the same UI flow against a staging server, add real network error/timeout/session-expiry tests and check role isolation. Remove demo role switch, synthetic pre-approved quest creation, local full-reset control and fixture credentials from production build.
7. Production cutover only after staging acceptance and team review. No backend deployment or cross-epic merge is claimed here.
