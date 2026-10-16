# DniproXP · Backend foundation BE-01

> Продовження: [BE-02 Quest Engine](be-02-quest-engine.md). Нижче збережено межі першого етапу; нові quest/ledger endpoints та поточний body limit описані у BE-02.

## Межі реалізації та фактичний аудит

Реалізовано NestJS API `/v1`: identity, авторизацію, користувачів, privacy settings, організації, staff scope, модерацію, аудит, health, OpenAPI, міграцію та явний dev seed. Frontend adapters і localStorage залишаються демонстраційними. Цей етап не підключає React до API і не імпортує demo snapshots.

До BE-01 `apps/api` містив `GET /`, AppModule і TypeORM config без entities/migrations. Збережено наявні NestJS 12, TypeORM 1.1, PostgreSQL 17 Compose, strict TypeScript/NodeNext та `.js` import specifiers. Додано сумісний Swagger 12, Argon2, jose, Helmet і Zod. Shared `packages/contracts` відсутній; окремий workspace не створювався: runtime DTO metadata належить NestJS, а HTTP-клієнт згодом генеруватиметься з OpenAPI.

Зіставлено `entities/types`, Passport/Skill/Team/Impact contracts, unified `mocks/repository`, identity commands/API, missions/challenges adapters, auth adapter та всі доменні документи в `apps/web/docs`. Код випереджає історичний handoff: Teams, Missions і Challenges вже присутні у mock. У frontend одна primary role; backend підтримує `roles[]` і `primaryRole`, тому організатор може також залишатися волонтером. Наявність ролі не замінює членство в організації.

Назва prefix `/v1` і вкладена помилка узгоджені з останнім `backend-integration-handoff.md`. Старі плоскі error examples є історичними. Демо-ID на кшталт `demo-user` не є backend UUID. `displayName/avatarUrl/bio` потребуватимуть mapping до старих frontend `name/avatar/bio`. Публічна реєстрація більше не приймає роль організатора чи демонстраційний code: лише email/password/displayName.

**Build, tests, lint, typecheck, dev/server та міграції під час реалізації не запускалися.** Успішна компіляція й інтеграційна поведінка ще не підтверджені. Lockfile оновлений через `pnpm install --lockfile-only --ignore-scripts`; пакети не встановлювалися, lifecycle scripts не виконувалися.

## Модулі та файли

- `src/config`: Zod environment validation, глобальний Settings provider.
- `src/database`: спільні connection options, DatabaseModule, `Transactions.run(manager => ...)`, CLI DataSource, entities, початкова migration і CLI seed.
- `src/auth`: Argon2id, JWT, guards/decorators, browser Origin/CSRF, refresh cookie, PostgreSQL rate buckets і auth endpoints.
- `src/users`: whitelist DTO, приватна/публічна проєкції, preferences.
- `src/organizations`: scoped policy, org/staff mutations, moderation endpoints.
- `src/audit`: запис AuditLog тим самим EntityManager, що й доменна мутація.
- `src/common`: pagination, nested validation errors, безпечний exception filter.
- `src/health`: liveness і реальний readiness SQL-запит.
- `src/main.ts`: prefix, CORS, body limits, request IDs, Helmet, validation/filter, shutdown, optional Swagger.

## ER relationships та БД

- User `1—1` UserPreferences, FK `user_id`, cascade лише на справжнє видалення user (такого HTTP endpoint немає).
- User `1—N` AuthSession `1—N` RefreshToken. Session є сім'єю ротації; старі verifiers зберігаються для виявлення replay.
- User `N—M` Organization через OrganizationMembership. Пара `(organization_id,user_id)` унікальна; видалення членства є soft transition `REMOVED`.
- AuditLog `N—1` nullable actor User; target — поліморфний UUID із targetType. Audit metadata не містить credential/request body.
- `auth_rate_limits` — внутрішні спільні для інстансів buckets; ключ — HMAC від action/IP, raw IP не зберігається.

UUID генерує PostgreSQL `gen_random_uuid()` (PostgreSQL 17). `installExtensions:false` забороняє TypeORM автоматично створювати extension на boot. `synchronize`, `migrationsRun` і `dropSchema` вимкнені. Дати — `timestamptz`, connection timezone UTC, відповіді ISO 8601. SQL logging вимкнено. Query timeout 10 s; idle transaction timeout 15 s; connection timeout 5 s.

