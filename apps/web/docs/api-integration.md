# FE-INTEGRATION-01 — стан інтеграції

## Межа цього етапу

**Часткова інтеграція: завершено першу межу Auth / Users / Profile / Preferences та read-only passport projection у профілі. Це не повне підключення DniproXP.** Решта доменів потребує наступних етапів у визначеному порядку. Build, typecheck, lint, tests, server, Docker, migrations, seed, installation та платні AI-запити не запускалися. Нижче опис коду, не результат end-to-end перевірки.

API — режим за замовчуванням. У ньому неперенесені сторінки **не виконують mock сценарії під реальною особою**, а показують явний стан незавершеної інтеграції. Головна тимчасово має інформаційний entry state. Це свідомий rollout gate до підключення наступних доменів, не їхня реалізація і не API empty/error fallback.

Повний старий сайт, сценарії й fixtures збережені в explicit development/test режимі `VITE_DATA_SOURCE=demo`. У production цей режим заборонений. API errors не перемикають режим і не повертають mock arrays. Не переносити browser demo records/credentials до backend. Seeded PostgreSQL користувачі й історія видимі через ті самі API; немає фільтра, який ховає їх через demo походження.

## Аудит і карта маршрутів

Прочитано router/pages, mock auth/repository/API, TanStack provider, session Zustand, profile/gamification/passport contracts, frontend backend handoff та фактичні Nest controllers/DTO: Auth, Users, Quests, Participations, Ledger, Impact, Missions, Challenges, Teams, Skills/Achievements/Passport, Organizations, AI і Rewards. BE-01–05.1 backend docs використано як domain handoff; URI нижче взято з controllers. За потреби ще раз звірити актуальні DTO перед наступним wiring.

