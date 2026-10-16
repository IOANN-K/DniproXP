import { Link, NavLink, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Users,
  Plus,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { useTeams, useTeam, useTeamMutation } from "../../features/teams/hooks";
import { TeamForm } from "../../features/teams/team-form";
import { TeamMembers } from "../../features/teams/members";
import { MyTeamInvitations } from "../../features/teams/invitations";
import { TeamsRanking } from "../../features/teams/rankings";
import { useSession } from "../../features/session/store";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import {
  teamStatistics,
  teamRanking,
  teamAchievements,
  teamChallengeResults,
} from "../../entities/team/calculator";
import {
  TeamCard,
  TeamStats,
  TeamAvatar,
  TeamAchievements,
  TeamFilters,
} from "../../entities/team/components";
import {
  TeamQuestProgress,
  TeamContributionList,
} from "../../features/team-participation/components";
import { teamRoleLabels } from "../../entities/team/presentation";
import { Card, Badge, Photo } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { ActionDialog } from "../../shared/ui/action-dialog";
import {
  ExplorationSkeleton,
  ExplorationError,
} from "../../shared/ui/exploration-states";
import { visibleTeams } from "../../mocks/identity-selectors";
import { teamsApi } from "../../mocks/identity-api";
import { formatDate } from "../../shared/lib/utils";
export function TeamsPage() {
  const query = useTeams();
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "",
    category = params.get("category") || "",
    mine = params.get("mine") === "1";
  const change = (key: string, value: string) =>
    setParams((old) => {
      const p = new URLSearchParams(old);
      if (value) p.set(key, value);
      else p.delete(key);
      return p;
    });
  const records = teamRanking(s, "all", category, query.data || []).filter(
    (r) =>
      (!search ||
        `${r.team.name} ${r.team.description}`
          .toLocaleLowerCase("uk")
          .includes(search.toLocaleLowerCase("uk"))) &&
      (!mine ||
        s.identity?.memberships.some(
          (m) =>
            m.teamId === r.team.id &&
            m.userId === user?.id &&
            m.status === "ACTIVE",
        )),
  );
  return (
    <div className="container page-section teams-page">
      <section className="identity-page-heading">
        <div>
          <Badge>
            <Users size={15} />
            СИЛЬНІШІ РАЗОМ
          </Badge>
          <h1>
            Знайди своїх людей.
            <br />
            Створи спільну історію.
          </h1>
          <p>
            Команди, у яких маленькі внески стають великими змінами для Дніпра.
          </p>
        </div>
        <Button asChild>
          <Link to="/teams/create">
            <Plus size={18} />
            Створити команду
          </Link>
        </Button>
      </section>
      {s.identity?.recoveryMessage && (
        <p role="status" className="error-message">
          {s.identity.recoveryMessage}
        </p>
      )}
      <MyTeamInvitations />
      {!search &&
        !category &&
        !mine &&
        !query.isPending &&
        !query.isError &&
        records.length > 0 && (
          <section className="personal-section">
            <h2>Спільноти, що надихають</h2>
            <div className="story-grid">
              {records.slice(0, 3).map((r) => (
                <TeamCard
                  key={r.team.id}
                  {...r}
                  names={(s.identity?.memberships || [])
                    .filter(
                      (m) => m.teamId === r.team.id && m.status === "ACTIVE",
                    )
                    .map((m) => s.profiles[m.userId]?.name || "Волонтер")}
                />
              ))}
            </div>
          </section>
        )}
      <section className="personal-section">
        <h2>Команди міста</h2>
        <TeamFilters
          search={search}
          category={category}
          mine={mine}
          onChange={change}
        />
        <p className="field-hint" role="status">
          {query.isPending
            ? "Шукаємо спільноти…"
            : `Знайдено команд: ${records.length}`}
        </p>
        {query.isPending ? (
          <ExplorationSkeleton />
        ) : query.isError ? (
          <ExplorationError retry={() => void query.refetch()} />
        ) : records.length ? (
          <div className="story-grid">
            {records.map((r) => (
              <TeamCard
                key={r.team.id}
                {...r}
                names={(s.identity?.memberships || [])
                  .filter(
                    (m) => m.teamId === r.team.id && m.status === "ACTIVE",
                  )
                  .map((m) => s.profiles[m.userId]?.name || "Волонтер")}
              />
            ))}
          </div>
        ) : (
          <Card className="empty-state">
            <Users size={37} />
            <h2>Твоя спільнота ще попереду</h2>
            <p>Спробуй інший напрям або створи власну команду.</p>
            <Button variant="outline" onClick={() => setParams({})}>
              Скинути фільтри
            </Button>
          </Card>
        )}
      </section>
      <TeamsRanking />
      <p className="demo-caption">
        Демонстраційні команди й результати. Усі показники походять із
        підтверджених участей цього браузера.
      </p>
    </div>
  );
}
export function CreateTeamPage() {
  return (
    <div className="container page-section">
      <Link className="back-link" to="/teams">
        <ArrowLeft size={17} />
        Усі команди
      </Link>
      <TeamForm />
    </div>
  );
}
export function TeamPage({
  view = "overview",
}: {
  view?: "overview" | "members" | "quests" | "settings";
}) {
  const { slug = "" } = useParams();
  const query = useTeam(slug);
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const mutation = useTeamMutation();
  if (query.isPending)
    return (
      <div className="container page-section">
        <ExplorationSkeleton />
      </div>
    );
  if (query.isError)
    return (
      <div className="container page-section">
        <ExplorationError retry={() => void query.refetch()} />
      </div>
    );
  if (
    !query.data ||
    !visibleTeams(s, user?.id || null).some((t) => t.id === query.data?.id)
  )
    return (
      <div className="container empty-state">
        <ShieldCheck size={40} />
        <h1>Команда недоступна</h1>
        <p>
          Приватні спільноти відкриваються учасникам і запрошеним волонтерам.
        </p>
        <Button asChild>
          <Link to="/teams">Усі команди</Link>
        </Button>
      </div>
    );
  const team =
    s.identity?.teams.find((t) => t.id === query.data!.id) || query.data;
  const membership = s.identity?.memberships.find(
    (m) =>
      m.teamId === team.id && m.userId === user?.id && m.status === "ACTIVE",
  );
  const manageable =
    team.status === "ACTIVE" &&
    (membership?.role === "OWNER" || membership?.role === "MANAGER");
  const stats = teamStatistics(s, team.id);
  const rank = teamRanking(s).find((r) => r.team.id === team.id)?.statistics
    .rank;
  const quests =
    s.identity?.teamQuests.filter((r) => r.teamId === team.id) || [];
  const challenges = teamChallengeResults(s, team.id);
  const events =
    s.identity?.events
      .filter((e) => e.teamId === team.id)
      .slice()
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)) || [];
  return (
    <div className="container page-section team-page">
      <Link className="back-link" to="/teams">
        <ArrowLeft size={17} />
        Команди Дніпра
      </Link>
      <section className="team-profile-hero">
        <Photo
          src={team.coverImage}
          alt={`Тематична обкладинка ${team.name}`}
        />
        <div>
          <TeamAvatar avatar={team.avatar} />
          <div>
            <Badge>
              {team.status === "ARCHIVED"
                ? "Архівна команда"
                : team.visibility === "PRIVATE"
                  ? "За запрошенням"
                  : "Відкрита спільнота"}{" "}
              · {team.city}
            </Badge>
            <h1>{team.name}</h1>
            <p>{team.description}</p>
            <div className="team-hero-facts">
              <span>
                <Users size={16} />
                {
                  s.identity?.memberships.filter(
                    (m) => m.teamId === team.id && m.status === "ACTIVE",
                  ).length
                }{" "}
                учасників
              </span>
              <span>
                <Clock3 size={16} />
                {stats.hours} підтверджених годин
              </span>
              {rank && <span>#{rank} у загальному рейтингу</span>}
              {membership && <Badge>{teamRoleLabels[membership.role]}</Badge>}
            </div>
          </div>
        </div>
      </section>
      <nav className="personal-nav team-nav" aria-label="Розділи команди">
        <NavLink end to={`/teams/${slug}`}>
          Про команду
        </NavLink>
        <NavLink to={`/teams/${slug}/members`}>Учасники</NavLink>
        <NavLink to={`/teams/${slug}/quests`}>Квести</NavLink>
        {manageable && (
          <NavLink to={`/teams/${slug}/settings`}>Налаштування</NavLink>
        )}
      </nav>
      <div className="team-page-actions">
        {user?.role === "VOLUNTEER" &&
          !membership &&
          team.status === "ACTIVE" &&
          team.visibility === "PUBLIC" && (
            <Button
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate({ type: "JOIN_TEAM", teamId: team.id })
              }
            >
              Долучитися до команди
            </Button>
          )}
        {!user && (
          <Button asChild>
            <Link to="/login">Увійти та долучитися</Link>
          </Button>
        )}
        {membership &&
          team.status === "ACTIVE" &&
          membership.role !== "OWNER" && (
            <ActionDialog
              title="Вийти з команди?"
              description="Твій уже підтверджений командний внесок залишається в історії."
              confirmLabel="Вийти з команди"
              action={() =>
                teamsApi.mutate({ type: "LEAVE_TEAM", teamId: team.id })
              }
              trigger={<Button variant="outline">Вийти з команди</Button>}
            />
          )}
        <Link className="text-link" to="/quests?team=1">
          Знайти спільну справу <ArrowUpRight size={16} />
        </Link>
      </div>
      {mutation.isError && (
        <p className="error-message" role="alert">
          {mutation.error.message}
        </p>
      )}
      {view === "settings" ? (
        manageable ? (
          <>
            <TeamForm key={team.id} team={team} />
            {membership?.role === "OWNER" && (
              <Card className="team-archive">
                <h2>Завершення історії команди</h2>
                <p>
                  Спершу врегулюйте всі командні участі. Підтверджений внесок
                  залишиться в історії. Для передачі керування відкрий
                  учасників.
                </p>
                <ActionDialog
                  title="Архівувати команду?"
                  description="Нові вступи, запрошення й заявки будуть закриті. Історія та внески збережуться."
                  confirmLabel="Архівувати команду"
                  action={() =>
                    teamsApi.mutate({ type: "ARCHIVE_TEAM", teamId: team.id })
                  }
                  trigger={
                    <Button variant="outline">Архівувати команду</Button>
                  }
                />
              </Card>
            )}
          </>
        ) : (
          <Card className="empty-state">
            <ShieldCheck size={35} />
            <h2>Налаштування доступні власнику й координаторам</h2>
          </Card>
        )
      ) : view === "members" ? (
        <TeamMembers team={team} />
      ) : view === "quests" ? (
        <section className="personal-section">
          <h2>Наші командні справи</h2>
          <div className="team-quest-list">
            {quests.length ? (
              quests.map((r) => {
                const q = s.questRecords.find((q) => q.id === r.questId)!;
                return (
                  <Card key={r.id}>
                    <h3>
                      <Link to={`/quests/${q.id}`}>{q.title}</Link>
                    </h3>
                    <TeamQuestProgress participation={r} state={s} />
                    <TeamContributionList participation={r} state={s} />
                    <Link className="text-link" to={`/quests/${q.id}`}>
                      Відкрити квест <ArrowUpRight size={15} />
                    </Link>
                  </Card>
                );
              })
            ) : (
              <Card className="inline-empty">
                <p>
                  Оберіть квест із дозволеною командною участю. Заявку подає
                  власник або координатор.
                </p>
                <Link className="text-link" to="/quests?team=1">
                  Знайти першу спільну справу
                </Link>
              </Card>
            )}
          </div>
        </section>
      ) : (
        <>
          <TeamStats statistics={stats} />
          <section className="personal-section">
            <div className="section-heading">
              <h2>Активні командні справи</h2>
              <Link className="text-link" to={`/teams/${slug}/quests`}>
                Усі квести <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="team-quest-list">
              {quests.filter((r) =>
                ["PENDING", "APPROVED", "IN_PROGRESS", "PARTIAL"].includes(
                  r.status,
                ),
              ).length ? (
                quests
                  .filter((r) =>
                    ["PENDING", "APPROVED", "IN_PROGRESS", "PARTIAL"].includes(
                      r.status,
                    ),
                  )
                  .map((r) => (
                    <Card key={r.id}>
                      <h3>
                        <Link to={`/quests/${r.questId}`}>
                          {
                            s.questRecords.find((q) => q.id === r.questId)
                              ?.title
                          }
                        </Link>
                      </h3>
                      <TeamQuestProgress participation={r} state={s} />
                    </Card>
                  ))
              ) : (
                <Card className="inline-empty">
                  <p>
                    Зараз немає активних командних заявок. Оберіть наступну
                    спільну добру справу.
                  </p>
                  <Link className="text-link" to="/quests?team=1">
                    Знайти командний квест
                  </Link>
                </Card>
              )}
            </div>
          </section>
          <TeamAchievements achievements={teamAchievements(s, team.id)} />
          <section className="personal-section">
            <h2>Внесок у міські виклики</h2>
            <div className="identity-small-grid">
              {challenges.length ? (
                challenges.map((c) => (
                  <Card className="team-challenge-result" key={c.challenge.id}>
                    <h3>
                      <Link to={`/challenges/${c.challenge.slug}`}>
                        {c.challenge.title}
                      </Link>
                    </h3>
                    <strong>{c.hours} підтверджених годин</strong>
                    {c.goals
                      .filter((g) => g.metric !== "VOLUNTEER_HOURS")
                      .map((g) => (
                        <p key={g.id}>
                          {g.actualValue} {g.unit} · спільний результат квестів
                          команди
                        </p>
                      ))}
                    <Link
                      className="text-link"
                      to={`/challenges/${c.challenge.slug}`}
                    >
                      До спільної мети <ArrowUpRight size={15} />
                    </Link>
                  </Card>
                ))
              ) : (
                <Card className="inline-empty">
                  <p>
                    Підтвердьте пов’язаний командний квест у період міського
                    виклику.
                  </p>
                </Card>
              )}
            </div>
            <p className="field-hint">
              Колективні метрики враховуються один раз на квест. Внески різних
              команд в одному квесті можуть описувати спільний результат і не
              додаються між командами.
            </p>
          </section>
          <section className="personal-section">
            <h2>Історія спільноти</h2>
            <Card className="team-event-list">
              {events.map((e) => (
                <div key={e.id}>
                  <span className="activity-dot team" />
                  <div>
                    <strong>{e.title}</strong>
                    <time dateTime={e.date}>{formatDate(e.date)}</time>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </>
      )}
      <p className="demo-caption">
        Демонстраційна команда · Підтвердження відбувається для кожного
        волонтера окремо.
      </p>
    </div>
  );
}