Початкова міграція `1792108800000-foundation` створює таблиці у порядку users → preferences → organizations → memberships → sessions → refresh tokens → audit → rate buckets. Індекси включають case-insensitive email, staff scopes, moderation queue, active sessions, token family та audit targets. CHECK constraints обмежують enum values, нормалізацію email, primaryRole ∈ roles, slug і терміни сесій. Entity relations явно описують FK. Функціональні/descending індекси збережені як migration-managed metadata.

Всі майбутні migration diffs слід переглядати вручну; `auth_rate_limits` навмисно керується SQL, не доменним Repository. Не запускати schema sync. DB runtime-role має отримувати лише DML/SELECT права, без CREATE/DROP; migration-role — окремий. Поточний код не створює DB roles або production grants автоматично.

## Endpoint catalog

Усі маршрути нижче мають prefix `/v1`. Bearer access token потрібний, якщо маршрут не позначений public.

Authentication:

- `POST /auth/register` — public, створює тільки ACTIVE VOLUNTEER + preferences + session; `201`.
- `POST /auth/login` — public, однаковий `401` для відсутнього email, неправильного пароля та неактивного user; `200`.
- `POST /auth/refresh` — refresh cookie, rotation; `200`.
- `POST /auth/logout` — refresh cookie, відкликає family; ідемпотентний `204`.
- `POST /auth/logout-all` — bearer + browser-origin/CSRF, відкликає всі сім'ї; `204`.
- `GET /auth/me` — актуальний private user DTO з БД.

Перші чотири POST також потребують allowlisted `Origin` та `X-DniproXP-CSRF: 1`, навіть у curl. Login limit: 10/IP за 15 хв; register: 5/IP за годину; refresh/logout: 60/IP за хвилину. Це DB-backed fixed-window rate limits; `429` містить `Retry-After`. Edge-level DDoS protection і distributed credential-stuffing detection залишаються deployment responsibility.

Users:

- `GET/PATCH /users/me` — власний профіль; можна редагувати displayName, bio, avatarUrl та обирати лише вже призначену primaryRole. Email, status, roles, XP й адміністративні поля не приймаються.
- `GET/PATCH /users/me/preferences` — власні boolean privacy settings.
- `GET /users/:id/public-profile` — public; приватні, відсутні та неактивні accounts повертають однакове `{restricted:true}`. Email/roles/status/passwordHash не потрапляють у public DTO.

Organizations:

- `GET /organizations` — public, лише approved; search за назвою.
- `GET /organizations/:id` — public, лише approved; для інших `404`.
- `GET /organizations/mine` — усі orgs із власним активним staff membership, з moderationReason. Це спосіб бачити власну pending/rejected/suspended організацію.
- `POST /organizations` — будь-який ACTIVE authenticated user; створює pending org + OWNER membership і додає ORGANIZER role атомарно. Primary role не перемикається автоматично. Limit 10/IP за годину.
- `PATCH /organizations/:id` — активний OWNER/MANAGER цього scope; suspended заблоковано; редагування повертає pending і очищає стару причину. Немає поля для клієнтського approve.
- `GET /organizations/:id/members` — лише active staff цього scope; pagination, optional `status`.
- `POST /organizations/:id/members` — лише OWNER, додає ACTIVE user за UUID; призначає staff role, за потреби ORGANIZER account role. Це пряме адміністративне додавання, не email invitation flow.
- `PATCH /organizations/:id/members/:userId` — лише OWNER, role/status. Не можна залишити організацію без активного OWNER.
- `DELETE /organizations/:id/members/:userId` — лише OWNER, soft-remove, `204`; роль account ORGANIZER залишається, але сама по собі не надає scope.

У suspended org staff management заблокований. Rejected org можна відредагувати й повторно подати як pending. Public list ніколи не повертає rejected/suspended/pending records або внутрішні moderation reasons.

Administration (явна роль ADMIN):

- `GET /admin/organizations/pending` — черга moderation.
- `POST /admin/organizations/:id/approve` — pending → approved або suspended → approved (відновлення).
- `POST /admin/organizations/:id/reject` — pending → rejected; обов'язкова reason 10–1000 символів.
- `POST /admin/organizations/:id/suspend` — approved → suspended; обов'язкова reason.

