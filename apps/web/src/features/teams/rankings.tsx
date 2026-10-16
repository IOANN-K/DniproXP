import { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, ArrowUpRight } from "lucide-react";
import { teamRanking } from "../../entities/team/calculator";
import { TeamAvatar } from "../../entities/team/components";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { Card, Badge } from "../../shared/ui/primitives";
import { categories } from "../../mocks/data";
export function TeamsRanking() {
  const s = useVolunteerState();
  const [period, setPeriod] = useState<"all" | "month">("all");
  const [category, setCategory] = useState("");
  const ranked = teamRanking(s, period, category);
  return (
    <section className="personal-section teams-ranking">
      <div className="identity-page-heading">
        <div>
          <p className="eyebrow">СИЛА СПІЛЬНИХ СПРАВ</p>
          <h2>Рейтинг команд</h2>
          <p>Лише підтверджені особисті години в командних заявках.</p>
        </div>
        <div>
          <label>
            Період
            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value === "month" ? "month" : "all")
              }
            >
              <option value="all">За весь час</option>
              <option value="month">Поточний місяць</option>
            </select>
          </label>
          <label>
            Напрям
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Усі напрями</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="team-ranking-list">
        {ranked.map(({ team, statistics: s }, i) => (
          <Link
            className={`card team-ranking-row ${i < 3 ? "podium-row" : ""}`}
            key={team.id}
            to={`/teams/${team.slug}`}
          >
            <strong>{i < 3 ? <Trophy size={23} /> : s.rank}</strong>
            <TeamAvatar avatar={team.avatar} />
            <div>
              <h3>{team.name}</h3>
              <small>
                {s.verifiedQuests} квестів із внеском ·{" "}
                {s.verifiedParticipations} підтверджених участей
              </small>
            </div>
            <Badge>{s.hours} год</Badge>
            <ArrowUpRight size={18} />
          </Link>
        ))}
        {!ranked.length && (
          <Card className="inline-empty">
            <p>Немає команд цього напряму.</p>
          </Card>
        )}
      </div>
      <p className="field-hint">
        Публічні команди. За однакових годин враховуємо кількість підтверджених
        участей, потім стабільний ID. Колективні кілограми та дерева не
        додаються до годин.
      </p>
    </section>
  );
}
