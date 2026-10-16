import { quantity, challengeStatusLabels } from "./presentation";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  Flag,
  Leaf,
  MapPin,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import type {
  CityChallenge,
  CityChallengeStatus,
  ChallengeProgressResult,
  ChallengeGoalProgress,
  ChallengeRankingEntry,
  ChallengeContribution,
} from "./types";
import type { Organization, Quest } from "../types";
import { METRIC_LABELS } from "../verified-activity/types";
import { Badge, Card, Photo } from "../../shared/ui/primitives";
import { QuestCard } from "../quest/quest-card";
import { Button } from "../../shared/ui/button";
import { formatDate } from "../../shared/lib/utils";
export function ChallengeStatusBadge({
  status,
}: {
  status: CityChallengeStatus;
}) {
  return (
    <Badge className={`story-status story-status-${status.toLowerCase()}`}>
      {challengeStatusLabels[status]}
    </Badge>
  );
}
export function ChallengeCountdown({
  challenge,
  status,
  now,
}: {
  challenge: CityChallenge;
  status: CityChallengeStatus;
  now: number;
}) {
  const target = Date.parse(
    status === "UPCOMING" ? challenge.startDate : challenge.endDate,
  );
  const days = Math.max(0, Math.ceil((target - now) / 86400000));
  return (
    <span className="challenge-countdown">
      <Clock3 size={15} />
      {status === "UPCOMING"
        ? `До старту: ${days} днів`
        : status === "ACTIVE"
          ? `До завершення: ${days} днів`
          : status === "COMPLETED"
            ? "Місто дякує за спільний внесок"
            : "Прийом нових внесків закрито"}
    </span>
  );
}
export function ChallengeProgress({
  progress,
}: {
  progress: ChallengeProgressResult;
}) {
  return (
    <div className="challenge-progress">
      <div>
        <strong>{Math.round(progress.percentage)}% спільного шляху</strong>
        <span>
          {progress.goals.filter((g) => !g.isOptional && g.complete).length} /{" "}
          {progress.goals.filter((g) => !g.isOptional).length} цілі
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Виконання всіх обов’язкових цілей виклику"
        aria-valuenow={Math.round(progress.percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${Math.min(100, progress.percentage)}%` }} />
      </div>
    </div>
  );
}
export function ChallengeGoalPreview({
  goal,
}: {
  goal: ChallengeGoalProgress;
}) {
  return (
    <div className="challenge-goal-preview">
      <span>{METRIC_LABELS[goal.metric]}</span>
      <strong>
        {quantity(goal.actualValue)}{" "}
        <small>
          / {quantity(goal.targetValue)} {goal.unit}
        </small>
      </strong>
    </div>
  );
}
export function CityChallengeCard({
  challenge,
  progress,
  now,
}: {
  challenge: CityChallenge;
  progress: ChallengeProgressResult;
  now: number;
}) {
  return (
    <Card className="story-card challenge-card">
      <Link to={`/challenges/${challenge.slug}`} className="story-card-link">
        <div className="story-card-photo">
          <Photo
            src={challenge.coverImage}
            alt={`Тематичне фото: ${challenge.title}`}
            loading="lazy"
          />
          <ChallengeStatusBadge status={progress.status} />
          <span className="story-photo-count">
            <Users size={14} />
            {progress.participantCount} учасників
          </span>
        </div>
        <div className="story-card-body">
          <h3>{challenge.title}</h3>
          <p>{challenge.description.slice(0, 112)}…</p>
          <ChallengeProgress progress={progress} />
          <div className="challenge-mini-goals">
            {progress.goals.slice(0, 2).map((g) => (
              <ChallengeGoalPreview key={g.id} goal={g} />
            ))}
          </div>
          <div className="story-card-bonus">
            <small>ЗА СПІЛЬНИЙ ФІНАЛ ТА ОСОБИСТИЙ ВНЕСОК</small>
            <div className="story-rewards">
              <span>
                <Zap size={15} />+{challenge.rewards.xp} XP
              </span>
              <span>
                <Coins size={15} />+{challenge.rewards.rewardPoints} балів
              </span>
            </div>
          </div>
          <div className="story-card-bottom">
            <ChallengeCountdown
              challenge={challenge}
              status={progress.status}
              now={now}
            />
            <ArrowUpRight size={21} />
          </div>
        </div>
      </Link>
    </Card>
  );
}
export function ChallengeHero({
  challenge,
  progress,
  organization,
}: {
  challenge: CityChallenge;
  progress: ChallengeProgressResult;
  organization: Organization;
}) {
  return (
    <section className="challenge-hero">
      <Photo
        src={challenge.coverImage}
        alt={`Ілюстративне фото міського виклику «${challenge.title}»`}
        fetchPriority="high"
      />
      <div className="mission-hero-shade" />
      <div className="mission-hero-copy">
        <div className="story-hero-badges">
          <ChallengeStatusBadge status={progress.status} />
          <Badge>
            <Users size={13} />
            {progress.participantCount} учасників
          </Badge>
        </div>
        <h1>{challenge.title}</h1>
        <p>Маленькі внески. Спільна велика зміна.</p>
        <div className="mission-hero-facts">
          <Link to={`/organizations/${organization.id}`}>
            <MapPin size={17} />
            {organization.name}
            <ArrowUpRight size={15} />
          </Link>
          <span>
            <CalendarDays size={17} />
            {formatDate(challenge.startDate)} — {formatDate(challenge.endDate)}
          </span>
        </div>
        <small>Демонстраційні цілі й результати · Тематична фотографія</small>
      </div>
    </section>
  );
}
export function BossProgress({
  progress,
}: {
  progress: ChallengeProgressResult;
}) {
  const percentage = Math.min(100, progress.percentage);
  const circumference = 2 * Math.PI * 52;
  return (
    <div className="boss-progress">
      <div
        className="boss-progress-ring"
        role="progressbar"
        aria-label="Центральний прогрес міського виклику"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" className="ring-track" />
          <circle
            cx="60"
            cy="60"
            r="52"
            className="ring-value"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percentage / 100)}
          />
        </svg>
        <div>
          <strong>
            {Math.round(percentage)}
            <small>%</small>
          </strong>
          <span>{progress.complete ? "разом вдалося" : "спільного шляху"}</span>
        </div>
      </div>
      <p>
        Індикатор показує найменший відсоток серед обов’язкових цілей. Фінал —
        коли досягнуті всі.
      </p>
    </div>
  );
}
export function ChallengeGoalCard({ goal }: { goal: ChallengeGoalProgress }) {
  return (
    <Card
      className={`challenge-goal-card ${goal.complete ? "is-complete" : ""}`}
    >
      <span>
        {goal.complete ? <CheckCircle2 size={23} /> : <Target size={23} />}
      </span>
      <h3>{goal.description}</h3>
      <strong>
        {quantity(goal.actualValue)}{" "}
        <small>
          / {quantity(goal.targetValue)} {goal.unit}
        </small>
      </strong>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={goal.description}
        aria-valuenow={Math.round(goal.percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${goal.percentage}%` }} />
      </div>
      <p>
        {goal.isOptional ? "Додаткова мета" : "Обов’язкова мета"} ·{" "}
        {goal.metric === "VOLUNTEER_HOURS"
          ? "Особистий час кожного підтвердженого волонтера"
          : "Спільний результат кожного квесту враховується один раз"}
      </p>
    </Card>
  );
}
export type ChallengePerson = { id: string; name: string; initials: string };
export function ChallengeLeaderboard({
  ranking,
  people,
}: {
  ranking: ChallengeRankingEntry[];
  people: ChallengePerson[];
}) {
  return (
    <Card className="challenge-leaderboard">
      {ranking.length ? (
        ranking.map((r, i) => {
          const user = people.find((u) => u.id === r.userId)!;
          return (
            <Link to={`/profile/${r.userId}`} key={r.userId}>
              <span className="challenge-rank">{i + 1}</span>
              <span className="avatar">{user?.initials || "В"}</span>
              <div>
                <strong>{user?.name || "Волонтер"}</strong>
                <small>{r.quests} підтверджених квестів</small>
              </div>
              <span>{quantity(r.hours)} год</span>
            </Link>
          );
        })
      ) : (
        <div className="inline-empty">
          <Users size={29} />
          <p>Рейтинг з’явиться після перших підтверджених внесків.</p>
        </div>
      )}
      <p className="field-hint">
        Рейтинг за особистими волонтерськими годинами. Кілограми, дерева та
        гуманітарні одиниці не додаються до годин.
      </p>
    </Card>
  );
}
export function ChallengeContributionChart({
  progress,
}: {
  progress: ChallengeProgressResult;
}) {
  const [selected, setSelected] = useState(progress.goals[0]?.id || "");
  const goal =
    progress.goals.find((g) => g.id === selected) || progress.goals[0];
  const byDate = new Map<string, number>();
  for (const c of progress.contributions.filter((c) => c.goalId === goal?.id)) {
    const date = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Kyiv",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(c.occurredAt));
    byDate.set(date, (byDate.get(date) || 0) + c.value);
  }
  const rows = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(1, ...rows.map(([, v]) => v));
  return (
    <Card className="contribution-chart">
      <label>
        Метрика графіка
        <select
          value={goal?.id || ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {progress.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {METRIC_LABELS[g.metric]} · {g.unit}
            </option>
          ))}
        </select>
      </label>
      <figure>
        <figcaption>Підтверджені внески за датою · {goal?.unit}</figcaption>
        {rows.length ? (
          <div
            className="contribution-bars"
            role="list"
            aria-label="Фактичні підтверджені значення за датами"
          >
            {rows.map(([date, value]) => (
              <div
                key={date}
                role="listitem"
                aria-label={`${date}: ${quantity(value)} ${goal?.unit}`}
              >
                <strong>{quantity(value)}</strong>
                <span style={{ height: `${(value / max) * 120}px` }} />
                <time dateTime={date}>
                  {date.slice(8)}.{date.slice(5, 7)}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="inline-empty">
            <Leaf size={30} />
            <p>Після підтвердження внесків тут з’являться фактичні значення.</p>
          </div>
        )}
      </figure>
      <p className="field-hint">
        Одна метрика за раз. Спільні вимірювання квесту не дублюються між
        волонтерами.
      </p>
    </Card>
  );
}
export function ChallengeActivityFeed({
  contributions,
  people,
  quests,
}: {
  contributions: ChallengeContribution[];
  people: ChallengePerson[];
  quests: Quest[];
}) {
  const [limit, setLimit] = useState(8);
  const rows = contributions
    .slice()
    .sort(
      (a, b) =>
        Date.parse(b.occurredAt) - Date.parse(a.occurredAt) ||
        a.id.localeCompare(b.id),
    );
  return (
    <Card className="challenge-activity-feed">
      {rows.length ? (
        rows.slice(0, limit).map((c) => (
          <div key={c.id}>
            <span className="transaction-icon">
              {c.scope === "QUEST" ? <Leaf size={18} /> : <Clock3 size={18} />}
            </span>
            <div>
              <strong>
                {c.scope === "QUEST"
                  ? "Спільний підтверджений результат"
                  : people.find((u) => u.id === c.userId)?.name || "Волонтер"}
              </strong>
              <p>
                <Link to={`/quests/${c.questId}`}>
                  {quests.find((q) => q.id === c.questId)?.title}
                </Link>
              </p>
              <small>
                {formatDate(c.occurredAt)} ·{" "}
                {c.scope === "QUEST"
                  ? "один вимір на квест"
                  : "особистий внесок"}
              </small>
            </div>
            <span>
              +{quantity(c.value)} {c.unit}
            </span>
          </div>
        ))
      ) : (
        <div className="inline-empty">
          <Flag size={29} />
          <p>Перший підтверджений внесок ще попереду.</p>
        </div>
      )}
      {rows.length > limit && (
        <Button variant="ghost" onClick={() => setLimit((n) => n + 8)}>
          Показати ще внески
        </Button>
      )}
    </Card>
  );
}
export function ChallengeRewardCard({
  challenge,
  children,
}: {
  challenge: CityChallenge;
  children: ReactNode;
}) {
  return (
    <Card className="mission-reward-panel">
      <span className="story-reward-icon">
        <Trophy size={32} />
      </span>
      <h2>Коли разом вдалося</h2>
      <p>
        Фінальний бонус доступний після виконання всіх основних цілей —
        волонтерам із власним підтвердженим внеском у період виклику.
      </p>
      <div className="story-rewards">
        <span>
          <Zap size={17} />+{challenge.rewards.xp} XP
        </span>
        <span>
          <Coins size={17} />+{challenge.rewards.rewardPoints} балів
        </span>
      </div>
      <Badge>{challenge.rewards.achievement.title}</Badge>
      {children}
    </Card>
  );
}
export function RelatedQuests({ quests }: { quests: Quest[] }) {
  return quests.length ? (
    <div className="quest-grid">
      {quests.map((q) => (
        <QuestCard key={q.id} quest={q} />
      ))}
    </div>
  ) : (
    <Card className="inline-empty">
      <p>Наразі немає доступних пов’язаних квестів.</p>
    </Card>
  );
}