Повторний той самий moderation status є no-op. Self-moderation власної org заборонена. ADMIN не отримує доступ до звичайних staff mutations чужої org без членства. Керування account status/ADMIN grants через публічний API, email verification/password reset і production admin provisioning не входять у цей етап; майбутні адміністративні зміни мають писати аудит у тій самій транзакції.

Operational:

- `GET /health` — public liveness.
- `GET /health/ready` — public `SELECT 1`, `503 DATABASE_UNAVAILABLE` при втраті connection.
- `GET /` starter controller збережено; при production bootstrap він доступний як `/v1/`.
- `/docs` — Swagger UI, лише якщо явно ввімкнений у non-production.

## Контракти

DTO classes із validation та OpenAPI decorators лежать біля відповідного модуля. Unknown properties відхиляються; nested validation errors — `422` з fields map. JSON body limit — 16 KiB. UUID route params перевіряються (v4). Nullable URL/bio можна очистити через null; null для обов'язкових значень у PATCH не допускається. URL лише HTTPS, backend їх не завантажує і не вважає перевіреними uploads.

Pagination: `page` (від 1), `pageSize` (1–100, default 20); `{items,meta:{page,pageSize,total}}`. Organizations: `sort=createdAt|name`, `order=ASC|DESC`, bounded literal substring `search`. Memberships: `order`, optional `status=ACTIVE|REMOVED`, sorting by createdAt/id. Tie-breaker UUID забезпечує стабільний порядок; це offset pagination, зміни між запитами можуть пересунути сторінки.

Canonical error:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Перевір поля запиту.",
    "requestId": "UUID",
    "fields": { "displayName": ["validation message"] }
  }
}
```

401 UNAUTHENTICATED; 403 FORBIDDEN/ORGANIZATION_SCOPE_REQUIRED/CSRF_REJECTED; 404 NOT_FOUND; 409 CONFLICT/LAST_OWNER/INVALID_MODERATION_TRANSITION; 422 VALIDATION_FAILED; 429 RATE_LIMITED з retryAfterSeconds; 500 INTERNAL_ERROR; 503 DATABASE_UNAVAILABLE. PostgreSQL uniqueness conflicts мапляться у 409 без SQL/parameters. Internal exceptions не віддають stack trace. Request IDs генерує сервер; відповіді мають `Cache-Control:no-store`.

Private User містить email, roles/primaryRole, timestamps та профільні поля, але не passwordHash, seed marker або refresh verifiers. `statistics:{available:false}` — чесна межа BE-01: verified ledger/skills/teams ще не перенесені, тому API не повертає вигаданий XP/level/hours/achievements. У майбутньому статистика — read model, не PATCH-поля.

Preferences сумісні з Passport: publicProfile, showVerifiedHours, showAchievements, showSkillProgress, showActivityHistory, showOrganizations; додані showDisplayName і showTeams. За замовчуванням publicProfile=false, усі disclosure flags false, окрім showDisplayName=true. При приховуванні displayName також не передаються avatar/bio. Власнику доступні всі preferences; public response не містить їх. Прапорці для ще не реалізованих даних зберігаються, але дані не фабрикуються.

## Security та транзакції

Passwords — Argon2id: memory 64 MiB, timeCost 3, parallelism 1; salt генерує бібліотека. Login виконує Argon2 verify навіть для відсутнього account за допомогою випадкового startup dummy hash. Password field ніколи не логують. Register існуючого email може повернути 409, login enumeration не відкриває.

Access JWT HS256: окремий секрет, 60–1800 секунд, issuer/audience/kind/sub/sid/jti/iat/exp. Guard не довіряє ролям із JWT: кожен запит перевіряє поточні status/roles user та невідкликану session у БД. Неактивний user блокується одразу на наступному guard check. Refresh — інший secret, окремий kind, DB verifier SHA-256 від криптографічно підписаного JWT; сам токен у DB не зберігається. Порівняння verifier constant-time. Сім'я має абсолютний термін, ротація його не подовжує.

Refresh транзакція блокує user → session, споживає старий token, записує новий verifier і аудит. Reuse спожитого token відкликає всю session, **комітить revoke**, потім повертає 401. Login/logout/logout-all узгоджують порядок user/session locks. Logout-all відкликає також access sessions, а не лише cookies. У browser adapter потрібний single-flight refresh між вкладками: одночасне використання cookie та retry після втраченої refresh response консервативно призводять до reauthentication. Старі verifiers не можна очищати до завершення family. Тимчасова помилка БД не очищує чинну refresh-cookie; 401 очищує її.

Refresh cookie: HttpOnly, host-only, path `/`; secure=true використовує `__Host-` prefix. Production вимагає Secure/HTTPS; local HTTP дозволений лише з явним COOKIE_SECURE=false. SameSite lax за замовчуванням; none потребує Secure. Для всіх cookie-auth POST — точний Origin allowlist і custom CSRF header, який змушує браузер пройти CORS preflight. `Origin:null`, wildcard та довільні subdomains не приймаються. Refresh token не повертається в JSON і не зберігається в localStorage. Access token тримати у пам'яті. Bearer-protected mutations не авторизуються за refresh cookie.

Trust proxy вимкнено за замовчуванням. Якщо ввімкнути, мережа має унеможливлювати прямий обхід trusted proxy; інакше IP rate limiting можна підмінити. Health відкритий, тому production gateway повинен обмежити probe traffic. Для auth Try it out у локальному Swagger додати точний API origin до CORS_ORIGINS і передавати CSRF header. Production Swagger завжди вимкнений; reverse-proxy access control до docs потрібен для shared non-production environments.

Org mutations і moderation блокують org row; staff зміни не можуть одночасно прибрати двох останніх owners. `OrganizationAccess.requireCapability(manager,orgId,userId,'publish'|'verify')` готує BE-02: перевіряє ACTIVE user, membership, staff capability та approved status під org lock. Викликати з тим самим EntityManager, що й доменний запис; не виконувати перевірку в окремій завершеній транзакції. REVIEWER може verify, OWNER/MANAGER — publish. Це policy helper, а не реалізований Quest API.

Audit writes атомарні з register, session rotation/revoke, profile/privacy, grants ORGANIZER, organization/staff/moderation mutations. Failed login пише окремий security event з unknown actor. Metadata задається сервером; password/token/body не копіюються. Audit API або destructive audit operations не надані. Для production окремо потрібні DB grants і retention policy.

## Environment та локальний workflow

Node >=24, pnpm 10. Створити ігнорований `apps/api/.env` із `.env.example`. ENV процесу має пріоритет; в обох CLI/bootstrap підхоплюється `apps/api/.env` від root або `.env` від apps/api.

Потрібні `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (незалежні випадкові значення >=48 символів), `CORS_ORIGINS`, `DATABASE_URL` або DB_USER/DB_PASSWORD/DB_NAME. DB_HOST=localhost, DB_PORT=5434 за замовчуванням; legacy DB_USERNAME/DB_DATABASE/PORT підтримуються як fallback, нові імена мають пріоритет. Порожній DATABASE_URL не перекриває split config.

