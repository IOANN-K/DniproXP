# BE-05.1 — AI Quest Generator, Rewards Catalog & Redemption Engine

## Handoff та статус

Реалізація лише в `apps/api`. Frontend/mocks, чотири виконані міграції, чинні verification/XP/Impact/progress алгоритми, паролі та реальний `.env` не редагувалися. Нових залежностей немає. Build, tests, lint, typecheck, сервер, Docker, migrations і seed агент **не запускав**. Нижче опис реалізації, а не підтвердження проходження перевірок чи готовності до deployment.

Нова міграція: `AiRewards1792454400000`, файл `1792454400000-ai-rewards.ts`. Зареєстрована явно після BE-04; synchronize/migrationsRun вимкнені. Up/down потребують транзакції. Down можливий лише на порожніх нових доменах; за наявності історії відмовляється її видаляти. Корекції робити forward migrations.

## Файли та модулі

Нові:

- `src/ai-quests/ai-quest.module.ts`, `ai.controller.ts`, `ai.dto.ts`, `ai.entity.ts`, `ai-provider.ts`, `generation.schema.ts`, `generated-quest.validator.ts`, `quest-generation.service.ts`;
- `src/rewards/rewards-catalog.module.ts`, `rewards.controller.ts`, `rewards.dto.ts`, `reward.entity.ts`, `rewards.service.ts`;
- `src/database/migrations/1792454400000-ai-rewards.ts`, `src/database/ai-rewards-seed.ts`;
- цей документ.

Змінені:

- `src/app.module.ts`: AiQuestModule і RewardsCatalogModule;
- `src/config/environment.ts`: валідовані AI settings;
- `src/database/typeorm.config.ts`: entities та міграція;
- `src/database/seed.ts`: виклик gated BE-05.1 fixture seed;
- `src/quests/quests.service.ts`: незмінне тіло створення квесту винесено в transaction-scoped `createWithin`, щоб conversion та прив’язка suggestion комітилися атомарно;
- `src/quests/quests.module.ts`: експорт QuestsService для orchestration;
- `src/main.ts`: Swagger description і CORS allowlist заголовка Idempotency-Key;
- `.env.example`: тільки порожні provider placeholders та несекретні ліміти;
- `README.md`: посилання на handoff.

Entities: AiGenerationSession, AiQuestSuggestion, RewardCatalogItem, RewardRedemption, RewardRedemptionHistory. `ai_generation_quota` — внутрішні SQL buckets, не API для редагування лімітів. Ledger/RewardAccounts лишаються єдиним джерелом валюти.

## Frontend → DTO → service → persistence → authorization

Досліджено frontend `features/quest-generation/{provider,contracts,wizard-storage}`, `entities/quest/form-schema`, organizer wizard, `entities/types`, rewards page/dialog, mocks API/repository та frontend backend-integration-handoff. Старий frontend handoff є пропозицією і містить застарілий опис backend; чинну реалізацію визначають BE-01–05.1.

