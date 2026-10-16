import { Link } from "react-router-dom";
import {
  Leaf,
  Heart,
  CalendarDays,
  BookOpen,
  MessageCircle,
  Flag,
  Package,
  Code2,
  LockKeyhole,
  ArrowUpRight,
  BadgeCheck,
} from "lucide-react";
import type { SkillDefinition, SkillProgress } from "./types";
import type { Quest } from "../types";
import { skillCategories } from "./catalog";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { formatDate } from "../../shared/lib/utils";
function SkillIcon({ icon }: { icon: SkillDefinition["icon"] }) {
  const icons = {
    leaf: Leaf,
    heart: Heart,
    calendar: CalendarDays,
    book: BookOpen,
    message: MessageCircle,
    flag: Flag,
    package: Package,
    code: Code2,
  };
  const Icon = icons[icon];
  return <Icon size={23} />;
}
export function SkillLevelBadge({ progress }: { progress: SkillProgress }) {
  return (
    <Badge>
      {progress.unlocked ? `Рівень ${progress.level}` : "Ще заблоковано"}
    </Badge>
  );
}
export function SkillProgressBar({ progress }: { progress: SkillProgress }) {
  return (
    <div className="skill-progress-bar">
      <div>
        <strong>{progress.earnedXp} досвіду навички</strong>
        <span>
          {progress.nextLevelXp === null
            ? "Максимум"
            : `Наступний: ${progress.nextLevelXp}`}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Розвиток до наступного рівня навички"
        aria-valuenow={Math.round(progress.percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
    </div>
  );
}
export function SkillCategoryTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="category-tabs skill-category-tabs"
      aria-label="Напрями компетенцій"
    >
      <button
        aria-pressed={!value}
        className={!value ? "selected" : ""}
        onClick={() => onChange("")}
      >
        Усі напрями
      </button>
      {skillCategories.map((c) => (
        <button
          key={c.id}
          aria-pressed={value === c.id}
          className={value === c.id ? "selected" : ""}
          onClick={() => onChange(c.id)}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
export function SkillConnection({ unlocked }: { unlocked: boolean }) {
  return (
    <svg
      className={`skill-connection ${unlocked ? "unlocked" : ""}`}
      viewBox="0 0 100 40"
      aria-hidden="true"
    >
      <path d="M50 0 V40" />
      <circle cx="50" cy="20" r="4" />
    </svg>
  );
}
export function SkillNode({
  definition,
  progress,
  selected,
  onSelect,
}: {
  definition: SkillDefinition;
  progress: SkillProgress;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`skill-node ${selected ? "selected" : ""} ${progress.unlocked ? "" : "locked"}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="skill-node-icon">
        {progress.unlocked ? (
          <SkillIcon icon={definition.icon} />
        ) : (
          <LockKeyhole size={23} />
        )}
      </span>
      <span>
        <strong>{definition.name}</strong>
        <small>
          {progress.unlocked
            ? `Рівень ${progress.level} · ${progress.earnedXp} досвіду`
            : "Переглянути передумови"}
        </small>
      </span>
      <ArrowUpRight size={17} />
    </button>
  );
}
export function SkillTree({
  definitions,
  progress,
  selected,
  category,
  onSelect,
}: {
  definitions: SkillDefinition[];
  progress: SkillProgress[];
  selected: string;
  category: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="skill-tree"
      aria-label="Дерево волонтерських компетенцій"
      onKeyDown={(e) => {
        if (
          !["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)
        )
          return;
        const nodes = Array.from(
          e.currentTarget.querySelectorAll<HTMLButtonElement>(".skill-node"),
        );
        const index = nodes.findIndex((n) => n === e.target);
        if (index < 0) return;
        e.preventDefault();
        const direction =
          e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
        nodes[(index + direction + nodes.length) % nodes.length]?.focus();
      }}
    >
      {skillCategories
        .filter((c) => !category || c.id === category)
        .map((c) => (
          <section className={`skill-branch skill-branch-${c.id}`} key={c.id}>
            <h2>{c.name}</h2>
            {definitions
              .filter((d) => d.category === c.id)
              .map((d, i) => {
                const p = progress.find((p) => p.skillId === d.id)!;
                return (
                  <div key={d.id}>
                    {i > 0 && <SkillConnection unlocked={p.unlocked} />}
                    <SkillNode
                      definition={d}
                      progress={p}
                      selected={d.id === selected}
                      onSelect={() => onSelect(d.id)}
                    />
                  </div>
                );
              })}
          </section>
        ))}
    </div>
  );
}
export function SkillEvidenceList({ progress }: { progress: SkillProgress }) {
  return (
    <div className="skill-evidence">
      <h3>Підтверджені джерела досвіду</h3>
      {progress.evidence.length ? (
        progress.evidence
          .slice()
          .reverse()
          .map((e) => (
            <div key={e.id}>
              <BadgeCheck size={17} />
              <div>
                <Link to={`/quests/${e.questId}`}>{e.questTitle}</Link>
                <small>
                  {formatDate(e.confirmedAt)} · +{e.earnedXp} досвіду навички
                </small>
              </div>
            </div>
          ))
      ) : (
        <p className="muted">
          Після першої відповідної підтвердженої справи тут з’явиться її
          джерело.
        </p>
      )}
    </div>
  );
}
export function RecommendedSkillQuests({
  quests,
  requiresTeam,
}: {
  quests: Quest[];
  requiresTeam: boolean;
}) {
  return (
    <section className="skill-recommended">
      <h3>Наступні можливості</h3>
      {requiresTeam && (
        <p className="field-hint">
          Ця навичка потребує участі через командну заявку.
        </p>
      )}
      {quests.length ? (
        <div>
          {quests.map((q) => (
            <Button key={q.id} asChild variant="outline">
              <Link to={`/quests/${q.id}`}>
                {q.title}
                <ArrowUpRight size={16} />
              </Link>
            </Button>
          ))}
        </div>
      ) : (
        <p className="muted">Нові відповідні квести з’являться в каталозі.</p>
      )}
    </section>
  );
}
export function SkillDetailsPanel({
  definition,
  progress,
  quests,
}: {
  definition: SkillDefinition;
  progress: SkillProgress;
  quests: Quest[];
}) {
  return (
    <Card className="skill-details-panel">
      <span className="skill-node-icon">
        <SkillIcon icon={definition.icon} />
      </span>
      <SkillLevelBadge progress={progress} />
      <h2>{definition.name}</h2>
      <p>{definition.description}</p>
      <SkillProgressBar progress={progress} />
      {progress.lockReasons.map((reason) => (
        <p className="skill-lock-reason" key={reason}>
          <LockKeyhole size={16} />
          {reason}
        </p>
      ))}
      <p className="field-hint">
        За відповідний підтверджений квест: {definition.experienceRules.baseXp}{" "}
        + {definition.experienceRules.xpPerHour} × годин. Досвід навички не
        витрачає твій XP.
        {!progress.unlocked
          ? " Підтверджений досвід зберігається до розблокування."
          : ""}
      </p>
      <SkillEvidenceList progress={progress} />
      <RecommendedSkillQuests
        quests={quests}
        requiresTeam={definition.experienceRules.requiresTeam}
      />
    </Card>
  );
}
