# BE-03 — City Impact, Missions, City Challenges

## Стан реалізації та межі

Реалізовано в `apps/api` поверх BE-01/BE-02. Frontend, його mock repository, тести й попередні міграції не змінені. Нових залежностей немає. Build, lint, tests, typecheck, сервер, Docker, міграції та seed **не запускалися**. Описані нижче гарантії — властивості реалізації, які ще потрібно перевірити на PostgreSQL, а не результати виконаних перевірок.

Нові модулі: `ImpactModule`, `MissionsModule`, `ChallengesModule`, спільний `ProgressModule`. Останній експортує `DefinitionService`, `ProgressService`, `MissionProgressEngine`, `ChallengeProgressEngine`, `RewardClaimsService`, `VerifiedProgressService`. Він залежить від існуючого `LedgerModule`; зворотної залежності від Participations немає.

Ключові файли:

- `src/impact/impact.entity.ts`, `impact.service.ts`, `impact.dto.ts`, `impact.controller.ts`, `impact.module.ts`;
- `src/progress/domain.ts`, `definition.entity.ts`, `definition.service.ts`, `progress.dto.ts`, `progress.service.ts`, `reward-claims.service.ts`, `verified-progress.service.ts`, `progress.module.ts`, `sql.ts`;
- `src/missions/mission-progress.engine.ts`, `missions.controller.ts`, `missions.module.ts`;
- `src/challenges/challenge-progress.engine.ts`, `challenges.controller.ts`, `challenges.module.ts`;
- `src/database/migrations/1792281600000-verified-progress.ts`, `src/database/progress-seed.ts`;
- інтеграція: `app.module.ts`, `main.ts`, `database/typeorm.config.ts`, `database/seed.ts`, `database/quest-seed.ts`, `participations/verification.service.ts`, `participations/participations.module.ts`, `quests/domain.ts`, `ledger/ledger.service.ts`.

## Джерело правди та транзакції

Потік: approved report → completed participation → дві QUEST_COMPLETION проводки існуючого ledger → immutable VerifiedActivity → immutable ImpactEvent + ImpactReceipt → verified progress → AuditLog. Усе виконується **в одній verification transaction**.

`verified_to_impact` — AFTER INSERT PostgreSQL trigger на `verified_activities`. Він копіює snapshot району, категорії, організації та часу з джерела, а не з поточної картки квесту. Кожен source має unique event і receipt. Навіть інший довірений запис VerifiedActivity через ту саму БД не пропустить Impact-проєкцію. Попередні deferred verification/ledger consistency triggers BE-02 залишаються чинними; якщо будь-яка перевірка чи Audit падає, всі нові записи відкотяться.

Після insert VerifiedActivity `VerificationService` викликає `VerifiedProgressService.process` із тим самим EntityManager. Він записує нові mission completions та challenge milestones. Жодної in-memory доставки чи фонового worker немає. Progress читається з immutable sources та SQL views, тому не залежить від запізнілих mutable counters. Повторне approval повертає первісний результат BE-02 і не створює подій чи нагород повторно.

Визначення, опубліковане після старих verification, одразу бачить ці джерела у read projection. Історичні completion/milestone records матеріалізуються при наступному verification, відповідному claim або явному demo seed. GET не виконує прихованих записів. Claim завжди повторно перевіряє джерела і записує потрібний completion у власній транзакції.

## Відповідність frontend-контрактам

Аудитовані джерела: `apps/web/src/entities/impact/{types,domain,verification}.ts`, `entities/mission/{types,progress,validation}.ts`, `entities/challenge/{types,progress,validation}.ts`, `mocks/{repository,missions-api,challenges-api}.ts`, відповідні pages та frontend API contracts.

