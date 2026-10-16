import { useState } from "react";
import { Link } from "react-router-dom";
import { Medal, Trophy, ArrowUpRight, Zap, TrendingUp } from "lucide-react";
import { volunteerAccounts, getVolunteer } from "../mocks/repository";
import { useVolunteerState } from "../shared/lib/use-volunteer";
import { useSession } from "../features/session/store";
import { Tabs, TabsList, TabsTrigger } from "../shared/ui/tabs";
import { Card, Badge } from "../shared/ui/primitives";
import {
  LevelBadge,
  VolunteerAvatar,
} from "../entities/gamification/components";
import { SectionHeading } from "../shared/ui/section-heading";
export function LeaderboardPage() {
  const state = useVolunteerState();
  const self = useSession((s) => s.user);
  const [period, setPeriod] = useState("week");
  const [sort, setSort] = useState("desc");
  const start =
    period === "all"
      ? 0
      : state.clock - (period === "week" ? 7 : 30) * 86400000;
  const ranked = volunteerAccounts(state)
    .map((u) => {
      const user = getVolunteer(u.id, state)!;
      const tx = state.transactions.filter(
        (t) =>
          t.userId === u.id &&
          t.xp > 0 &&
          new Date(t.date).getTime() >= start &&
          new Date(t.date).getTime() <= state.clock,
      );
      return {
        ...user,
        periodXp: tx.reduce((n, t) => n + t.xp, 0),
        periodQuests: new Set(
          tx
            .filter(
              (t) =>
                t.questId &&
                (t.kind === undefined || t.kind === "QUEST_COMPLETION"),
            )
            .map((t) => t.questId),
        ).size,
      };
    })
    .sort(
      (a, b) =>
        b.periodXp - a.periodXp ||
        b.questsCompleted - a.questsCompleted ||
        a.id.localeCompare(b.id),
    );
  const position = ranked.findIndex((u) => u.id === self?.id) + 1;
  const listing = sort === "asc" ? [...ranked].reverse() : ranked;
  return (
    <div className="container page-section">
      <div className="leaderboard-intro">
        <p className="eyebrow">ДОБРІ СПРАВИ НАДИХАЮТЬ</p>
        <h1>Сила нашої спільноти</h1>
        <p>Знайомся з людьми, які щодня роблять місто теплішим.</p>
        <span className="demo-caption">
          Демонстраційний рейтинг · Лише підтверджені внески · Станом на 16
          жовтня 2026
        </span>
      </div>
      <div className="leaderboard-controls">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList aria-label="Період рейтингу">
            <TabsTrigger value="week">Тиждень</TabsTrigger>
            <TabsTrigger value="month">Місяць</TabsTrigger>
            <TabsTrigger value="all">За весь час</TabsTrigger>
          </TabsList>
        </Tabs>
        <p>
          {period === "week"
            ? "Внески за останні 7 днів"
            : period === "month"
              ? "Внески за останні 30 днів"
              : "Усі підтверджені внески"}
        </p>
      </div>
      <div className="leader-podium modern-podium">
        {ranked.slice(0, 3).map((u, i) => (
          <Link
            className={`card podium podium-${i}`}
            to={`/profile/${u.id}`}
            key={u.id}
          >
            <span className="podium-rank">
              {i === 0 ? <Trophy size={24} /> : <Medal size={24} />}
              {i + 1} місце
            </span>
            <VolunteerAvatar user={u} large />
            <h2>{u.name}</h2>
            <p>{u.periodQuests} підтверджених квестів за період</p>
            <Badge>
              <Zap size={15} />
              {u.periodXp.toLocaleString("uk-UA")} XP
            </Badge>
          </Link>
        ))}
      </div>
      {self && position > 0 && (
        <Card className="own-position">
          <span className="own-rank">#{position}</span>
          <div>
            <strong>Твоя позиція у спільноті</strong>
            <p>
              {ranked[position - 1].periodXp} XP за обраний період. Кожна добра
              справа важлива.
            </p>
          </div>
          <TrendingUp size={27} />
        </Card>
      )}
      <section className="leader-list full-leader-list">
        <SectionHeading
          title="За кожним балом — добра справа"
          action={
            <label className="sort-control">
              Сортувати
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="desc">Більше XP спочатку</option>
                <option value="asc">Менше XP спочатку</option>
              </select>
            </label>
          }
        />
        {listing.map((u) => (
          <Link
            to={`/profile/${u.id}`}
            key={u.id}
            className={`card leader-row ${u.id === self?.id ? "own-row" : ""}`}
          >
            <strong className="rank">
              {ranked.findIndex((r) => r.id === u.id) + 1}
            </strong>
            <VolunteerAvatar user={u} />
            <div>
              <h3>
                {u.name}
                {u.id === self?.id && <Badge>Це ти</Badge>}
              </h3>
              <LevelBadge xp={u.xp} />
            </div>
            <div className="leader-score">
              <strong>{u.periodXp.toLocaleString("uk-UA")} XP</strong>
              <span>{u.periodQuests} добрих справ</span>
            </div>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </section>
      <p className="demo-caption">
        XP обчислюється з журналу нарахувань. Обмін бонусних балів не впливає на
        рейтинг. За рівності XP вище стоїть учасник із більшою загальною
        кількістю завершених квестів.
      </p>
    </div>
  );
}