- `GenerationRequest {schemaVersion:1,input:{goal,categoryId,district,capacity,durationHours}}` → GenerateQuestsDto + Zod requestSchema → QuestGenerationService → private AiGenerationSession/AiQuestSuggestion → JWT active VOLUNTEER/ORGANIZER/ADMIN. Existing URI `POST /v1/quest-generations` збережено. Організація не виводиться довільно з однієї global role: optional organizationId перевіряється через OrganizationAccess; приватна ідея може не мати org.
- GeneratedQuestDraft → GenerationResponseDto з provider=`remote-ai`, schemaVersion=1, values і warnings. Назви й типи frontend values збережені: description короткий, fullDescription довгий, requirements/bring — multiline strings, blank date/time/address/locationId. Additive generationId/suggestionId дають доступ до history. count за замовчуванням 1; для 2–3 повертається перший preview, усі suggestions доступні через generation detail/history.
- `goal` — фактичний UI prompt. Не введено обов’язкові interests/difficulty/accessibility/timeAvailability, яких UI не надає. Optional interests/difficulty/participation/accessibility обмежені схемою. durationHours — доступний час. Район має бути одним із восьми чинних районів Дніпра; довільний текст wizard отримує validation error, а не неперевірені координати.
- Save personal idea → savedAt у suggestion, жодного офіційного Quest. Convert → ConvertSuggestionDto.organizationId → QuestsService.createWithin → ordinary Quest DRAFT/PENDING → власник suggestion з ORGANIZER та OWNER/MANAGER org capability.
- Frontend Reward `{name,cost,organizationId,category,stock,details}` → RewardDto з aliases name/title і cost/pricePoints → RewardsService → reward_catalog_items. Чотири українські категорії збережені. Platform items мають organizationId=null (адміністративна пропозиція, не вигаданий партнер). PUBLIC catalog не містить private/archived чи пропозицій непогоджених orgs.
- Frontend one-time redeem → RedeemRewardDto + Idempotency-Key header → real ledger spend + RewardRedemption → active VOLUNTEER. Один обмін `(user,reward)` протягом усього lifecycle, включно з refunded: cancellation не скидає правило «один раз».
- Frontend mock code не переноситься в production response: секретів видачі не створюємо й не повертаємо. Статус reserved — бронювання, не автоматичне фізичне отримання. Fulfillment відмічає authorized partner/admin.

Frontend adapter не переключений на HTTP. Йому потрібно використовувати server availability/stock і lifecycle, а не повторно віднімати локальні redemptions від уже обчисленого stock. Це документований mapping, frontend contract файли не редаговано.

## AI provider та ENV

`AiProvider → CompatibleAiProvider` — ізольований native fetch adapter; `QuestGenerationService → GeneratedQuestValidator` — orchestration та незалежна перевірка output. Немає SDK-залежності або прив’язки до vendor hostname. Немає шаблонного fallback під виглядом AI.

Заповнити тільки в deployment secrets/ENV:

```dotenv
AI_PROVIDER=openai-compatible
AI_API_KEY=<secret manager value>
AI_MODEL=<configured model supporting structured outputs>
AI_BASE_URL=https://<trusted-provider>/<API-prefix>
AI_TIMEOUT_MS=15000
AI_USER_DAILY_LIMIT=10
AI_ORG_DAILY_LIMIT=50
AI_GLOBAL_DAILY_LIMIT=200
AI_CONCURRENCY_LIMIT=3
AI_MAX_SUGGESTIONS=3
AI_OUTPUT_RETRIES=0
AI_RETENTION_DAYS=30
```

Adapter додає `/chat/completions` до base URL, надсилає bearer key, model, JSON Schema response_format і до 3500 output tokens на suggestion. Provider має підтримувати цей protocol/schema; unsupported capability → controlled failure, без silent downgrade. Підтримка заголовка Idempotency-Key провайдером додаткова, локальні гарантії від неї не залежать.

Відсутність будь-якого з provider/key/model/base URL → `AI_UNAVAILABLE` на canonical `/ai/quests/generate`, до billable call. Partial config допустима при startup і трактована як disabled; не блокує інші домени. Base URL тільки довірений операторський ENV, HTTPS без credentials/query/fragment; local HTTP лише localhost/loopback у development/test. Redirects заборонені. Потрібна операторська довіра до DNS/base URL та egress policy; URL з request ніколи не використовується.

До провайдера йдуть лише нормалізовані побажання з allowlist. Немає JWT, sessions, password hashes, чужих профілів, reports, org-private даних. Header key, response headers та raw provider body не зберігаються і не логуються. Goal слід не заповнювати персональними даними третіх осіб; сервер не може довести, що довільний текст користувача не містить їх.

## Input/output та failure modes

Goal 20–1000 plain-text символів, 6 QuestCategory, 8 районів, capacity 1–500, duration 0.5–12 годин; optional interests ≤10×80, accessibility ≤8×120, difficulty з BE-02 enum, count ≤3 та runtime max. DTO і Zod застосовуються послідовно; невідомі поля відхиляються. Prompt є недовіреними даними в окремому user message; provider не отримує tools, web access, mutations чи DB context.