- Frontend `VerifiedActivity.id = completion:<user>:<quest>` відповідає BE-02 `sourceEventId`; серверні FK посилаються на окремий UUID VerifiedActivity. Unique user/quest completion BE-02 зберігає логічну ідентичність.
- `ImpactRecord` individual → `ImpactEvent`, з приватним `ImpactReceipt`; `userId` відповідає `participantUserId`. `occurredAt` і `verifiedAt` — момент підтвердження, як у frontend verification flow, а не запланований час квесту. `verifiedMinutes = null` не замінюється duration із розкладу.
- Collective `ImpactRecord`/`QuestImpactMeasurement` → versioned `CollectiveMeasurement` + `current_collective_impact` view. Фізичний результат належить квесту, а не користувачу, через якого підтверджена його provenance.
- `QuestChain` → `MissionDefinition`. Повертаються ті самі steps, `chainId`, prerequisites, rewards, timeframe, shortDescription, difficulty, estimatedDuration та lifecycle. Нормалізовані FK links доповнюють validated JSON rules.
- `ChainProgress` → `MissionProgressDto`: required/optional counts, percentage, statuses, nextStepId, reasons, completedAt, rewardClaimed, enrolled. У frontend enrollment та manual claim уже існують; backend зберігає цей workflow. Бонус не нараховується за enrollment.
- `CityChallenge` → `ChallengeDefinitionDto`. Explicit relatedQuestIds та goals збережені; додано необов’язкові category/district/organization scopes і milestones. Публічне визначення не розкриває participantIds: їх замінено counts та окремим privacy-aware leaderboard.
- `ChallengeProgressResult` → `ChallengeProgressDto`, власний внесок → `UserChallengeDto`. Особисті hours/quests відокремлені від спільних physical goals. Public API не повертає raw contributions/participants із прихованими user IDs.
- `MissionReward`/`ChallengeReward` → immutable `ProgressRewardClaim`: XP, Reward Points, badge snapshot, proof IDs і claimedAt. Немає окремого XP balance; `/users/me/progression` та ledger history BE-02 автоматично бачать нові проводки. Badge доступний у claim; загальний achievement catalog/profile integration не додавався в BE-01 і залишається окремим наступним адаптером.

Frontend UUID/slug identity adapter до HTTP ще не підключений: detail endpoints приймають серверні UUID, slug є полем каталогу. Немає вигаданого TEAM mission типу, repeatability чи автоматичного claim, яких немає в поточному frontend. Одна нагорода на визначення та користувача; для нового сезону створюється нове визначення.

## Impact: формули та provenance

Особисті джерела — тільки committed verified activities. Кількість внесків = COUNT events, волонтери = DISTINCT participantUserId; completedActivities = DISTINCT questId серед відібраних individual events та поточних collective measurements. Це квести з підтвердженим результатом, а не лічильник lifecycle='completed'. ContributingOrganizations = DISTINCT snapshot organizationId за тими ж джерелами: «активність у періоді», а не поточний статус акаунту організації.

Години = SUM відомих verifiedMinutes / 60, для Impact display округлення до двох знаків як у frontend. `unknownMinutesCount` позначає неповноту суми. Якщо відомих хвилин немає, hours = null; counts = 0 за порожньої вибірки. XP/Reward Points не конвертуються у час.

Фізичні метрики: waste_kg/kg, trees_planted/count, animals_helped/count, people_helped/count, area_cleaned/m2. `humanitarian_units/units` додано окремо для challenge HUMANITARIAN_UNITS; це не people_helped і не довільна конверсія людей у набори допомоги. Count/units мають бути цілими, усі значення 0..1 000 000, десяткові максимум 6 знаків. Виміряний 0 зберігається; відсутній вимір = null. `metrics` у summary містить фізичні метрики, volunteer_hours подані окремим verifiedHours.

Організатор із scoped verify capability передає **загальне значення** метрики квесту, summary, operationId та expected supersedesId. Потрібні схвалена організація/модерація квесту й хоча б одна VerifiedActivity цього квесту. Новий запис зберігає reviewer, immutable source та snapshot dimensions. Для виправлення додається нова версія; старий запис не перезаписується. Root unique(quest,metric) та unique supersedes не допускають паралельних гілок. Quest/org lock + optimistic supersedesId відхиляють застарілу редакцію.

Агрегати беруть лише останню версію кожної quest/metric. Не множать результат на кількість receipts, волонтерів або команд. Власний Impact не привласнює collective виміри користувачу: фізичні поля в ньому null. Receipt містить лише особисті підтверджені метрики на момент issuance; пізні виміри квесту не змінюють receipt.

