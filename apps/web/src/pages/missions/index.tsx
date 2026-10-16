import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, BookOpen, Layers3, Sparkles } from "lucide-react";
import { useMissions } from "../../features/mission-progress/hooks";
import { useSession } from "../../features/session/store";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import {
  selectMissionProgress,
  explorationOf,
} from "../../mocks/exploration-selectors";
import {
  MissionCard,
  MissionFilters,
  type MissionFilterValues,
} from "../../entities/mission/components";
import { Button } from "../../shared/ui/button";
import { Badge, Card, Photo } from "../../shared/ui/primitives";
import { SectionHeading } from "../../shared/ui/section-heading";
import {
  ExplorationSkeleton,
  ExplorationError,
} from "../../shared/ui/exploration-states";
export function MissionsPage() {
  const query = useMissions();
  const state = useVolunteerState();
  const user = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const value: MissionFilterValues = {
    search: params.get("search") || "",
    category: params.get("category") || "",
    status: params.get("status") || "",
    difficulty: params.get("difficulty") || "",
    sort: params.get("sort") || "recommended",
  };
  const change = (key: keyof MissionFilterValues, value: string) =>
    setParams((old) => {
      const next = new URLSearchParams(old);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  const records = (query.data || []).map((m) => ({
    mission: state.exploration?.missions.find((v) => v.id === m.id) || m,
    progress:
      user?.role === "VOLUNTEER"
        ? selectMissionProgress(state, m.id, user.id)
        : null,
  }));
  const recommended = records
    .filter(
      (r) =>
        ["ACTIVE", "PUBLISHED"].includes(r.mission.status) &&
        r.progress?.status !== "LOCKED" &&
        r.progress?.status !== "COMPLETED",
    )
    .sort(
      (a, b) => (b.progress?.percentage || 0) - (a.progress?.percentage || 0),
    )
    .slice(0, 2);
  const filtered = records
    .filter(
      ({ mission: m, progress: p }) =>
        (!value.search ||
          `${m.title} ${m.shortDescription} ${m.description}`
            .toLocaleLowerCase("uk")
            .includes(value.search.toLocaleLowerCase("uk"))) &&
        (!value.category || m.category === value.category) &&
        (!value.difficulty || m.difficulty === value.difficulty) &&
        (!value.status ||
          (value.status === "ARCHIVED"
            ? m.status === "ARCHIVED"
            : p?.status === value.status)),
    )
    .sort((a, b) =>
      value.sort === "reward"
        ? b.mission.rewards.xp - a.mission.rewards.xp
        : value.sort === "steps"
          ? a.mission.steps.length - b.mission.steps.length
          : value.sort === "progress"
            ? (b.progress?.percentage || 0) - (a.progress?.percentage || 0)
            : Number(b.progress?.status === "IN_PROGRESS") -
                Number(a.progress?.status === "IN_PROGRESS") ||
              a.mission.title.localeCompare(b.mission.title, "uk"),
    );
  return (
    <div className="container page-section exploration-page">
      <section className="exploration-catalog-hero">
        <div>
          <Badge>
            <BookOpen size={15} />
            МІСТО ПИШЕ ІСТОРІЇ РАЗОМ З ТОБОЮ
          </Badge>
          <h1>
            Одна добра справа —<br />
            <span>початок великої історії.</span>
          </h1>
          <p>
            Проходь пов’язані квести, відкривай нові етапи та збирай досвід,
            який має значення. Твій Дніпро змінюється крок за кроком.
          </p>
          <div className="exploration-hero-links">
            <a className="button button-primary" href="#mission-catalog">
              Обрати місію <ArrowUpRight size={17} />
            </a>
            <Link className="text-link" to="/challenges">
              Міські виклики <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="story-hero-note">
            <Layers3 size={20} />
            <span>
              Кілька квестів · спільний сюжет · окремий бонус за фінал
            </span>
          </div>
        </div>
        <div className="exploration-hero-art">
          <Photo
            src="/images/community.jpg"
            alt="Тематичне фото спільної волонтерської роботи"
            fetchPriority="high"
          />
          <div>
            <Sparkles size={24} />
            <span>Твій внесок стає історією</span>
          </div>
        </div>
      </section>
      {explorationOf(state).recoveryMessage && (
        <p className="error-message" role="status">
          {explorationOf(state).recoveryMessage}
        </p>
      )}
      {!query.isPending && !query.isError && recommended.length > 0 && (
        <section className="personal-section">
          <SectionHeading
            eyebrow="ЗНАЙДИ СВОЮ НАСТУПНУ ГЛАВУ"
            title={
              user?.role === "VOLUNTEER"
                ? "Продовжуй з того, що відгукується"
                : "Історії, до яких варто долучитися"
            }
          />
          <div className="story-grid recommended-story-grid">
            {recommended.map((r) => (
              <MissionCard key={r.mission.id} {...r} />
            ))}
          </div>
        </section>
      )}
      <section className="personal-section" id="mission-catalog">
        <SectionHeading
          title="Усі сюжетні місії"
          description="Основні етапи ведуть до фіналу. Бонусні — додають ще більше добрих можливостей."
        />
        <MissionFilters value={value} onChange={change} />
        <p className="exploration-result-count" role="status">
          {query.isPending
            ? "Завантажуємо історії…"
            : `Знайдено місій: ${filtered.length}`}
        </p>
        {query.isPending ? (
          <ExplorationSkeleton />
        ) : query.isError ? (
          <ExplorationError retry={() => void query.refetch()} />
        ) : filtered.length ? (
          <div className="story-grid">
            {filtered.map((r) => (
              <MissionCard key={r.mission.id} {...r} />
            ))}
          </div>
        ) : (
          <Card className="empty-state">
            <BookOpen size={40} />
            <h2>Твоя історія ще попереду</h2>
            <p>Зміни напрям або послаб фільтри.</p>
            <Button variant="outline" onClick={() => setParams({})}>
              Показати всі місії
            </Button>
          </Card>
        )}
      </section>
      <p className="demo-caption">
        Місії, нагороди та події демонстраційні. Прогрес обчислюється з
        підтверджених участей у цьому браузері.
      </p>
    </div>
  );
}