| Frontend route / page | Попереднє джерело | Backend endpoint / DTO | Стан API wiring |
| --- | --- | --- | --- |
| `/login`, `/register` | auth-adapter → repository/auth-session | POST `/auth/login`, `/auth/register`; LoginDto/RegisterDto → AuthResponseDto | Підключено; реальний password; register створює тільки VOLUNTEER |
| Session / guards / header identity | local auth-session, getVolunteer | POST `/auth/refresh`, `/auth/logout`; GET `/users/me`; AuthResponseDto/UserDto | Підключено; memory access token, HttpOnly refresh cookie |
| `/profile` | useVolunteer, repository, mocks/api.profileApi | GET/PATCH `/users/me`; GET `/users/me/passport`; UserDto/PrivatePassportDto | Підключено; edit/name/bio/avatar/assigned primaryRole |
| `/profile/:id` | getVolunteer + local visibility | GET `/users/:id/public-profile`, `/users/:id/passport`; PublicUserProfileDto/PublicPassportDto | Підключено; завжди public projection, навіть для власника |
| Profile privacy | identity-api.passportApi.privacy | GET/PATCH `/users/me/preferences`; PreferencesDto/UpdatePreferencesDto | Підключено всі 8 flags |
| `/passport`, `/passport/:userId` | identity-api.passportApi | GET `/users/me/passport`, `/users/:id/passport`; Private/PublicPassportDto | Підключена та сама read-only identity projection; старий повний passport layout/print/credential flow ще не перенесено |
| Profile history | state.participations/transactions | GET `/users/me/passport/activities`; PassportActivityPageDto | Підключено page/pageSize, loading/error/empty |
| Profile skills labels | local skill catalog | GET `/skills`; SkillDefinitionPageDto | Підключено назви для server passport previews; повне дерево окремо |
| `/` | mocks/data, quest repository, demo platform stats | GET `/quests`, `/impact/summary`, `/organizations`; QuestPageDto/ImpactOverviewDto/OrganizationsPageDto | Не підключено, entry gate без синтетичних totals |
| `/quests`, `/quests/:id` | mocks/api.questApi, repository | GET `/quests`, `/quests/:id`; QuestQueryDto/QuestDto | Наступна межа, gate |
| `/map` | questApi + mocks/locations | GET `/quests`; QuestDto.coordinates/source | Не підключено; не вигадувати координати |
| `/dashboard` | repository, useVolunteer, exploration/identity selectors | `/users/me/progression`, `/users/me/participations`, `/users/me/missions`, `/users/me/challenges`, `/users/me/passport` | Не підключено; окремого dashboard summary endpoint немає |
| `/my-quests` | mocks/api, repository | GET `/users/me/applications`, `/users/me/participations`; POST `/quests/:id/applications`, `/applications/:id/withdraw`, `/participations/:id/start|cancel|reports` | Не підключено; ApplicationDto/ParticipationDto/ReportDto не можна замінити одним локальним status |
| Organizer applications/reports | organizer-api, repository | GET `/quests/:id/applications`, `/quests/:id/participants`, `/organizations/:id/reports/pending`; POST `/applications/:id/approve|reject`, `/reports/:id/approve|reject` | Не підключено; rewards тільки через verification |
| `/impact` | impact records/calculators, exploration selectors | GET `/impact/summary|categories|districts`, `/users/me/impact`; ImpactOverviewDto/ImpactGroupDto | Не підключено; planned hours не є verified |
| `/impact/receipts`, `/:id` | identity-api/local receipts | GET `/users/me/impact/receipts`, `/impact/receipts/:id`; ReceiptPageDto/ReceiptDto | Не підключено |
| `/passport/credentials/:id` | identity-api.credential | GET `/impact/receipts/public/:reference`; PublicReceiptDto | Не підключено; frontend mock ID ≠ public UUID reference |
| `/missions`, `/missions/:slug` | missions-api, local calculator | GET `/missions`, `/:id`; POST `/:id/enrollments`, `/:id/claim`; GET `/users/me/missions`, `/:id`; MissionDto/MissionProgressDto/RewardClaimDto | Не підключено; slug→UUID adapter необхідний |
| `/challenges`, `/challenges/:slug` | challenges-api, local progress | GET `/challenges`, `/:id`, `/:id/progress`, `/:id/leaderboard`; POST `/:id/participants`, `/:id/claim`; ChallengeDto/ChallengeProgressDto | Не підключено; server progress/claims |
| `/teams`, `/teams/:slug`, `/members`, `/quests`, `/settings`, `/teams/create` | identity-api, identity-commands/selectors | GET/POST `/teams`; GET/PATCH `/teams/:id`; members/statistics/contributions/leaderboard/achievements; TeamDto | Не підключено; slug→UUID; several active memberships |
| Team management | identity-api.mutate | `/teams/:id/join-requests`, `/invitations`, `/leave`, `/member-roles`, `/transfer-captain`, `/archive`; `/team-invitations/:id/accept|decline|revoke` | Не підключено; OWNER/MANAGER/MEMBER з backend |
| Team quest application | local teamQuest commands | POST/GET `/quests/:id/team-applications`, GET `/teams/:id/quest-applications`, POST `/team-applications/:id/approve|reject|withdraw` | Не підключено; frozen roster й operationId |
| `/skills` | identity-api.skills/local catalog | GET `/skills`, `/users/me/skills`, `/users/:id/skills`, `/users/me/skills/:id/evidence`; skill DTOs | Повне дерево не підключено; previews у профілі — server values |
| Achievements | local counts / AchievementGrid | GET `/achievements`, `/users/me/achievements`, `/users/:id/achievements`, `/teams/:id/achievements`; unlock DTOs | Профіль показує server unlock previews; повні каталоги/пагінація ще ні |
| `/leaderboard` | getVolunteer/local XP sort, team calculator | `/teams/leaderboard` та scoped challenge/team leaderboards | **Global volunteer week/month/all leaderboard endpoint відсутній**; не обчислювати з локальних counters |
| `/organizer`, `/organizer/quests`, `/new`, `/:id`, `/:id/edit` | organizer-api/repository | GET `/organizations/mine`, `/organizations/:id/quests`; POST `/quests`, PATCH `/:id`, POST `/:id/submit-review|publish|start|complete|cancel|archive`; ManagedQuestDto | Не підключено; org selector/capabilities та Kyiv schedule mapping потрібні |
| `/organizer/quests/generate` | ruleBasedProvider, wizard local storage | POST `/quest-generations`; GET `/ai/quests/generations`, `/:id`, `/suggestions/:id`; POST save/regenerate/save-draft | Не підключено; UUID idempotency перед billable call; fixtures явно позначені |
| `/rewards` | mocks/data rewards, rewardsApi, repository.redeem | GET `/rewards/catalog`, `/:id`; POST `/rewards/redemptions`; GET `/users/me/rewards/redemptions`; POST fulfill/cancel; RewardDto/RedemptionResultDto | Не підключено; backend balance, available stock, refund lifecycle |
| `/organizations`, `/:id`, `/organizers` | mocks/data, repository organizations | GET `/organizations`, `/:id`, `/organizations/:id/impact`, `/organizations/:id/quests` | Не підключено; details/impact/quests різні projections |
| Organization management | organizer-api, demo organizationId | `/organizations/mine`, POST/PATCH orgs, GET/POST/PATCH/DELETE `/organizations/:id/members...`; OrganizationDto/MembershipDto | Не підключено; global ORGANIZER не дорівнює org capability |
| `/admin` | repository/accounts/counters/moderate | GET `/admin/organizations/pending`, `/admin/quests/pending`; POST approve/reject/suspend; mission/challenge admin routes; reward management | Не підключено; **admin users directory/platform statistics endpoints відсутні** |
| `/demo`, `/demo/identity` | repository reset/demo commands | Немає production reset/demo-confirm endpoint | Тільки explicit local demo; API gate |