`from`, `to` — включні календарні дні Europe/Kyiv. SQL перетворює їх у [локальна північ from, локальна північ після to), з урахуванням DST. Individual відбирається за verifiedAt, collective — за measuredAt поточної версії; дедуплікація версій передує фільтруванню, як frontend selectImpact. Trends повертають дні, що мають individual events, counts і відомі години; відсутні дні не заповнюються синтетичними вимірами. `district`, `category`, `organization` фільтрують snapshot dimensions. Дані не беруться з поточних назв районів/категорій квесту.

Summary + trends читаються в одному REPEATABLE READ snapshot; districts/categories — SQL GROUP BY. Немає N+1 обходу профілів чи квестів у агрегатах.

## Missions: правила прогресу

Required step завершений лише коли користувач має VerifiedActivity пов’язаного квесту в [startsAt, endsAt], якщо межі задані. Optional step не блокує основну мету. Заявки й непідтверджені/rejected reports не є completion; application може лише показати IN_PROGRESS для майбутнього етапу.

Eligibility: minLevel із чинного ledger/LEVELS, усі prerequisite questIds (за весь час), усі prerequisite chainIds мають computed COMPLETED. Completion = усі required steps + eligibility + визначення не DRAFT. Процент = requiredCompleted / requiredTotal × 100. RequiredTotal >0 перевіряється під час збереження. CompletedAt — найпізніше підтвердження required steps, як у frontend, навіть якщо інша передумова задоволена пізніше.

Dependency DAG валідовано для step IDs і mission dependencies під advisory lock definitions. Не допускаються self/cyclic/missing dependencies, повторні quest/order/step IDs, залежність required від optional. Prerequisites лише блокують майбутній прохід; раніше підтверджений квест не втрачається через порядок подання. Доступність майбутнього квесту використовує BE-02 approval/lifecycle/endAt та ту саму формулу зайнятих місць; реальний запис усе ще перевіряє BE-02 application service під своїми locks.

Нові етапи відкриті лише PUBLISHED/ACTIVE в поточному timeframe. ARCHIVED/COMPLETED закривають нові етапи, але не видаляють уже підтверджений прогрес або право на зароблений claim. Ручне admin complete — закриття історії, не примусове виконання всім волонтерам. Unique(user,mission) completion immutable, з evidence UUID required steps і prerequisite sources; одноразовий claim не залежить від enrollment.

## Challenges: правила прогресу

Eligible activity = explicit relatedQuestId, відомі verifiedMinutes, occurredAt у включних [startDate,endDate], відповідність додатковим snapshot scopes. DRAFT/CANCELLED виключені. Невідомий час усе ще існує в Impact, але не є eligibility-доказом challenge — узгоджено з frontend challengeActivities, що вимагає finite hours.

VOLUNTEER_HOURS = сума кожного eligible особистого джерела /60. LITTER_KG, TREES_PLANTED, HUMANITARIAN_UNITS = latest confirmed total метрики для квесту, який має хоча б один eligible source. Anchor — найраніша eligible verification (tie: UUID); її userId є provenance, не власником фізичного результату. Час віднесення collective до challenge визначається anchor, як frontend challengeContributions; вимір не зобов’язаний бути внесений у той самий timeframe. Для Impact period views, навпаки, застосовується фактичний measuredAt.

Один quest може належати кільком challenges; у кожному має окреме зарахування, але в межах одного challenge/goal одна current measurement рахується рівно один раз. View IDs детерміновані від definition/goal/source; underlying event і measurement IDs зберігаються в immutable completion/claim evidence для відтворення після corrections. Claim також містить власний eligible source, навіть якщо фізичний результат має іншого anchor-волонтера.

Goal complete = SUM >= target, без округлення display перед порівнянням. Percentage goal = min(100,SUM/target×100); actualValue не обрізається target. Overall percentage = min required goal percentages; complete = усі required. Немає обов’язкових цілей — невалідне визначення. Без відомих джерел actualValue/hours = null (frontend mock використовує 0; HTTP адаптер має відобразити unavailable, а не вигадувати вимір). Optional unknown не блокує required completion.

