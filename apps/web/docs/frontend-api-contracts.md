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

## EPIC 04: versioned handoff

See [DX-028 backend handoff](backend-integration-handoff.md) for the proposed `/v1` namespace, generation DTOs and canonical nested error envelope, which supersedes this earlier flat-error proposal. All listed domain endpoints remain planned, not implemented. Reports now also support optional `actualHours`; missing hours are unknown, never planned duration. See [EPIC 04 implementation](product-integration.md).