Structured output strict `{suggestions:[...]}`; кожен елемент:

- title 8–100, shortDescription 20–240, description 60–3000;
- category, suggestedDistrict, estimatedDuration, difficulty, requiredVolunteers;
- checklist, requirements, safetyNotes, uncertaintyNotes — 1–8 рядків по ≤160;
- impactIntent 20–300 — намір, не verified metric.

Кількість ідей і category/district/duration/capacity повинні точно збігатися з input; за вказаної difficulty вона теж збігається. Немає model-controlled reward, address, dates, partner, locationId чи coordinates. HTML/control characters відхиляються; generated text призначений для plain-text rendering. Обмежені зовнішній stream ≤200 KB, content ≤150000 символів, час кожного запиту й output tokens.

Invalid JSON/schema/truncation/constraint mismatch: 0 retries за замовчуванням, максимум 1 додатковий **явно дозволений output-repair call**, з наперед зарезервованою квотою. Неперевірені suggestions ніколи не зберігаються. Timeout/network/non-2xx/redirect/oversize: **жодного автоматичного повтору**, бо результат оплати невідомий. Остаточний invalid output → AI_INVALID_OUTPUT; transport/provider → PROVIDER_UNAVAILABLE; disconnect → GENERATION_CANCELLED.

Existing `/quest-generations` зберігає finite frontend error enum: AI_UNAVAILABLE/AI_INVALID_OUTPUT/AI_LEASE_EXPIRED переводяться в PROVIDER_UNAVAILABLE, extended generation/idempotency conflicts — у CONFLICT. Canonical `/ai/quests/*` повертає точні domain codes; frontend для нього потребуватиме явного нового adapter, а не зміни чинних schemas. В обох маршрутах envelope/error requestId — BE-01 format.

Schema validation і safety prompt не є доказом істинності чи повною змістовою модерацією LLM. Навіть валідний текст може містити помилки або небезпечні поради: його завжди позначено як AI-ідею й пропущено через людську Quest moderation. VerifiedActivity/Impact/XP не можуть виникнути з generation/conversion.

## AI quotas, concurrency, idempotency та retention

Клієнт генерує UUID v4 Idempotency-Key **до першої спроби** й повторно використовує після мережевої неоднозначності. Request body не змінюється. `(user,key)` unique та SHA256 нормалізованого запиту; інший payload з тим самим key → conflict. Fresh admission під PostgreSQL advisory transaction lock перевіряє user/org/global добові buckets (UTC), global RUNNING count і створює RUNNING session. Atomic reservation комітиться **до** HTTP call; під час LLM немає відкритої DB transaction/row lock.

Квоти вимірюються не грошима чи токенами, а worst-case suggestion units: `count × (1 + AI_OUTPUT_RETRIES)` на запит. Резервуються user/global та org bucket, якщо org задана. Невикористаний retry budget не повертається; failures/cancellation теж споживають квоту. Це консервативне обмеження вартості, не billing reconciliation. Для жорсткого грошового бюджету потрібен додатковий provider-side spending cap. Щоденні limits конфігуруються Settings, дубль того самого запиту не витрачає нову квоту.

RUNNING → SUCCEEDED/FAILED; terminal session не запускається знову. Повтор successful key повертає той самий перший preview, running → 409, failed → контрольовану помилку. Process crash/unknown outcome залишає session до lease expiry; retry ніколи не перепризначає її іншому worker. Новий платний запит — тільки новий key за явною дією клієнта. Lease = максимальний бюджет усіх спроб +60 секунд; після expiry пізній результат не зберігається. `req.aborted`/response close переривають fetch, але це не гарантія скасування оплати у провайдера. Expired lease дозволяє звільнити slot; vendor може продовжувати віддалену роботу після HTTP timeout.