Computed status: DRAFT/CANCELLED → сам status, інакше complete → COMPLETED, інакше before start → UPCOMING, after end → EXPIRED, решта ACTIVE. У публічному каталозі, detail та own responses challenge.status відповідає computed progress.status. Admin responses показують lifecycle збереженого визначення; progress.status — стан за джерелами та поточним часом. Запис 'COMPLETED' не підмінює формулу.

ParticipantCount = UNION добровільно joined user IDs та eligible contributors; contributorCount = DISTINCT eligible user IDs. Особистий внесок — тільки власні відомі години та distinct quests. Рейтинг: SUM verifiedMinutes DESC, distinct quests DESC, UUID ASC; rank послідовний. SQL paging + counts у REPEATABLE READ дає узгоджену сторінку; offset між різними HTTP запитами може зсунутися після нового внеску.

Milestones — унікальні пороги 1..100, обов’язково 100; default [25,50,75,100]. Досягнуті пороги записуються один раз з immutable source IDs. 100% record є історичним completion challenge. Від’ємна correction current measurement може зменшити поточний progress: currentlyMet стане false, але історичний reachedAt, completion evidence і вже видані rewards не стираються. Після CANCELLED нові claims неможливі; retry раніше виданого повертає первісний claim. Автоматичного XP clawback немає.

## Нагороди, concurrency та replay

Claims серіалізуються recipient user row lock. Після нього — definition FOR NO KEY UPDATE; усі challenge definitions для milestone reconciliation блокуються в UUID порядку. Цей режим узгоджує status updates і не блокує FK KEY SHARE інших completion inserts. Verification зберігає BE-02 org → quest → application → participation → report → recipient порядок, потім progress locks; claims не беруть org/quest write locks. Collective measurement бере org → quest → challenge locks. Admin authoring використовує окремий transaction advisory lock та не бере recipient locks.

XP і Reward Points видає тільки LedgerService.awardProgress: MISSION_REWARD / CHALLENGE_REWARD, sourceType mission/challenge, sourceId definition UUID, ключ `<kind>:<definitionId>:<userId>:<currency>`. Суми беруться з server definition, не з request. Опубліковані definition rules, rewards, badge, scope і dates заморожені DB trigger; редагування можливе лише у DRAFT, новий сезон — новий UUID.

Unique(kind,definition,user), дві ledger проводки, immutable claim/badge/evidence, audit — одна transaction. Deferred triggers вимагають обидві валюти, точний server amount, badge та mission completion. Generated FK columns на claim захищають polymorphic definition reference від видалення. Існуюча semantics QUEST_COMPLETION, compensation, spending та reward_accounts INSERT trigger не змінювалася; рахунок не оновлюється вручну. Claim retry повертає ту саму issuance, не повторний append.

Виплата mission потребує computed COMPLETED; challenge — complete спільних required goals і власного eligible внеску. Після bonus XP engine може відкрити місії з новим minLevel. Не можна отримати points за enrollment/join/GET або довільно записати progress через HTTP.

## Приватність і права

Публічні aggregate endpoints повертають counts, години, виміряні totals без user IDs. Історичні підтверджені джерела залишаються в анонімних totals, навіть якщо власник згодом приховав профіль або організація змінила модерацію. Public organization detail доступний лише зараз approved organization.

Receipt detail/list — JWT owner only; навіть ADMIN не отримує чужий приватний receipt цим маршрутом. Public verification потребує окремого непередбачуваного UUID reference, ACTIVE власника, publicProfile + showActivityHistory та видимого approved quest/org. Повертає valid, reference, verified/issuedAt і title; хвилини лише за showVerifiedHours, назву організації лише за showOrganizations. Немає userId, report/evidence, source IDs, email, reviewer або імені волонтера.

Leaderboard включає тільки ACTIVE profiles з publicProfile, showDisplayName, showActivityHistory та showVerifiedHours. Немає анонімних рядків, з яких можна відновити hidden профіль. Загальні counts можуть включати приватних учасників; own endpoints читають лише поточного principal. Seed не робить профілі public автоматично, тому новий demo leaderboard може бути порожнім до явної зміни privacy preferences власником.

