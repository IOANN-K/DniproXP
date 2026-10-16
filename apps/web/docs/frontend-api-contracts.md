# Контракти майбутнього frontend API

Це очікувані контракти, а не реалізовані серверні endpoints. NestJS та PostgreSQL не змінені. Поточні адаптери: `features/auth/auth-adapter.ts`, `mocks/api.ts`, `mocks/organizer-api.ts`; усі вони використовують один `mocks/repository.ts`.

## Авторизація

- `POST /auth/register`: ім’я, email, пароль, роль `VOLUNTEER | ORGANIZER`; для організатора — назва організації. Роль `ADMIN` не доступна через реєстрацію.
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`: серверна сесія та поточний користувач з роллю й `organizationId`.
- `GET /users/:id`, `PATCH /users/me`: публічний профіль та зміна власних основних даних.

Поточна демонстрація має спільний відкритий код `dnipro-demo`, локальні облікові записи та frontend route guards. Вона не забезпечує production-безпеку. Майбутній backend повинен сам автентифікувати користувача й перевіряти права на кожному endpoint; demo-перемикач і системна підготовка демосценарію до production API не належать.

## Квести та організації

- `GET /quests?search&category&district&date&difficulty&minXp&sort&page`: тільки видимі публікації схвалених організацій.
- `GET /quests/:id`, `GET /organizations`, `GET /organizations/:id`.
- `GET /organizer/quests`, `POST /organizer/quests`, `PATCH /organizer/quests/:id`: доступ тільки власній організації.
- `POST /organizer/quests/:id/publish`, `/start`, `/complete`, `/cancel`: окремі контрольовані переходи.

`Quest`: id, organizationId, title, description, fullDescription, categoryId, district, address, date (ISO з часовим поясом), duration, capacity, difficulty, xp, rewardPoints, image, requirements[], bring[], instructions, coordinates nullable, coordinateSource, lifecycle, moderation, moderationReason, createdAt, updatedAt.

`lifecycle`: `draft → published → active → completed`; `draft | published | active → cancelled`. Чернетки можуть бути неповними. Публікація вимагає повних полів, майбутньої дати й схваленої організації. Нові публікації очікують модерації. Зміна умов до першої заявки повертає квест у чернетки; після першої заявки редагування умов заблоковане. Перед завершенням події всі заявки та участі мають бути врегульовані. Скасування зберігає вже підтверджені внески.

`moderation`: `pending | approved | rejected`. Організація має `pending | approved | suspended`. Приховування не видаляє історію. Квести без перевірених координат не отримують маркерів.

## Участь і звіти

- `POST /quests/:id/participations`, `GET /users/me/participations`, `POST /participations/:id/cancel`.
- `GET /organizer/quests/:id/participations`.
- `POST /organizer/participations/:id/approve`, `/reject` (причина обов’язкова).
- `POST /participations/:id/report`: текст 30–2000 символів та посилання на вкладення.
- `POST /organizer/participations/:id/confirm`, `/reject-report` (причина обов’язкова).

`Participation`: id, questId, userId, applicationStatus (`pending | approved | rejected`), status (`planned | active | pending | completed | cancelled`), applicationReason, report, reportHistory[], reportRejectionReason, awardedXp, awardedPoints, confirmedAt, createdAt, updatedAt.

Нова заявка має `planned + applicationStatus: pending`. У демосценарії схвалення одразу активує участь; реальний backend має враховувати час початку. Подання звіту переводить `active → pending`, без нагороди. Повернення звіту: `pending → active` із причиною та можливістю повторної подачі. Підтвердження: `pending → completed` із єдиним нарахуванням. Відхилення заявки забороняє повторне подання на той самий квест; добровільно скасовану заявку можна подати знову за наявності місць.

Нарахування XP, бонусних балів, завершення участі й журнал транзакцій мають записуватися атомарно. Унікальний ключ `(userId, questId, completion)` забезпечує ідемпотентність; повторне підтвердження повертає попередній результат. Backend перевіряє належність квесту організації та право переглядати звіти.

## Прогрес і винагороди

- `GET /users/me/dashboard`, `/transactions`, `/achievements`.
- `GET /leaderboard?period=week|month|all&sort=xp`: тільки підтверджені XP за визначений період; у frontend це останні 7/30 днів.
- `GET /rewards?category&available&affordable&sort`, `GET /rewards/:id`.
- `POST /rewards/:id/redemptions`, `GET /users/me/redemptions`.

XP накопичується й визначає рівень; Reward Points витрачаються окремо. `Transaction`: id, userId, questId/rewardId, xp, points, date, description. `Redemption`: id, userId, rewardId, cost, code, date. Обмін атомарно перевіряє баланс, залишок та унікальність отримання, списує тільки бали й створює сертифікат. Потрібен idempotency key; реальних платежів немає.

## Модерація та помилки

- `GET /admin/overview`, `/users`, `/organizations`, `/quests`.
- `POST /admin/quests/:id/moderation`: approve/reject + причина відхилення.
- `POST /admin/organizations/:id/moderation`: approve/suspend + причина призупинення.

Очікувані помилки: 401 — немає сесії, 403 — не та роль/організація, 404 — сутність недоступна, 409 — місця зайняті або конфлікт переходу/повторного обміну, 422 — помилки полів. Формат: `{ code, message, fieldErrors?, currentRevision? }`. Після мутацій клієнт оновлює snapshot і інвалідує пов’язані запити; backend повинен повертати актуальні сутності та баланси.

## EPIC 02 — сюжетні місії та міські виклики

Поточні адаптери: `mocks/missions-api.ts` (`MissionsRepository`) та `mocks/challenges-api.ts` (`ChallengesRepository`). Усі мутації використовують той самий snapshot. Query hooks у `features/mission-progress` та `features/challenge-progress` можуть бути переключені на HTTP-адаптери без зміни чистих доменних обчислень.

- `GET /missions?search&category&difficulty&status&sort`: каталог `QuestChain`; неопубліковані визначення доступні тільки ADMIN.
- `GET /missions/:slug`: місія, її етапи та передумови.
- `GET /users/me/missions`, `GET /missions/:id/progress`: особистий `QuestChainProgress`, а не глобальний lifecycle.
- `POST /missions/:id/enrollments`: додати місію до власного простору; не створює verified activity.
- `POST /missions/:id/reward-claims`: атомарно перевірити всі основні етапи/передумови, видати додаткові XP, Reward Points і відзнаку; повтор повертає попередню видачу.
- `PUT /admin/missions/:id`: збереження визначення; перевірити ID, посилання та цикли між місіями й між етапами до запису.
- `GET /challenges?search&category&status&sort`, `GET /challenges/:slug`: `CityChallenge`, цілі та фактичний `ChallengeProgressResult`.
- `GET /challenges/:id/contributions?metric&cursor`, `GET /challenges/:id/leaderboard`, `GET /challenges/:id/participants?cursor`: підтверджені внески, рейтинг особистих годин та учасники. Cursor-пагінація — майбутній HTTP-контракт; mock зараз повертає колекції й UI показує їх порціями.
- `GET /challenges/:id/contributions/me`: особисті години/квести та окремо спільні результати відповідних квестів.
- `POST /challenges/:id/participants`: долучення без штучного внеску.
- `POST /challenges/:id/reward-claims`: лише після всіх основних цілей та за наявності власного підтвердженого внеску у визначений період; один фінальний бонус на користувача.
- `PUT /admin/challenges/:id`: перевірка цілей, одиниць, позитивних порогів, явних зв’язків із квестами та ролі.

`QuestChain`: id, slug, title, shortDescription, description, coverImage, category, difficulty, organizationId, steps[], prerequisites `{ chainIds, questIds, minLevel }`, rewards `{ xp, rewardPoints, achievement }`, status, startsAt/endsAt nullable, estimatedDuration. Глобальні статуси: `DRAFT | PUBLISHED | ACTIVE | COMPLETED | ARCHIVED`. `QuestChainStep`: id, chainId, questId, title, description, order, isOptional, prerequisiteStepIds[]. Особисті статуси місії/етапів: `LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED`. `QuestChainProgress` додатково містить required/optional counts, percentage, nextStepId, completedAt, rewardClaimed, reasons, enrolled. Бонусний етап не може бути передумовою основного. Ретроспективні підтвердження в межах дат зараховуються.

`CityChallenge`: id, slug, title, description, coverImage, category, organizationId, startDate, endDate, status, goals[], relatedQuestIds[], participantIds[], rewards, createdAt. Статуси: `DRAFT | UPCOMING | ACTIVE | COMPLETED | EXPIRED | CANCELLED`; completion визначається всіма обов’язковими цілями, а не ручним виставленням довільного 100%. `CityChallengeGoal`: id, metric, targetValue, unit, description, isOptional. Канонічні одиниці: `VOLUNTEER_HOURS → год`, `LITTER_KG → кг`, `TREES_PLANTED → дерев`, `HUMANITARIAN_UNITS → од.`.

`ChallengeContribution`: id, challengeId, goalId, userId, questId, participationId, verifiedActivityId, impactRecordId?, metric, value, unit, occurredAt, scope `PERSONAL | QUEST`. Особистий час відокремлений від спільного результату квесту. У колективному записі userId — provenance перевірки, не особиста власність на весь результат. Один квест може містити різні метрики. Заборонено множити спільний результат на кількість волонтерів або додавати несумісні одиниці. Пороги й фактичні суми зберігаються точно; тільки UI обмежує індикатори 100%.

У mock окремого ImpactRecord/Submission немає: `VerifiedActivity` — адаптер completed-участі, confirmedAt та відповідної базової транзакції; `QuestImpactMeasurement` — явно демонстраційне колективне вимірювання, активоване підтвердженням. Backend має замінити його довіреними verified impact records, а не приймати довільні числа клієнта. Teams відсутні; чистий helper уже може агрегувати явний список членів майбутньої команди.

`Transaction` розширено `kind: QUEST_COMPLETION | REWARD_REDEMPTION | MISSION_REWARD | CHALLENGE_REWARD` і `sourceId`; у старих записах kind/sourceId можуть бути відсутні. Базовий completion має questId та sourceId участі. Фінальні бонуси мають sourceId місії/виклику і не мають questId. Унікальність на backend: `(kind, sourceId, userId)`. Локальні ключі: `completion:<userId>:<questId>`, `mission:<chainId>:<userId>`, `challenge:<challengeId>:<userId>`. Contributions унікальні на `(challengeId, goalId, verifiedActivityId)` для особистих годин або `(challengeId, goalId, impactRecordId)` для спільних вимірювань. Рейтинг XP враховує фінальні бонуси; кількість квестів — тільки підтверджені квести.

Підтвердження участі та базова нагорода залишаються атомарними. Похідний перерахунок місій/викликів має бути ідемпотентним; claim нагороди потребує серверної транзакції/unique constraint. Після підтвердження або claim повертаються актуальні баланси, прогрес, відзнаки та revision; клієнт інвалідує dashboard/profile/leaderboard/quests/missions/challenges. Рекомендовані помилки: 409 — вже отримано/неправильний lifecycle; 422 — циклічні передумови, несумісна одиниця, від’ємний вимір, некоректний зв’язок; 403 — чужий профіль або недостатня роль. Повторний ідентичний claim краще повертати як успішний попередній результат.

Деталі політики та ручне проходження: [EPIC 02](epic-02-missions-challenges.md).