Безпосередньо в `usersApi` також підготовлено typed methods для progression, transactions і full own achievements; вони ще не є wiring dashboard/нарахувань. Не вважати наявність API method завершенням сторінки.

## Transport та контракти

Єдиний HTTP transport — `src/shared/api/client.ts`, configuration — `config.ts`, runtime Zod DTO — `contracts.ts`, endpoint adapter — `users.ts`. DTO не імпортують Nest-класи в browser і не використовують any/assertions для пропуску validation. Невідомий/пошкоджений response → INVALID_RESPONSE, а не empty array. API дані не записуються в localStorage.

Request options: method/body/query/signal/auth, optional idempotencyKey та явний replaySafe для set-value PATCH. Query parameters кодуються URLSearchParams. credentials=include, cache=no-store, redirect=error; за потреби bearer з memory. Cookie auth mutations мають X-DniproXP-CSRF:1. Єдиний path builder не приймає user-controlled absolute URL. Timeout 20 секунд; AbortSignal Query передається у fetch, logout aborts private in-flight requests. Для майбутнього AI з кількома output-repair attempts потрібно окремо узгодити довший transport timeout; transport сам його не повторює.

Errors: ApiError з status/code/message/requestId/fields/retryAfterSeconds. 401 → refresh/anonymous; 403 → forbidden; 404 → inaccessible/not found; 409 → conflict; 422 → form validation; 429 → rate limit без авто-повтору; network/timeout/503 — окремі errors. Публічний restricted=true — privacy response, не network failure. Unknown hours=null показано «Невідомо»; undefined для privacy-hidden полів не рендериться. Немає fallback до planned duration, zero hours або синтетичного ranking.

Transport не робить generic network mutation retries. Після 401 дозволений один replay лише GET, явно idempotent set-value PATCH або keyed operation. Unkeyed creation не повторюється навіть після успішного refresh; caller має перевірити стан. Ключ для майбутніх spending/AI мутацій має створюватися до першої спроби й зберігатися до явної зміни payload/нової операції; UI wiring цих доменів ще відсутній.

## Auth та session isolation

Access token і backend User — тільки module memory; refresh token залишається HttpOnly cookie. Реєстрація надсилає тільки displayName/email/password; не надсилає role/orgName і не надає ORGANIZER/ADMIN. Password 12–128, email ≤254, displayName ≤80 узгоджені з BE-01. Існуючі demo-account switches та demo level-up/toast не активні в API mode.

Bootstrap через refresh у Providers. Одночасні refresh-и в одній вкладці single-flight. Login/register/logout/refresh використовують один Web Locks key між same-origin вкладками, якщо API підтримано браузером; rotation виконується послідовно. BroadcastChannel передає тільки session-cleared, без tokens/PII. Cross-tab clear скидає identity і cache; для нового входу/відновлення в іншій вкладці потрібна явна дія або reload. Без Web Locks доступний single-flight лише в межах вкладки; multi-tab rotation fallback потребує окремої перевірки браузерів, не є заявленою абсолютною гарантією.

Session generation counter відкидає запізнілі responses після logout/account change; private controllers скасовуються. Login очищає попередній identity/cache до спроби, тому failed login не залишає чужий профіль. Logout відразу очищає memory/cache, потім відкликає cookie session. Якщо server revoke не підтверджений, є повідомлення й кнопка повтору; це не видається за успішний серверний logout. Refresh не повторюється автоматично після ambiguous network failure.

Zustand API SessionIdentity містить identity/assigned roles, **не вигадані XP, hours чи points**. SessionUser demo-модель лишилася в fixture path. Guards чекають bootstrap, розрізняють network failure й anonymous, перевіряють усі assigned roles. `/profile` і `/passport` — власна identity будь-якої authenticated ролі, не штучний VOLUNTEER-only privilege. Решта permissions остаточно на backend; organization capability model ще чекає наступного wiring.