Адміністративні definitions CRUD/публікація — тільки ADMIN, як наявний frontend admin workflow; scoped організатор не може змінювати правила чи нагороду. Collective measurements — ORGANIZER + ACTIVE scoped OWNER/MANAGER/REVIEWER та approved org. ADMIN сам собою не обходить scoped membership. Own progress — authenticated VOLUNTEER; приватний власний Impact/receipts — будь-який чинний authenticated власник.

## REST та Swagger

Усі маршрути нижче під чинним prefix `/v1`. Response/input classes задокументовані Swagger; standardized `ApiErrors` BE-01 з requestId. Невалідні DTO → 422, malformed UUID path → 400; private/missing resource →404, невідповідна роль/scope →403, несумісний стан/revision/idempotency →409. Unknown input properties заборонені глобально.

Публічні GET:

- `/impact/summary`, `/impact/districts`, `/impact/categories` — ImpactFilterDto;
- `/organizations/:id/impact` — той самий фільтр, organization визначає path;
- `/impact/receipts/public/:reference` — privacy-aware перевірка;
- `/missions`, `/missions/:id`;
- `/challenges`, `/challenges/:id`, `/challenges/:id/progress`, `/challenges/:id/leaderboard`.

Authenticated GET:

- `/users/me/impact`, `/users/me/impact/receipts`, `/impact/receipts/:id`;
- `/users/me/missions`, `/users/me/missions/:id`;
- `/users/me/challenges` (definition, computed progress, enrollment/claim flags, ownHours/ownQuests).

Authenticated commands (VOLUNTEER):

- `POST /missions/:id/enrollments`, `POST /missions/:id/claim`;
- `POST /challenges/:id/participants`, `POST /challenges/:id/claim`.

Scoped ORGANIZER: `GET /quests/:id/impact/measurements` повертає current versions з revision IDs; `POST /quests/:id/impact/measurements` — metric/value/unit/summary/operationId/supersedesId. Value не є delta. Повтор key з іншим payload →409. Response містить source verification/reviewer тільки в цьому scoped маршруті.

ADMIN:

- `GET/POST /admin/missions`, `GET/PUT /admin/missions/:id`;
- `POST /admin/missions/:id/publish`, `/archive`, `/complete`;
- `GET/POST /admin/challenges`, `GET/PUT /admin/challenges/:id`;
- `POST /admin/challenges/:id/publish`, `/cancel`.

PUT — повна заміна draft, не частковий patch. Опубліковані definitions не видаляються через API. List/page defaults: page=1, pageSize=20 (≤100), order=DESC; stable createdAt+UUID sort, search title та category (`all` без фільтра). Leaderboard приймає лише page/pageSize, його порядок фіксований. Receipt list: page/pageSize/order. Join/enroll/claim commands повертають 200, create/measurement —201.

## Схема та міграція

`VerifiedProgress1792281600000` після незмінених Foundation1792108800000 та QuestEngine1792195200000. Реєстрація entities/migration явна в typeorm.config; synchronize та migrationsRun вимкнені. Up/down вимагають active transaction (чинний CLI default); down спочатку блокує source/new tables, щоб перевірка відсутності історії не мала race з verification/claim.

Нові таблиці: impact_events, impact_receipts, collective_impact_measurements; mission_definitions, mission_quest_links, mission_dependencies, mission_enrollments, mission_completions; challenge_definitions, challenge_quest_links, challenge_participants, challenge_milestone_completions; progress_reward_claims. Views: current_collective_impact, challenge_eligible_activities, challenge_contributions. Є UUID/FK/check/unique та user/scope/quest/period indexes. Derived contributions не мають mutable stored counters чи delivery checkpoint, бо обчислюються SQL з committed append-only джерел.

Міграція backfill переносить **лише** наявні verified activities у events/receipts. Для unknown minutes — порожні metrics; жодних awards/фізичних чисел. Видано нові receipt references; існуючі BE-02 ledger/history не змінюються. Append-only UPDATE/DELETE/TRUNCATE guards застосовані до sources, receipts, measurements, completions, milestones, claims та join records.