Admission та admin cleanup переводять прострочені RUNNING у FAILED, стирають request/payload після retentionAt та чистять старі quota buckets. Public API немає; owner reads відразу приховують expired payload навіть до фізичного очищення. Saved ideas також мають цей TTL; save не продовжує його. Зв’язок із уже створеним Quest зберігається, сам Quest не видаляється.

Tombstones (IDs, ownership, request hash, provider/model, status, errors, dates, links) лишаються для недопущення повторного billing зі старим key. Для фізичного очищення без нових generation requests оператор повинен регулярно викликати admin cleanup (захищеним scheduler/service account). Вбудованого in-memory cron немає; startup не виконує cleanup. Кожен виклик очищає до 100 expired leases та до 100 session payload sets; великі backlog-и потребують повторних scheduled викликів. Expired slots не враховуються в admission навіть до їх фізичного очищення.

## Quest conversion

`POST suggestions/:id/save` — власна персональна ідея. `save-draft` вимагає ORGANIZER + active OWNER/MANAGER організації та ownership suggestion. Задана в generation org не може бути підмінена при conversion. Organization lock, suggestion lock, повторна schema validation, існуючий createWithin і suggestion.convertedQuestId — одна transaction. Повтор повертає той самий Quest; інша org не отримує новий.

XP=150 і Reward Points=75 — server policy для **чернетки**, не нарахування і не значення з AI. Capacity/difficulty/category проходять domain validation. Image з allowlist. Blank address, null start/end, null coordinates/source; checklist/safety стають instructions. Немає автоматичного submit-review, approval чи publication. Організатор далі уточнює адресу, дату/час через BE-02 ISO offset contract, погоджує умови та проходить модерацію. Не перетворюємо local calendar strings із порожнього wizard на UTC припущення.

## Rewards і stock

Catalog має title/name, description, details, image, 4 frontend categories, pricePoints/cost, supply stock, PUBLIC/PRIVATE, ACTIVE/UNAVAILABLE/ARCHIVED, org або platform, redemptionRules та незмінний isDemo. PRIVATE не є способом таємної покупки: новий redeem доступний лише PUBLIC ACTIVE. Archived immutable; існуючі reservations можна завершити/повернути. Org/moderation scope перевіряється незалежно від team/global role.

Збережений `item.stock` — **загальна кількість одиниць**. `used=count(reserved|fulfilled)`; API `stock=stockTotal-used`. Redemption row є stock reservation; окремий mutable залишок не дублюється. Резервування однієї одиниці збільшує used, fulfill продовжує його утримувати, refund звільняє. Manager може змінити загальну supply під item lock, але не нижче used; неможливо від’ємне значення. Deferred DB stock guards перевіряють остаточний стан під item lock. Каталог і management pages використовують batch aggregates, не N+1.

ADMIN — явна platform reward capability, може керувати всіма items/fulfillment; це не змінює заборону quest organization bypass BE-02. ORGANIZER — лише active OWNER/MANAGER відповідної org. Partner може створити item у pending org, але public catalog/redeem приховає його до approved. Org-bound pending orders можна обслуговувати навіть після зміни moderation; це не дозволяє нові покупки.

## Redemption transaction та фінансові гарантії

Порядок locks: org (якщо потрібна) → item → recipient user → redemption → ledger/reward_account. Списання використовує існуючий LedgerService.spendPoints, refund — існуючий compensate. Немає HTTP amount/mint endpoint і нового ledger. Баланс з чинних ledger entries; user row серіалізує паралельні видатки, BE-02 reward_accounts CHECK/trigger не дозволяє negative balance.

Requested і reserved записуються в одній transaction разом із debit, stock reservation, history й audit. Зовні після commit видно тільки reserved. `(user,key)` запобігає подвійному debit, `(user,reward)` зберігає frontend one-time правило; reuse key для іншого item →409. Frozen price/title/demo/org захищають старі orders після зміни каталогу. Retry повертає поточний status і поточний баланс без нових проводок.

Lifecycle:

