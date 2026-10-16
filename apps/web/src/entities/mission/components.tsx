import type { QuestChainStatus } from "./types";
import { missionLifecycleLabels } from "./status";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  Coins,
  Flag,
  Layers3,
  LockKeyhole,
  MapPin,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import type { Quest, Organization } from "../types";
import type {
  QuestChain,
  QuestChainProgress,
  QuestChainReward,
  MissionStepProgress,
  QuestChainStep,
} from "./types";
import { Card, Badge, Photo, Input } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { categories } from "../../mocks/data";
export function MissionDifficultyBadge({
  difficulty,
}: {
  difficulty: Quest["difficulty"];
}) {
  return <Badge className="story-difficulty">{difficulty}</Badge>;
}
export function MissionStatusBadge({ status }: { status: QuestChainStatus }) {
  return (
    <Badge className={`story-status story-status-${status.toLowerCase()}`}>
      {missionLifecycleLabels[status]}
    </Badge>
  );
}
export function MissionRewardPreview({ reward }: { reward: QuestChainReward }) {
  return (
    <div className="story-rewards">
      <span>
        <Zap size={16} />+{reward.xp} XP
      </span>
      <span>
        <Coins size={16} />+{reward.rewardPoints} балів
      </span>
      <span>
        <Trophy size={16} />
        Відзнака
      </span>
    </div>
  );
}
export function MissionProgress({
  progress,
}: {
  progress: QuestChainProgress | null;
}) {
  if (!progress)
    return (
      <p className="story-login-hint">
        Увійди як волонтер, щоб побачити свій прогрес.
      </p>
    );
  return (
    <div className="mission-progress">
      <div>
        <strong>
          {progress.status === "COMPLETED"
            ? "Історію пройдено"
            : `${progress.requiredCompleted} / ${progress.requiredTotal} основних етапів`}
        </strong>
        <span>{Math.round(progress.percentage)}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Прогрес обов’язкових етапів місії"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.percentage)}
      >
        <span style={{ width: `${Math.min(100, progress.percentage)}%` }} />
      </div>
      {progress.optionalTotal > 0 && (
        <small>
          Бонусні етапи: {progress.optionalCompleted} / {progress.optionalTotal}{" "}
          · не блокують фінал
        </small>
      )}
    </div>
  );
}
export function MissionCard({
  mission,
  progress,
}: {
  mission: QuestChain;
  progress: QuestChainProgress | null;
}) {
  return (
    <Card className="story-card">
      <Link to={`/missions/${mission.slug}`} className="story-card-link">
        <div className="story-card-photo">
          <Photo
            src={mission.coverImage}
            alt={`Тематичне фото місії «${mission.title}»`}
            loading="lazy"
          />
          <MissionStatusBadge status={mission.status} />
          <span className="story-photo-count">
            <Layers3 size={14} />
            {mission.steps.length} етапи
          </span>
        </div>
        <div className="story-card-body">
          <div className="story-card-meta">
            <span>
              {categories.find((c) => c.id === mission.category)?.name}
            </span>
            <MissionDifficultyBadge difficulty={mission.difficulty} />
          </div>
          <h3>{mission.title}</h3>
          <p>{mission.shortDescription}</p>
          <MissionProgress progress={progress} />
          <div className="story-card-bonus">
            <small>ФІНАЛЬНИЙ БОНУС</small>
            <MissionRewardPreview reward={mission.rewards} />
          </div>
          <div className="story-card-bottom">
            <span>
              {progress?.rewardClaimed ? (
                <>
                  <CheckCircle2 size={15} />
                  Нагороду отримано
                </>
              ) : progress?.status === "LOCKED" ? (
                <>
                  <LockKeyhole size={15} />
                  Зараз недоступна
                </>
              ) : (
                <>
                  <Clock3 size={15} />
                  {mission.estimatedDuration}
                </>
              )}
            </span>
            <ArrowUpRight size={21} />
          </div>
        </div>
      </Link>
    </Card>
  );
}
export type MissionFilterValues = {
  search: string;
  category: string;
  status: string;
  difficulty: string;
  sort: string;
};
export function MissionFilters({
  value,
  onChange,
}: {
  value: MissionFilterValues;
  onChange: (key: keyof MissionFilterValues, value: string) => void;
}) {
  return (
    <div className="exploration-filters">
      <div className="exploration-filter-fields">
        <label>
          <span>Що хочеш змінити?</span>
          <Input
            placeholder="Пошук сюжетних місій…"
            value={value.search}
            onChange={(e) => onChange("search", e.target.value)}
          />
        </label>
        <label>
          <span>Напрям</span>
          <select
            value={value.category}
            onChange={(e) => onChange("category", e.target.value)}
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
          <span>Твій прогрес</span>
          <select
            value={value.status}
            onChange={(e) => onChange("status", e.target.value)}
          >
            <option value="">Усі історії</option>
            <option value="AVAILABLE">Доступні</option>
            <option value="IN_PROGRESS">У процесі</option>
            <option value="COMPLETED">Пройдені мною</option>
            <option value="LOCKED">З передумовами</option>
            <option value="ARCHIVED">Архівні</option>
          </select>
        </label>
        <label>
          <span>Складність</span>
          <select
            value={value.difficulty}
            onChange={(e) => onChange("difficulty", e.target.value)}
          >
            <option value="">Будь-яка</option>
            <option>Легкий</option>
            <option>Середній</option>
            <option>Складний</option>
          </select>
        </label>
        <label>
          <span>Порядок</span>
          <select
            value={value.sort}
            onChange={(e) => onChange("sort", e.target.value)}
          >
            <option value="recommended">Рекомендовані</option>
            <option value="progress">Мій прогрес</option>
            <option value="reward">Більше XP за фінал</option>
            <option value="steps">Менше етапів</option>
          </select>
        </label>
      </div>
    </div>
  );
}
export function MissionHero({
  mission,
  organization,
}: {
  mission: QuestChain;
  organization: Organization;
}) {
  return (
    <section className="mission-hero">
      <Photo
        src={mission.coverImage}
        alt={`Ілюстративне фото: ${mission.title}`}
        fetchPriority="high"
      />
      <div className="mission-hero-shade" />
      <div className="mission-hero-copy">
        <div className="story-hero-badges">
          <MissionStatusBadge status={mission.status} />
          <MissionDifficultyBadge difficulty={mission.difficulty} />
          <Badge>
            {categories.find((c) => c.id === mission.category)?.name}
          </Badge>
        </div>
        <h1>{mission.title}</h1>
        <p>{mission.shortDescription}</p>
        <div className="mission-hero-facts">
          <span>
            <Layers3 size={17} />
            {mission.steps.length} етапи
          </span>
          <span>
            <Clock3 size={17} />
            {mission.estimatedDuration}
          </span>
          <Link to={`/organizations/${organization.id}`}>
            <MapPin size={17} />
            {organization.name}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <small>Демонстраційна історія · Тематична фотографія</small>
      </div>
    </section>
  );
}
export function MissionProgressOverview({
  mission,
  progress,
}: {
  mission: QuestChain;
  progress: QuestChainProgress | null;
}) {
  const next = mission.steps.find((s) => s.id === progress?.nextStepId);
  return (
    <Card className="mission-overview">
      <span className="eyebrow">ТВОЯ ІСТОРІЯ ЗМІН</span>
      <h2>
        {progress?.status === "COMPLETED"
          ? "Кожен крок мав значення"
          : progress?.status === "LOCKED"
            ? "У кожної історії є свій початок"
            : "Продовжуй свою добру справу"}
      </h2>
      <MissionProgress progress={progress} />
      {progress?.reasons.length ? (
        <p className="story-availability">
          <LockKeyhole size={18} />
          {progress.reasons.join(" ")}
        </p>
      ) : next ? (
        <div className="mission-next-step">
          <span className="eyebrow">НАСТУПНИЙ ЕТАП</span>
          <strong>{next.title}</strong>
          <Button asChild size="sm">
            <Link to={`/quests/${next.questId}`}>
              Перейти до квесту <ArrowUpRight size={16} />
            </Link>
          </Button>
        </div>
      ) : progress?.status === "COMPLETED" ? (
        <p className="story-availability">
          <CheckCircle2 size={18} />
          Усі обов’язкові внески підтверджені. Бонусні етапи залишаються окремою
          можливістю.
        </p>
      ) : (
        <p className="muted">Обери етап нижче й дізнайся про умови участі.</p>
      )}
    </Card>
  );
}
export function MissionStepConnector({ complete }: { complete: boolean }) {
  return (
    <span
      className={`mission-step-connector ${complete ? "complete" : ""}`}
      aria-hidden="true"
    />
  );
}
export function MissionStepCard({
  step,
  progress,
  quest,
}: {
  step: QuestChainStep;
  progress: MissionStepProgress;
  quest: Quest | undefined;
}) {
  const done = progress.status === "COMPLETED";
  const locked = progress.status === "LOCKED";
  return (
    <Card
      className={`mission-step-card ${done ? "is-complete" : ""} ${locked ? "is-locked" : ""}`}
    >
      <span className="mission-step-number" aria-label={`Етап ${step.order}`}>
        {done ? (
          <Check size={22} />
        ) : locked ? (
          <LockKeyhole size={19} />
        ) : (
          step.order
        )}
      </span>
      <div className="mission-step-content">
        <div className="mission-step-tags">
          <Badge>
            {step.isOptional
              ? "Бонусний етап · необов’язковий"
              : "Основний етап"}
          </Badge>
          <Badge>
            {done
              ? "Підтверджено"
              : locked
                ? "Поки заблоковано"
                : progress.status === "IN_PROGRESS"
                  ? "Ти вже долучився"
                  : "Можна починати"}
          </Badge>
        </div>
        <h3>{step.title}</h3>
        <p>{step.description}</p>
        {quest && (
          <div className="mission-step-quest-meta">
            <span>
              <Flag size={14} />
              {quest.xp} XP за сам квест
            </span>
            <span>
              <Clock3 size={14} />
              {quest.duration}
            </span>
          </div>
        )}
        {locked ? (
          <>
            <p className="field-hint">{progress.reason}</p>
            <Button disabled variant="outline" size="sm">
              Спочатку виконай передумови
            </Button>
          </>
        ) : (
          <Button asChild variant={done ? "outline" : "default"} size="sm">
            <Link to={`/quests/${step.questId}`}>
              {done ? "Переглянути виконаний квест" : "Відкрити квест"}
              <ArrowUpRight size={16} />
            </Link>
          </Button>
        )}
      </div>
    </Card>
  );
}
export function MissionTimeline({
  mission,
  progress,
  quests,
}: {
  mission: QuestChain;
  progress: QuestChainProgress;
  quests: Quest[];
}) {
  return (
    <ol className="mission-timeline" aria-label="Етапи сюжетної місії">
      {mission.steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((step) => {
          const state = progress.steps.find((p) => p.stepId === step.id)!;
          return (
            <li key={step.id}>
              <MissionStepConnector complete={state.status === "COMPLETED"} />
              <MissionStepCard
                step={step}
                progress={state}
                quest={quests.find((q) => q.id === step.questId)}
              />
            </li>
          );
        })}
    </ol>
  );
}
export function MissionStoryNote() {
  return (
    <div className="mission-story-note">
      <Sparkles size={23} />
      <p>
        Важливий шлях, а не швидкість. Заявка чи відправлений звіт ще не
        завершують етап: потрібне підтвердження організатора. Фінальний бонус
        додається окремо від нагород за квести.
      </p>
    </div>
  );
}