Down явний, але **відмовляється**, якщо вже є immutable records, receipts, enrollments, milestones, rewards або опубліковані definitions. Він можливий для порожнього/лише draft BE-03 стану. Це навмисний захист references, provenance та фінансової історії; rollback deployed API не означає видалення історії БД. Backfill на непорожній BE-02 БД вже створює історію, отже destructive db:revert там недоступний. Не обходити guards; для корекцій потрібна нова forward migration.

## Demo seed

`database/progress-seed.ts` викликається після чинного seedQuestEngine у тій самій gated development/test transaction/advisory lock. Вимагає BE-01 SEED_* credentials та ALLOW_DEMO_SEED=true; gate не послаблений. Unique be03 seed markers; повтор не перезаписує profiles, moderation, definitions, timeframe, awards, privacy, joins чи історію. Колізії scope не ремонтуються неявно.

Використовує existing completed-eco, completed-social, eco, education fixtures:

- три опубліковані місії: перший eco внесок, social підтримка, city продовження з prerequisite mission та optional educational step;
- два виклики: 10 verified hours (спочатку active) та 2 години (completed на базових 190 відомих хвилинах BE-02); optional 50kg лишається null;
- два волонтери з progress/completion records, доступні enrollment/join та досягнуті milestones;
- receipts створюються автоматично реальним verification trigger, summaries читають ті ж sources.

Дати фіксуються від початкових source timestamps; з часом fixtures можуть expire, seed не пересуває їх. Існуючі операторські дії можуть змінити початковий demo результат, вони зберігаються. Жодних додаткових synthetic verification/report, physical measurements або автоматичного бонусного claim. BE-02 XP/points залишаються тими самими до явного claim користувача.

## BE-04 та відомі обмеження

Кожен волонтер у Teams має породжувати окремий BE-02 VerifiedActivity зі справжнім report/verification. Collective physical source залишається один на quest/metric, його не можна копіювати в кожного учасника. Для team attribution потрібні temporal team-membership snapshots/provenance; читання поточного mutable складу команди не є історичним доказом. Немає team application endpoint чи вигаданого групового mission status у BE-03.

У verified path milestones зараз серіалізуються по всіх опублікованих challenges, у місіях завантажуються всі definition rules та власні sources. Це свідомо простий синхронний механізм без втрати подій, але великі обсяги потребуватимуть вимірювання і звуження affected definitions. SQL batch aggregation вже прибирає N+1 reads на списках/progress reconciliation. Впровадження async вимагатиме transactional outbox, checkpoint, replay та failure handling; in-memory queue недостатньо.

Physical confirmations — scoped підтвердження координатором, не інтеграція з зовнішніми вимірювальними пристроями чи перевірка фотографій. Виправлення не анулює автоматично історичні нагороди; fraud/revocation потребує окремого audited compensating workflow, без зменшення cumulative XP. Public receipt не має PDF/signature export чи окремого permission switch, використовує наявні privacy flags. Немає BE-05 reward redemption API або реальних платежів.

## Самостійна перевірка після review

Ці команди наведено для власника репозиторію, **агент їх не запускав**. Використати isolated PostgreSQL 17 БД та чинний ENV BE-01:

```sh
pnpm --filter api typecheck
pnpm --filter api lint
pnpm --filter api test
pnpm --filter api build
```

Через rootDir `.` у чинному tsconfig зібрані CLI-файли знаходяться під `dist/src`; для явного deployment/migration запуску після build:

```sh
pnpm --dir apps/api exec typeorm migration:run -d dist/src/database/data-source.js
# Опційно, тільки gated development/test environment:
pnpm --dir apps/api exec node dist/src/database/seed.js
# Лише якщо потрібний явний запуск сервера:
pnpm --dir apps/api exec node dist/src/main.js
```

Потрібні PostgreSQL integration/concurrency сценарії: fresh migration та BE-02 backfill; known/unknown hours; trigger rollback; repeated/concurrent approval; private receipt/cross-user access; Kyiv DST/period boundaries; distinct shared result при багатьох волонтерах/challenges; measurement retry/correction race; DAG та frozen rules; active/expired/archived lifecycle; повторний/concurrent claim і дві currency проводки; current progress після downward correction; приховані профілі в leaderboard; user/organization suspension; seed двічі без нових awards; refusal destructive down. Наявні starter tests самі по собі не покривають ці доменні гарантії.