Два секрети можна згенерувати окремими викликами `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`; зберегти лише в локальному ignored ENV або secret manager. Не надсилати їх у Git, frontend або logs.

Інші ENV: NODE_ENV, API_PORT, JWT_ACCESS_TTL/JWT_REFRESH_TTL (integer seconds), JWT_ISSUER/JWT_AUDIENCE, DB_SSL/DB_SSL_CA, COOKIE_SECURE/COOKIE_SAME_SITE, SWAGGER_ENABLED, TRUST_PROXY_HOPS. Production вимагає verified DB TLS, HTTPS origins, Secure cookies та вимкнений Swagger. SSL URL query parameters заборонено, щоб pg connection string не обійшов DB_SSL/CA policy.

Compose збережено разом із volume й loopback port. Password береться з ignored ENV; hardcoded password прибрано. **Зміна POSTGRES_PASSWORD у ENV не змінює пароль уже створеної бази у volume.** Для наявного volume використати його чинний пароль або окрему контрольовану ротацію. Не видаляти volume для виправлення mismatch.

Команди нижче користувач виконує самостійно, у наведеному порядку:

```sh
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
# Заповнити ignored apps/api/.env, згенерувати secrets.
docker compose --env-file apps/api/.env up -d postgres
pnpm --filter api build
pnpm --filter api db:migrate
# Необов'язково: налаштувати п'ять SEED_* пар і ALLOW_DEMO_SEED=true в local ENV.
pnpm --filter api db:seed
# Після seed повернути ALLOW_DEMO_SEED=false.
pnpm --filter api start:prod
```