Public URLs запитують public endpoints з auth=none навіть коли власник залогінений. Private passport не підмішується в public view. Identity/visibility mutations видаляють cached public projections до invalidation, щоб попередньо дозволені поля не відновилися з cache після зміни приватності. Редагування primaryRole обмежене реальними assigned roles і backend validation.

## Queries та invalidation

Один `apiQueryClient`, 30 секунд staleTime. Queries повторюються максимум один раз лише для network/502/503; не 401/403/404/409/422/429 і не abort. Mutation retry=false. Query keys:

- `['api','private',userId,'user'|'preferences'|'passport'|'progression'|...]`;
- `['api','public','user'|'passport',subjectId]`;
- activities додають server page.

Profile PATCH: set current user cache, оновити session name/avatar/primaryRole, invalidate private identity prefix та public projections. Preference PATCH: cache preferences, очистити public profile/passport, invalidate own/private dependencies. Logout/account switch: cancelQueries + clear весь API QueryClient, включно з mutation cache; запізнілий response не повертає private data. Demo repository subscription працює лише на окремий demoClient, API cache не інвалідовується локальними командами.

Профіль відображає серверні passport previews achievements, skills і team/org experience. Він не викликає локальні calculators/unlock logic. History має справжню server pagination. Назви skill definitions завантажуються окремо; не вигадуються з кількості квестів. Full skill evidence/achievement catalogs, ledger UI і паспортні receipts/print/export — наступні окремі сценарії.

## Mock migration / changed files

Нові:

- `src/shared/api/{config,contracts,errors,client,query-client,users,header-identity}.ts`, `query-feedback.tsx`;
- `src/features/auth/api/{session.ts,bootstrap.tsx}`;
- `src/features/auth/mock-auth-adapter.ts`, `src/features/session/demo-store.ts` — збережений legacy path;
- `src/features/profile/api/{hooks.ts,edit-dialog.tsx,preferences.tsx,profile-page.tsx}`;
- `src/app/api-routes.ts`, `src/app/api-route-feedback.tsx`;
- `.env.example`, цей документ.

Змінені:

- `features/auth/auth-adapter.ts`, `features/session/store.ts`: mode-specific composition;
- `app/providers.tsx`: API QueryClient/bootstrap vs demo subscription;
- `features/auth/protected-route.tsx`, `pages/auth-page.tsx`: реальна сесія, password registration, bootstrap/error/assigned role UX;
- `features/auth/demo-switcher.tsx`, `features/gamification/level-up-dialog.tsx`, `shared/ui/platform-toast.tsx`: API-mode guard навколо legacy demo components;
- `app/router.tsx`: route configuration transformation для rollout gate;
- `app/layouts/public-layout.tsx`: **лише замінено імпорт hook для identity header/mobile menu**, без змін JSX/CSS/navigation. Цей один data binding потрібен, щоб реальний користувач не відображався як anonymous через відсутність у demo repository.

У перенесених API flows немає викликів mock auth/profile mutation/getVolunteer/achievement calculators. Mock files/tests/Storybook fixtures не видалені. Через статичні imports решти legacy router modules mock repository ще може ініціалізувати власний browser fixture namespace; він не є API cache, не читається API profile/session, не завантажується до сервера й не використовується як network fallback. Повне усунення legacy imports/bundle — після міграції всіх доменів, не заявлено виконаним тут.

Backend, залежності, migrations, реальні `.env` та seed не змінені цим frontend етапом. Existing tests не редагувалися. У Vitest MODE=test default demo збережено; окремі API integration tests мають явно встановити VITE_DATA_SOURCE=api. Тести цього режиму ще не додані/не запускалися; проходження старих demo tests не доводить HTTP інтеграцію.

## Configuration та PWA handoff

Локально створити власний `.env.local` з публічними налаштуваннями (агент його не створював):

```dotenv
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://localhost:3000/v1
```

Frontend поточний Vite port=5173. Backend CORS_ORIGINS має містити exact frontend origin, credentials дозволені, для local HTTP COOKIE_SECURE=false; SameSite=lax працює між localhost ports як same-site. Не змішувати localhost та 127.0.0.1 для cookie. Existing Vite proxy налаштовано на `/api`, **не** `/v1`: використовувати явний local API URL вище або узгоджений reverse proxy, без тихого припущення про proxy rewrite.

