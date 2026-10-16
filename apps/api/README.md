# DniproXP API

NestJS 12 + PostgreSQL 17 + TypeORM. BE-01 додає `/v1` authentication, profiles, organization scope/moderation, audit, health та optional Swagger. Frontend поки використовує власний demo repository.

Повна інструкція, ENV, endpoint catalog, міграція та seed: [Backend foundation](docs/backend-foundation.md).

Node >=24, pnpm 10. Заповніть ignored `.env` за `.env.example`; не зберігайте credentials у Git. Міграції та demo seed запускаються тільки явно; `synchronize` і автоматичні міграції вимкнені. CLI використовує compiled `dist`, тому потрібний попередній build.

Цей етап не запускав build/tests/lint/typecheck/server або міграції. Код потребує перевірки перед deployment.

BE-02: [Quest lifecycle, applications, reports, verification та immutable ledger](docs/be-02-quest-engine.md). Foundation migration збережено; нова migration застосовується після неї. Frontend не переключений на API.
