import { MissionTeamContext } from "../../features/teams/integration";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Trophy,
} from "lucide-react";
import {
  useMission,
  useJoinMission,
} from "../../features/mission-progress/hooks";
import { useSession } from "../../features/session/store";
import { DemoDialog } from "../../features/session/demo-dialog";
import { MissionCompletionDialog } from "../../features/mission-progress/completion-dialog";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import {
  selectMissionProgress,
  activitiesOf,
} from "../../mocks/exploration-selectors";
import {
  MissionHero,
  MissionTimeline,
  MissionProgressOverview,
  MissionRewardPreview,
  MissionStoryNote,
} from "../../entities/mission/components";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { SectionHeading } from "../../shared/ui/section-heading";
import {
  ExplorationSkeleton,
  ExplorationError,
  ExplorationMissing,
} from "../../shared/ui/exploration-states";
import { formatDate } from "../../shared/lib/utils";
export function MissionDetailsPage() {
  const { slug = "" } = useParams();
  const query = useMission(slug);
  const join = useJoinMission();
  const state = useVolunteerState();
  const user = useSession((s) => s.user);
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
  if (!query.data) return <ExplorationMissing kind="mission" />;
  const mission =
    state.exploration?.missions.find((m) => m.id === query.data!.id) ||
    query.data;
  const org = state.organizations.find((o) => o.id === mission.organizationId)!;
  const volunteer = user?.role === "VOLUNTEER";
  const progress = selectMissionProgress(
    state,
    mission.id,
    volunteer ? user.id : "",
  )!;
  const history = activitiesOf(state)
    .filter(
      (a) =>
        volunteer &&
        a.userId === user.id &&
        mission.steps.some((s) => s.questId === a.questId) &&
        (!mission.startsAt ||
          Date.parse(a.occurredAt) >= Date.parse(mission.startsAt)) &&
        (!mission.endsAt ||
          Date.parse(a.occurredAt) <= Date.parse(mission.endsAt)),
    )
    .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  return (
    <div className="container page-section exploration-page">
      <Link className="back-link" to="/missions">
        <ArrowLeft size={17} />
        Усі сюжетні місії
      </Link>
      <MissionHero mission={mission} organization={org} />
      <div className="mission-detail-layout">
        <article>
          <section className="story-description">
            <p className="eyebrow">КІЛЬКА ЗУСТРІЧЕЙ. ОДНА СПІЛЬНА ІСТОРІЯ.</p>
            <h2>Про цю місію</h2>
            <p>{mission.description}</p>
            <MissionStoryNote />
          </section>
          <section className="personal-section">
            <SectionHeading
              title="Кроки твоєї історії"
              description="Заблоковані етапи відкриваються після підтвердження потрібних попередніх внесків."
            />
            <MissionTimeline
              mission={mission}
              progress={progress}
              quests={state.questRecords}
            />
          </section>
          <section className="personal-section">
            <SectionHeading title="Історія твоїх підтверджених епізодів" />
            {history.length ? (
              <Card className="story-history">
                {history.map((a) => (
                  <Link to={`/quests/${a.questId}`} key={a.id}>
                    <CheckCircle2 size={19} />
                    <div>
                      <strong>
                        {
                          mission.steps.find((s) => s.questId === a.questId)
                            ?.title
                        }
                      </strong>
                      <time dateTime={a.occurredAt}>
                        {formatDate(a.occurredAt)}
                      </time>
                    </div>
                  </Link>
                ))}
              </Card>
            ) : (
              <Card className="inline-empty">
                <BookOpen size={32} />
                <p>
                  {volunteer
                    ? "Перший підтверджений епізод з’явиться тут після перевірки організатором."
                    : "Увійди як волонтер, щоб бачити власну історію."}
                </p>
              </Card>
            )}
            {progress.completedAt && volunteer && (
              <p className="story-verified-note">
                <CheckCircle2 size={18} />
                Усі основні етапи підтверджені:{" "}
                {formatDate(progress.completedAt)}.
              </p>
            )}
          </section>
        </article>
        <aside>
          <MissionTeamContext questIds={mission.steps.map((s) => s.questId)} />
          <MissionProgressOverview
            mission={mission}
            progress={volunteer ? progress : null}
          />
          <Card className="mission-reward-panel">
            <span className="story-reward-icon">
              <Trophy size={32} />
            </span>
            <h2>За завершену історію</h2>
            <p>
              Бонус до досвіду, бонусні бали та особлива відзнака. Нагороди за
              кожен квест залишаються окремими.
            </p>
            <MissionRewardPreview reward={mission.rewards} />
            <Badge>{mission.rewards.achievement.title}</Badge>
            {volunteer ? (
              <>
                {progress.status === "COMPLETED" ? (
                  <>
                    <p className="success-message">
                      <CheckCircle2 size={18} />
                      Ти пройшов основну історію!
                    </p>
                    <MissionCompletionDialog
                      mission={mission}
                      progress={progress}
                    />
                  </>
                ) : (
                  <Button
                    disabled={
                      join.isPending ||
                      progress.enrolled ||
                      progress.status === "LOCKED"
                    }
                    onClick={() => join.mutate(mission.id)}
                  >
                    {join.isPending
                      ? "Додаємо місію…"
                      : progress.enrolled
                        ? "Місія у твоєму просторі"
                        : progress.status === "LOCKED"
                          ? "Спочатку виконай передумови"
                          : "Додати до моїх місій"}
                  </Button>
                )}
                {join.isError && (
                  <p className="error-message" role="alert">
                    {join.error.message}
                  </p>
                )}
              </>
            ) : (
              <DemoDialog>
                <Button>Відкрити з демопрофілем волонтера</Button>
              </DemoDialog>
            )}
          </Card>
          <Card className="story-period">
            <Clock3 size={22} />
            <div>
              <h3>Час для цієї історії</h3>
              <p>
                {mission.startsAt
                  ? formatDate(mission.startsAt)
                  : "Без дати початку"}{" "}
                —{" "}
                {mission.endsAt
                  ? formatDate(mission.endsAt)
                  : "без кінцевої дати"}
              </p>
              <small>
                Дата демонстрації: 16 жовтня 2026. Попередні підтвердження в
                межах періоду зараховуються.
              </small>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
