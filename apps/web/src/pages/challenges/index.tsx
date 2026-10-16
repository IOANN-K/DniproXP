import { challengeStatusLabels } from "../../entities/challenge/presentation";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Flag, HeartHandshake, Users } from "lucide-react";
import { useChallenges } from "../../features/challenge-progress/hooks";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { selectChallengeProgress } from "../../mocks/exploration-selectors";
import {
  CityChallengeCard,
  BossProgress,
  ChallengeStatusBadge,
} from "../../entities/challenge/components";
import type { CityChallengeStatus } from "../../entities/challenge/types";
import { categories } from "../../mocks/data";
import { Card, Badge, Input, Photo } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { SectionHeading } from "../../shared/ui/section-heading";
import {
  ExplorationSkeleton,
  ExplorationError,
} from "../../shared/ui/exploration-states";
export function ChallengesPage() {
  const query = useChallenges();
  const state = useVolunteerState();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "",
    category = params.get("category") || "",
    status = params.get("status") || "",
    sort = params.get("sort") || "progress";
  const set = (key: string, value: string) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  const records = (query.data || []).map((c) => ({
    challenge:
      state.exploration?.challenges.find((item) => item.id === c.id) || c,
    progress: selectChallengeProgress(state, c.id)!,
  }));
  const featured = records
    .filter((r) => r.progress.status === "ACTIVE")
    .sort((a, b) => b.progress.percentage - a.progress.percentage)[0];
  const filtered = records
    .filter(
      (r) =>
        (!search ||
          `${r.challenge.title} ${r.challenge.description}`
            .toLocaleLowerCase("uk")
            .includes(search.toLocaleLowerCase("uk"))) &&
        (!category || r.challenge.category === category) &&
        (!status || r.progress.status === status),
    )
    .sort((a, b) =>
      sort === "participants"
        ? b.progress.participantCount - a.progress.participantCount
        : sort === "date"
          ? Date.parse(a.challenge.endDate) - Date.parse(b.challenge.endDate)
          : b.progress.percentage - a.progress.percentage,
    );
  const groups: [CityChallengeStatus, string, string][] = [
    [
      "ACTIVE",
      "Дніпро діє просто зараз",
      "Об’єднуймо маленькі внески у велику спільну зміну.",
    ],
    [
      "UPCOMING",
      "Наступні можливості для міста",
      "Познайомся з майбутніми цілями та пов’язаними квестами.",
    ],
    [
      "COMPLETED",
      "Нам уже вдалося",
      "Цілі досягнуті завдяки підтвердженим добрим справам.",
    ],
    [
      "EXPIRED",
      "Історії завершеного періоду",
      "Чесно зберігаємо фактичні результати, навіть якщо мети не досягнуто.",
    ],
    [
      "CANCELLED",
      "Скасовані ініціативи",
      "Публічний статус збережено для прозорості спільноти.",
    ],
    [
      "DRAFT",
      "Чернетки викликів",
      "Доступні лише в демонстраційній ролі адміністратора.",
    ],
  ];
  return (
    <div className="container page-section exploration-page">
      <section className="exploration-catalog-hero challenge-catalog-hero">
        <div>
          <Badge>
            <HeartHandshake size={15} />
            СПІЛЬНА МЕТА СИЛЬНІША
          </Badge>
          <h1>
            Маленькі дії.
            <br />
            <span>Велика зміна для Дніпра.</span>
          </h1>
          <p>
            Обирай міський виклик, долучайся до пов’язаних квестів і
            спостерігай, як підтверджені внески наближають нас до спільної мети.
          </p>
          <div className="exploration-hero-links">
            <a href="#challenge-catalog" className="button button-primary">
              Знайти спільну мету <ArrowUpRight size={17} />
            </a>
            <Link to="/missions" className="text-link">
              Сюжетні місії <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="story-hero-note">
            <Users size={21} />
            <span>Реальні обчислення · демонстраційні події та метрики</span>
          </div>
        </div>
        <div className="exploration-hero-art">
          <Photo
            src="/images/nature.jpg"
            alt="Зелений простір — тематична фотографія міського волонтерства"
            fetchPriority="high"
          />
          <div>
            <Flag size={25} />
            <span>Кожна підтверджена дія важлива</span>
          </div>
        </div>
      </section>
      {featured && !query.isError && (
        <section className="featured-challenge">
          <div>
            <p className="eyebrow">СПІЛЬНИЙ ФОКУС МІСТА</p>
            <ChallengeStatusBadge status={featured.progress.status} />
            <h2>{featured.challenge.title}</h2>
            <p>
              {featured.progress.contributorCount} волонтерів уже мають
              підтверджений внесок. Кожна ціль рахується окремо — без змішування
              годин, кілограмів і дерев.
            </p>
            <Button asChild>
              <Link to={`/challenges/${featured.challenge.slug}`}>
                Дізнатися та долучитися <ArrowUpRight size={17} />
              </Link>
            </Button>
          </div>
          <BossProgress progress={featured.progress} />
        </section>
      )}
      <section className="personal-section" id="challenge-catalog">
        <SectionHeading
          title="Виклики, що об’єднують"
          description="Знайди мету за напрямом, статусом або настроєм."
        />
        <div className="exploration-filters">
          <div className="exploration-filter-fields challenge-filter-fields">
            <label>
              <span>Пошук</span>
              <Input
                value={search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Яку зміну шукаєш?"
              />
            </label>
            <label>
              <span>Напрям</span>
              <select
                value={category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Усі напрями</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Статус</span>
              <select
                value={status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="">Усі виклики</option>
                {groups.map(([id]) => (
                  <option key={id} value={id}>
                    {challengeStatusLabels[id]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Порядок</span>
              <select
                value={sort}
                onChange={(e) => set("sort", e.target.value)}
              >
                <option value="progress">Ближче до спільної мети</option>
                <option value="participants">Більше учасників</option>
                <option value="date">Найближче завершення</option>
              </select>
            </label>
          </div>
        </div>
        <p className="exploration-result-count" role="status">
          {query.isPending
            ? "Завантажуємо виклики…"
            : `Знайдено викликів: ${filtered.length}`}
        </p>
        {query.isPending ? (
          <ExplorationSkeleton />
        ) : query.isError ? (
          <ExplorationError retry={() => void query.refetch()} />
        ) : filtered.length ? (
          groups.map(([id, title, description]) => {
            const list = filtered.filter((r) => r.progress.status === id);
            return list.length ? (
              <section className="challenge-group" key={id}>
                <SectionHeading title={title} description={description} />
                <div className="story-grid">
                  {list.map((r) => (
                    <CityChallengeCard
                      key={r.challenge.id}
                      {...r}
                      now={state.clock}
                    />
                  ))}
                </div>
              </section>
            ) : null;
          })
        ) : (
          <Card className="empty-state">
            <Flag size={40} />
            <h2>Знайдемо іншу спільну мету</h2>
            <p>Спробуй інший напрям або покажи всі виклики.</p>
            <Button variant="outline" onClick={() => setParams({})}>
              Скинути фільтри
            </Button>
          </Card>
        )}
      </section>
      <p className="demo-caption">
        Усі цілі та вимірювання демонстраційні. День сценарію — 16 жовтня 2026;
        прогрес враховує лише підтвердження в межах кожного виклику.
      </p>
    </div>
  );
}
