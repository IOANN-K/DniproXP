import { Link } from "react-router-dom";
import {
  Leaf,
  Heart,
  Flag,
  Sun,
  Users,
  ArrowUpRight,
  Clock3,
  BadgeCheck,
  Zap,
  Trophy,
  LockKeyhole,
} from "lucide-react";
import type { Team, TeamStatistics, TeamAchievement } from "./types";
import { Card, Badge, Photo, Input } from "../../shared/ui/primitives";
import { categories } from "../../mocks/data";
export function TeamAvatar({ avatar }: { avatar: string }) {
  const Icon =
    avatar === "heart"
      ? Heart
      : avatar === "sun"
        ? Sun
        : avatar === "flag"
          ? Flag
          : Leaf;
  return (
    <span className={`team-avatar team-avatar-${avatar}`}>
      <Icon size={27} />
    </span>
  );
}
export function TeamAvatarStack({ names }: { names: string[] }) {
  return (
    <div
      className="team-avatar-stack"
      aria-label={`Учасники: ${names.join(", ")}`}
    >
      {names.slice(0, 4).map((name, i) => (
        <span key={`${name}-${i}`}>
          {name
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0])
            .join("")}
        </span>
      ))}
      {names.length > 4 && <span>+{names.length - 4}</span>}
    </div>
  );
}
export function TeamCard({
  team,
  statistics,
  names,
  preview = false,
}: {
  team: Team;
  statistics?: TeamStatistics;
  names: string[];
  preview?: boolean;
}) {
  const content = (
    <>
      <div className="team-card-photo">
        <Photo
          src={team.coverImage}
          alt={`Тематичне фото команди «${team.name}»`}
          loading="lazy"
        />
        <Badge>
          {team.visibility === "PRIVATE" ? (
            <>
              <LockKeyhole size={13} />
              За запрошенням
            </>
          ) : team.status === "ARCHIVED" ? (
            "Архівна команда"
          ) : (
            "Відкрита спільнота"
          )}
        </Badge>
      </div>
      <div className="team-card-body">
        <TeamAvatar avatar={team.avatar} />
        <small>
          {categories.find((c) => c.id === team.category)?.name} · {team.city}
        </small>
        <h3>{team.name || "Назва твоєї команди"}</h3>
        <p>
          {team.description ||
            "Тут з’явиться історія вашої спільноти та спільні цілі."}
        </p>
        <div className="team-card-score">
          <span>
            <Users size={15} />
            {names.length} / {team.maxMembers}
          </span>
          <span>
            <Clock3 size={15} />
            {statistics?.hours || 0} год
          </span>
        </div>
        <div className="team-card-bottom">
          <TeamAvatarStack names={names} />
          {!preview && <ArrowUpRight size={21} />}
        </div>
      </div>
    </>
  );
  return (
    <Card className="team-card">
      {preview ? content : <Link to={`/teams/${team.slug}`}>{content}</Link>}
    </Card>
  );
}
export function TeamFilters({
  search,
  category,
  mine,
  onChange,
}: {
  search: string;
  category: string;
  mine: boolean;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="exploration-filters team-filters">
      <label>
        Пошук
        <Input
          value={search}
          placeholder="Знайди свою спільноту…"
          onChange={(e) => onChange("search", e.target.value)}
        />
      </label>
      <label>
        Напрям
        <select
          value={category}
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
      <label className="team-mine-filter">
        <input
          type="checkbox"
          checked={mine}
          onChange={(e) => onChange("mine", e.target.checked ? "1" : "")}
        />
        Мої команди
      </label>
    </div>
  );
}
export function TeamStats({ statistics: s }: { statistics: TeamStatistics }) {
  return (
    <div className="personal-stats team-statistics">
      {[
        {
          icon: BadgeCheck,
          value: s.completedQuests,
          label: "завершених командних квестів",
        },
        { icon: Clock3, value: s.hours, label: "підтверджених годин" },
        { icon: Users, value: s.volunteers, label: "волонтерів із внеском" },
        { icon: Zap, value: s.xp, label: "XP підтверджених учасників" },
      ].map((v) => (
        <Card className="personal-stat" key={v.label}>
          <v.icon size={23} />
          <strong>{v.value.toLocaleString("uk-UA")}</strong>
          <h3>{v.label}</h3>
        </Card>
      ))}
    </div>
  );
}
export function TeamAchievements({
  achievements,
}: {
  achievements: TeamAchievement[];
}) {
  return (
    <section className="personal-section">
      <h2>Відзнаки спільних справ</h2>
      <div className="team-achievements">
        {achievements.map((a) => (
          <Card className={a.unlocked ? "earned" : "locked"} key={a.id}>
            <Trophy size={27} />
            <Badge>{a.unlocked ? "Відкрито" : "Наступна мета"}</Badge>
            <h3>{a.name}</h3>
            <p>{a.description}</p>
            <small>
              {a.value.toLocaleString("uk-UA")} /{" "}
              {a.target.toLocaleString("uk-UA")}
            </small>
          </Card>
        ))}
      </div>
    </section>
  );
}