Production: HTTPS frontend/API, backend COOKIE_SECURE=true та належний SameSite, exact CORS origin. Для cross-site deployment SameSite=None потребує Secure і може залежати від third-party cookie policy; переважний same-site API/reverse proxy. VITE_API_BASE_URL=https://api.<domain>/v1 або /v1 на тому самому origin з маршрутизацією до API. Немає hardcoded localhost у runtime code та серверних secrets у VITE_*.

Standalone PWA використовує той самий fetch/cookie transport; token не переноситься в manifest/localStorage. При reload потрібний online refresh. В offline стані не симулюємо authenticated identity або success фінансових mutations. HTTP cache=no-store не замінює Service Worker policy: **PWA-тіммейт має виключити auth/private/API responses із SW caches** та не повертати app-shell HTML на API URL. Policy/manifest/service worker агент не редагував. На момент аудиту знайдено поточний Vite config; manifest/SW файлів у перевіреній frontend структурі не було. Паралельні майбутні зміни потрібно звірити під час handoff.

Layouts/header/mobile markup, responsive cards/forms/charts, CSS/design tokens не переписувалися. Єдиний data-hook import у PublicLayout описано вище. Нові API identity компоненти використовують наявні Card/Badge/Dialog/Input/Button і CSS-класи; їх адаптивний polish треба звірити з PWA-тіммейтом. Footer поки має старий статичний demo caption; його copy належить спільному layout handoff, серверні дані через цей caption не фільтруються.

## Наступні межі та backend gaps

1. **Quests + Applications/Verification**: замінити mock QuestCard snapshot lookup, підключити server filters/pagination, org-scoped selectors, UUID applications/participations/reports і ISO schedule; прибрати gate лише коли працює весь workflow.
2. Impact/receipts; потім Missions/Challenges із server progress/claims, slug→UUID resolution, query invalidation після verification.
3. Teams/memberships/invites/team applications з immutable attribution; не приписувати поточній команді всю історію людини.
4. Повні Skills/Achievements/Passport pages/credentials, каталог skill names/evidence/print; read-only previews у профілі вже серверні.
5. AI із збереженням operation key, explicit failures і server draft conversion; не викликати paid provider під час розробки.
6. Rewards із backend stock/balance, idempotency, fulfillment/refund; frontend mock code не є production redeem secret.
7. Organizations/Admin; не вигадувати platform counters або users directory. Global volunteer leaderboard, admin users directory/platform statistics не знайдено — потрібні мінімальні backend доповнення або погоджене обмеження UI на відповідному етапі. Не додавалися наперед.

## Ручна перевірка користувачем

Команди агент **не запускав**:

```sh
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web test
# За потреби окремо project TypeScript:
pnpm --filter web exec tsc -b --pretty false
```

Після самостійного запуску чинного backend/frontend без повторного seed:

1. API mode, правильний local CORS/cookie origin. Переконатися, що request IDs/error envelope видимі й жоден token не зберігається в localStorage/IndexedDB.
2. Login на існуючому PostgreSQL seed account зі справжнім explicit fixture password, не `dnipro-demo`. Register нового VOLUNTEER; неможливо призначити ORGANIZER/ADMIN з payload UI.
3. Reload → одна refresh rotation; кілька одночасних private queries → single-flight. Дві вкладки/Web Locks; logout/refresh race; не повертати старий user/cache після завершення повільного запиту.
4. Profile edit/name/bio/HTTPS avatar, primaryRole тільки зі списку assigned roles; server 422/403 відрізняються від network failure. Невдала mutation не показує локальний success.
5. Перевірити null verified hours і unknown count на користувачі без виміряного часу; відсутні indicators не дорівнюють zero. XP/balance/achievements збігаються з API response, local repository зміни не впливають.
6. Privacy flags → public profile/passport в іншій вкладці/анонімному браузері; public URL власника теж public. Cached public view після privacy edit не показує старих private fields.
7. Activities pagination, empty page, unknown time, disabled previous/next на межах.
8. Offline/недоступний API/503/CORS failure → error + retry; 429 без автоматичного повтору; ніяких demo статистик замість помилки.
9. Logout скидає user/query/mutation cache. Зімітувати failed logout request: видно незавершене server revoke й можна повторити. Reload після успішного logout не повертає стару сесію.
10. Demo mode окремо у development: старі fixtures/scenarios залишилися. Production demo mode відмовляється запускатися.
11. Перевірити на 320px, desktop та standalone PWA; приватні API responses не потрапляють у SW cache (policy перевіряє PWA-тіммейт).
12. У API mode неперенесені quests/rewards/organizer/admin тощо показують rollout gate. Це критерій чесного часткового rollout, **не** приймання повної інтеграції.