- requested → reserved: успішне списання та резервування;
- reserved → fulfilled: лише authorized admin/partner; repeat є no-op;
- reserved → cancelled → refunded: owner або authorized admin/partner, причина 5–1000; дві transition/history події й compensating credit **однією transaction**;
- fulfilled/refunded terminal. Автоматичного refund після фізичної видачі немає. Repeat refunded — no-op.

requested/cancelled не можуть залишитися committed: deferred consistency trigger вимагає reserved/fulfilled/refunded + правильний debit. Для refunded перевіряється єдиний compensating credit на точну price, originalId, currency, user, source/idempotency key. Додаткові/непогоджені refund credits на redemption відхиляються. Історія й ledger append-only; FK ON DELETE RESTRICT, no-delete/no-truncate guards. Down не видаляє financial history.

Owner GET повертає лише власний order, без чужих балансів, ledger IDs, idempotency keys, provider data чи secret redeem codes. Authorized fulfillment queue має мінімальну operational projection: order/user/reward IDs, назву, status, demo flag, reservedAt; без cancellation reason і приватних ledger details. User ID потрібний для звірки особи, не є redeem secret. Справжній secure-code/QR fulfillment, доставки, external partner API та платежів немає.

## Повний каталог endpoints

Усі URI з prefix `/v1`.

AI (JWT, ownership; generation дозволена active VOLUNTEER/ORGANIZER/ADMIN):

- `POST /quest-generations` — frontend-compatible generation; UUID Idempotency-Key; 200;
- `POST /ai/quests/generate` — canonical generation, precise domain errors; UUID key; 200;
- `GET /ai/quests/generations` — page/pageSize/order;
- `GET /ai/quests/generations/:id` — session + suggestions;
- `GET /ai/quests/suggestions/saved` — saved, не прострочені ідеї, pagination;
- `GET /ai/quests/suggestions/:id` — own suggestion;
- `POST /ai/quests/suggestions/:id/save` — idempotent personal save, 200;
- `POST /ai/quests/suggestions/:id/regenerate` — нова session за попередніми preferences, UUID key, той самий cost control, 200;
- `POST /ai/quests/suggestions/:id/save-draft` — body organizationId, ORGANIZER+org capability, 200 ManagedQuestDto;
- `POST /admin/ai/cleanup` — ADMIN, expiry/retention cleanup з audit, 200.

Rewards public:

- `GET /rewards/catalog` — page/pageSize/order/search/category/maxCost/available=true|false;
- `GET /rewards/catalog/:id` — public detail, inaccessible→404.

Reward management (JWT ADMIN або ORGANIZER+org scope):

- `POST /rewards/catalog` — RewardFormDto, 201;
- `PATCH /rewards/catalog/:id` — whitelisted edits, immutable org/demo, 200;
- `POST /rewards/catalog/:id/archive` — 200;
- `GET /rewards/catalog/:id/manage` — private/archived management detail;
- `GET /organizations/:id/rewards/catalog` — scoped complete catalog, pagination;
- `GET /admin/rewards/catalog` — ADMIN complete catalog, pagination;
- `GET /rewards/catalog/:id/redemptions` — scoped operational queue, pagination.

Redemptions:

- `POST /rewards/redemptions` — JWT VOLUNTEER, body rewardId, UUID Idempotency-Key; 201 RedemptionResultDto;
- `POST /rewards/:id/redemptions` — equivalent frontend-handoff alias; same key/invariants;
- `GET /users/me/rewards/redemptions` — JWT own page;
- `GET /rewards/redemptions/:id` — JWT owner only;
- `POST /rewards/redemptions/:id/fulfill` — ADMIN або authorized org OWNER/MANAGER; 200;
- `POST /rewards/redemptions/:id/cancel` — owner або authorized manager/admin; ReasonDto; atomic refund, 200.

Усі private endpoints мають bearer Swagger metadata, DTO responses і existing ApiErrors envelope. 401 unauthenticated, 403 role/scope, 404 inaccessible, 422 malformed payload/key, 409 conflict/lifecycle/insufficient points/stock, 429 AI quota/concurrency, 503 AI/provider failures. CORS allowlist включає Idempotency-Key; requestId генерує existing middleware. Генерація не читає browser cookies як заміну JWT.