Міграція одна: `1792108800000-foundation`. CLI працює з compiled `dist/database/data-source.js`, тому після змін потрібний build. DataSource не ініціалізується при імпорті, тільки CLI встановлює connection. Перед production migration — backup/review і окремий migration role. `db:revert` є **руйнівним rollback** початкової схеми, призначений лише для явного контрольованого використання; не запускати на БД із цінними даними. Немає автоматичного rollback/drop/reseed на boot.

Окремо після конфігурації: `pnpm --filter api typecheck`, `pnpm --filter api lint`, `pnpm --filter api test`, `pnpm --filter api test:e2e`; frontend regression — наявні команди web. Старий starter e2e не є тестом auth/security і потребує PostgreSQL та валідної конфігурації AppModule. Потрібні додаткові інтеграційні сценарії: refresh replay/concurrent logout, CSRF, cross-org access, last-owner race, public privacy, seed collisions і migration rollback на disposable DB.

## Demo seed

Тільки явний CLI у development/test, ALLOW_DEMO_SEED=true. Усі п'ять пар обов'язкові: `SEED_VOLUNTEER_{EMAIL,PASSWORD}`, `SEED_VOLUNTEER_2_{EMAIL,PASSWORD}`, `SEED_ORGANIZER_{EMAIL,PASSWORD}`, `SEED_ORGANIZER_2_{EMAIL,PASSWORD}`, `SEED_ADMIN_{EMAIL,PASSWORD}`. Emails мають відрізнятися, passwords >=16 символів. Немає fallback credentials або demo password bypass. Production відхиляється до DB initialization.

Створює Олександру Коваль, Максима Бондаря, двох координаторів і адміністратора; org names зіставлені з frontend fixtures: Зелений Дніпро, Поруч, Вірний друг, Місто спільних дій. Статуси: approved/pending/rejected/suspended. Усі users мають preferences, orgs — OWNER membership. Seed не створює Quest/XP/Impact fixtures.

Одна транзакція + advisory lock серіалізують паралельні seed runs. Внутрішні unique seed markers відрізняють seed-owned records від реальних accounts. Колізії email/slug/marker або відсутність очікуваного baseline abort-ять операцію; реальний account ніколи не перетворюється на ADMIN. Повторний запуск не перезаписує паролі, moderation, профілі, preferences чи memberships. Зміна seed ENV password не є password reset. Якщо email уже належить реальному user, вибрати інший seed email, не видаляти user.

## Frontend integration та BE-02

Пізніше в composition root додати явний mock/HTTP adapter. Згенерувати типи з OpenAPI, map UUID/names/preferences/roles, замінювати auth незалежно від доменних adapters. Використовувати credentials:include для refresh, Origin/CSRF та single-flight rotation; очищати private TanStack Query cache при logout/account change. При 401 зберігати незбережену форму лише для того самого account. Немає автоматичного upload/migration localStorage у серверну базу.

BE-02 має додати Quests, Participations/Reports, server-side capacity, verification, verified Activity/Impact, immutable XP/points ledger, idempotent events/outbox, reward redemption і derived dashboards. Missions/Challenges/Teams/Skill Tree/Passport credentials потребують наступних доменних етапів; поточні mock calculators не є server authority. AI generation proxy та uploads також ще не реалізовані.

Інваріанти майбутньої реалізації:

- XP і points видаються лише після підтвердженої дії, не після submit/report/join.
- Completion, ledger, impact, activity та event/outbox фіксуються однією транзакцією; unique source key не дозволяє повторну нагороду при race/retry.
- XP накопичується, Reward Points витрачаються; клієнт не задає balances/totals/achievements.
- Командна участь резервує індивідуальні місця; collective Impact записується один раз на quest і не множиться на число учасників.
- Невідомі години/координати/виміри залишаються unknown, не вигадуються.
- Public projections застосовують privacy на сервері; приватні звіти/evidence/email не потрапляють у загальні responses.
- Publish/verify обмежені активним staff scope та approved org під спільною транзакцією; ADMIN bypass можливий лише як окрема явно визначена дія.

Ризики перед deployment: код не запускався; потрібні dependency installation/native Argon2 support, migration/security/concurrency integration tests, перевірка TLS/proxy/cookies у staging, DB least-privilege grants, backup та retention. Email verification, password recovery, MFA, security monitoring, production admin provisioning і token-key rotation workflow не заявлені готовими. Поточна production-ready основа не є завершеним production security rollout.
