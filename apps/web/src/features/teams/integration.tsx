import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Users, Sparkles, IdCard } from "lucide-react";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { useSession } from "../session/store";
import { usePassport } from "../passport/hooks";
import { visibleTeams } from "../../mocks/identity-selectors";
import {
  teamChallengeResults,
  teamStatistics,
} from "../../entities/team/calculator";
import { TeamAvatar } from "../../entities/team/components";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { skillDefinitions } from "../../entities/skill/catalog";
import { formatDate } from "../../shared/lib/utils";
export function IdentitySummary({
  userId,
  own = false,
}: {
  userId: string;
  own?: boolean;
}) {
  const query = usePassport(userId, !own);
  const s = useVolunteerState();
  const viewer = useSession((s) => s.user);
  const teams = visibleTeams(s, viewer?.id || null).filter((t) =>
    s.identity?.memberships.some(
      (m) => m.teamId === t.id && m.userId === userId && m.status === "ACTIVE",
    ),
  );
  const p =
    query.data && query.data.restricted === false ? query.data.passport : null;
  return (
    <section className="personal-section identity-summary">
      <div className="identity-small-grid">
        <Card className="identity-preview">
          <IdCard size={29} />
          <p className="eyebrow">ЦИФРОВА ІСТОРІЯ ВОЛОНТЕРСТВА</p>
          <h2>{own ? "Мій волонтерський паспорт" : "Волонтерський паспорт"}</h2>
          <p>
            {p
              ? `${p.passportId} · ${p.completedQuests} підтверджених справ${p.verifiedHours !== undefined ? ` · ${p.verifiedHours} год` : ""}`
              : query.isPending
                ? "Відкриваємо паспорт…"
                : "Видимістю паспорта керує власник."}
          </p>
          <Button asChild variant="outline">
            <Link to={own ? "/passport" : `/passport/${userId}`}>
              Відкрити паспорт <ArrowUpRight size={16} />
            </Link>
          </Button>
        </Card>
        {p?.skillProgress && (
          <Card className="identity-preview">
            <Sparkles size={29} />
            <p className="eyebrow">ДОСВІД СТАЄ КОМПЕТЕНЦІЄЮ</p>
            <h2>Сильні сторони</h2>
            <strong>
              {p.skillProgress.filter((s) => s.level > 0).length} навичок із
              досягнутим рівнем
            </strong>
            <div className="identity-skill-tags">
              {p.skillProgress
                .filter((s) => s.level > 0)
                .slice(0, 4)
                .map((s) => (
                  <Badge key={s.skillId}>
                    {skillDefinitions.find((d) => d.id === s.skillId)?.name} ·{" "}
                    {s.level}
                  </Badge>
                ))}
            </div>
            {own && (
              <Link className="text-link" to="/skills">
                Дослідити дерево навичок <ArrowUpRight size={16} />
              </Link>
            )}
          </Card>
        )}
      </div>
      {(own || teams.length > 0) && (
        <section className="personal-section">
          <div className="section-heading">
            <h2>{own ? "Мої команди" : "Спільноти волонтера"}</h2>
            <Link className="text-link" to={own ? "/teams?mine=1" : "/teams"}>
              Усі команди <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="identity-small-grid">
            {teams.length ? (
              teams.slice(0, 3).map((t) => (
                <Link
                  className="card identity-team-preview"
                  key={t.id}
                  to={`/teams/${t.slug}`}
                >
                  <TeamAvatar avatar={t.avatar} />
                  <div>
                    <h3>{t.name}</h3>
                    <p>
                      {teamStatistics(s, t.id).hours} підтверджених годин разом
                    </p>
                  </div>
                  <ArrowUpRight size={19} />
                </Link>
              ))
            ) : (
              <Card className="inline-empty">
                <Users size={26} />
                <p>Знайди своїх людей або створи власну команду.</p>
                <Link to="/teams/create" className="text-link">
                  Створити команду
                </Link>
              </Card>
            )}
          </div>
        </section>
      )}
      {own && (
        <section className="personal-section">
          <h2>Останні командні події</h2>
          <Card className="team-event-list">
            {(s.identity?.events || [])
              .filter((e) => teams.some((t) => t.id === e.teamId))
              .slice()
              .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
              .slice(0, 5)
              .map((e) => (
                <div key={e.id}>
                  <Users size={18} />
                  <div>
                    <strong>{e.title}</strong>
                    <small>
                      {s.identity?.teams.find((t) => t.id === e.teamId)?.name}
                    </small>
                    <time dateTime={e.date}>{formatDate(e.date)}</time>
                  </div>
                </div>
              ))}
            {!teams.length && (
              <p className="muted">
                Події з’являться після долучення до команди.
              </p>
            )}
          </Card>
        </section>
      )}
    </section>
  );
}
export function MissionTeamContext({ questIds }: { questIds: string[] }) {
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const teams = (s.identity?.teams || []).filter((t) =>
    s.identity?.memberships.some(
      (m) =>
        m.teamId === t.id && m.userId === user?.id && m.status === "ACTIVE",
    ),
  );
  return (
    <Card className="mission-team-context">
      <Users size={25} />
      <h3>Історія, яку можна пройти разом</h3>
      <p>
        На квестах із командною участю власник або координатор може записати
        активних учасників. Кожен етап місії зараховується особисто після
        підтвердження твоєї роботи.
      </p>
      {teams.length ? (
        teams.map((t) => {
          const records =
            s.identity?.teamQuests.filter(
              (r) => r.teamId === t.id && questIds.includes(r.questId),
            ) || [];
          return (
            <Link key={t.id} to={`/teams/${t.slug}/quests`}>
              <span>{t.name}</span>
              <Badge>{records.length} командних етапів</Badge>
              <ArrowUpRight size={15} />
            </Link>
          );
        })
      ) : (
        <Link className="text-link" to="/teams">
          Знайти команду <ArrowUpRight size={16} />
        </Link>
      )}
    </Card>
  );
}
export function ChallengeTeamContext({ challengeId }: { challengeId: string }) {
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const rows = visibleTeams(s, user?.id || null)
    .flatMap((team) => {
      const r = teamChallengeResults(s, team.id).find(
        (r) => r.challenge.id === challengeId,
      );
      return r ? [{ team, result: r }] : [];
    })
    .sort(
      (a, b) =>
        b.result.hours - a.result.hours || a.team.id.localeCompare(b.team.id),
    );
  return (
    <section className="personal-section">
      <h2>Команди, що наближають спільну мету</h2>
      <p className="muted">
        Рейтинг за підтвердженими особистими годинами саме в командних заявках
        цього виклику.
      </p>
      <div className="team-challenge-ranking">
        {rows.length ? (
          rows.map((r, i) => (
            <Card key={r.team.id}>
              <span className="challenge-rank">{i + 1}</span>
              <TeamAvatar avatar={r.team.avatar} />
              <div>
                <h3>
                  <Link to={`/teams/${r.team.slug}`}>{r.team.name}</Link>
                </h3>
                <strong>
                  {r.result.hours} год · {r.result.volunteers} волонтерів
                </strong>
                {r.result.goals
                  .filter(
                    (g) => g.metric !== "VOLUNTEER_HOURS" && g.actualValue > 0,
                  )
                  .map((g) => (
                    <small key={g.id}>
                      {g.actualValue} {g.unit} спільного результату квестів
                    </small>
                  ))}
              </div>
            </Card>
          ))
        ) : (
          <Card className="inline-empty">
            <BookOpen size={28} />
            <p>
              Командний внесок з’явиться після підтвердження пов’язаної
              командної участі.
            </p>
          </Card>
        )}
      </div>
      <p className="field-hint">
        Спільні результати квесту показані в контексті команди. Якщо команди
        працювали на одному квесті, ці значення перетинаються й не додаються між
        командами.
      </p>
    </section>
  );
}