## Migration та demo seed

Міграція додає 6 таблиць (sessions, suggestions, quota, catalog, redemptions, history), indexes, checks, unique constraints, restrictive FKs, frozen-history guards, deferred finance/stock consistency. Чинні migrations не редагуються. Новий deferred ledger trigger відсіює неконсистентні redemption/related-refund inserts; QUEST_COMPLETION/MISSION_REWARD/CHALLENGE_REWARD не змінюються.

Gated BE-01 seed викликає BE-05.1 після BE-04 в тій самій development/test transaction. Потрібні наявні ALLOW_DEMO_SEED та 5 explicit credentials; passwords не перезаписуються. Додає 8 чітко маркованих platform demo rewards у 4 категоріях, різні prices/supply, sold-out та unavailable. Лише при першому створенні першого item і достатньому реальному балансі volunteer робиться один звичайний reservation через redeemWithin (25 балів); якщо балансу недостатньо, приклад пропускається, нові бали не створюються. Повтор seed не змінює catalog/order/operator state і не повторює списання.

Один saved AI fixture з provider=`fixture`, isFixture=true, model=`static-demo-v1`, attempts=0; він пройшов ту саму content schema, явно називає себе статичним. Fixture доступний лише через owner history/suggestions; generation response ніколи не видає його за remote-ai. Seed не звертається до провайдера й не заповнює AI configuration. Після TTL fixture не воскресає при повторному seed.

## Відомі ризики та відкладене

Не виконано жодних runtime/SQL/конкурентних перевірок. Перед rollout потрібні PostgreSQL integration tests для deferred triggers, last-stock/last-points race, cross-instance AI admission, duplicate requests, rollback, stale lease, retention та permissions. Існуючий starter test не є покриттям нових гарантій.

Синхронна генерація обмежена timeout і lease; durable queue/worker, автоматичний retry після process crash, streaming і vendor billing reconciliation не реалізовані навмисно. Перезапуск невідомого billable call заборонено. Settings AI_OUTPUT_RETRIES=1 може оплатити один додатковий invalid-output attempt; це явна операторська політика. Provider support/schema та quality слід перевіряти на staging. Prompt не замінює moderation/safety review.

Retention фізично очищається при admission або admin cleanup; без traffic потрібний зовнішній scheduled виклик. Tombstones та immutable finance/audit history зберігаються; GDPR/data-export/legal retention потребують окремої політики. Каталог не доводить реальність поставки від партнера: публікувати тільки після зовнішнього погодження. Demo labels immutable, але справжній onboard партнерів лишається governance BE-01. Expiry/reservation TTL не додано: reserved утримує stock до явного fulfill/cancel. Refund після fulfill, partial refunds, multiple purchases, secure redeem codes/QR, shipping і payments — окремі workflow.

## Команди самостійної перевірки

Агент їх **не виконував**. Із кореня після review:

```sh
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api build
# Тільки на погодженій ізольованій PostgreSQL БД з чинним ENV:
pnpm --dir apps/api exec typeorm migration:run -d dist/src/database/data-source.js
# Лише development/test із explicit gated credentials:
pnpm --dir apps/api exec node dist/src/database/seed.js
# За потреби окремий сервер:
pnpm --dir apps/api exec node dist/src/main.js
```

Ручний checklist: disabled/partial AI config, valid/invalid output, timeout без повторного billable call, retry same key/different payload, multiple instances/concurrency/quota midnight UTC, cancel/disconnect, expired lease і late response, saved idea expiry/cleanup, чужі suggestions, cross-org conversion, repeated conversion, DRAFT/PENDING без coordinates/schedule, ordinary moderation, stock=0/private/unapproved/archived, price change after reserve, parallel same user/item/key, two users last unit, concurrent spend with quest/progress award, insufficient points, fulfill vs cancel race, duplicate cancel/refund, unrelated XP/progress/Impact invariants, seed twice після операторських змін, refusal destructive down.
