import { ChallengeTeamContext } from "../../features/teams/integration";
import { quantity } from "../../entities/challenge/presentation";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Flag,
  Users,
} from "lucide-react";
import {
  useChallenge,
  useJoinChallenge,
} from "../../features/challenge-progress/hooks";
import { useSession } from "../../features/session/store";
import { DemoDialog } from "../../features/session/demo-dialog";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import {
  activitiesOf,
  explorationOf,
  selectChallengeProgress,
} from "../../mocks/exploration-selectors";
import { getVolunteer, publicQuests } from "../../mocks/repository";
import {
  challengeRewardAvailable,
  personalChallengeContribution,
} from "../../entities/challenge/progress";
import {
  ChallengeHero,
  BossProgress,
  ChallengeGoalCard,
  ChallengeLeaderboard,
  ChallengeContributionChart,
  ChallengeActivityFeed,
  ChallengeRewardCard,
  ChallengeCountdown,
  RelatedQuests,
} from "../../entities/challenge/components";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { ActionDialog } from "../../shared/ui/action-dialog";
import { SectionHeading } from "../../shared/ui/section-heading";
import {
  ExplorationSkeleton,
  ExplorationError,
  ExplorationMissing,
} from "../../shared/ui/exploration-states";
import { challengesRepository } from "../../mocks/challenges-api";
export function ChallengeDetailsPage() {
  const { slug = "" } = useParams();
  const query = useChallenge(slug);
  const join = useJoinChallenge();
  const state = useVolunteerState();
  const user = useSession((s) => s.user);
  const [peopleLimit, setPeopleLimit] = useState(8);
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
  if (!query.data) return <ExplorationMissing kind="challenge" />;
  const epic = explorationOf(state);
  const challenge =
    epic.challenges.find((c) => c.id === query.data!.id) || query.data;
  const result = selectChallengeProgress(state, challenge.id)!;
  const org = state.organizations.find(
    (o) => o.id === challenge.organizationId,
  )!;
  const activities = activitiesOf(state);
  const volunteer = user?.role === "VOLUNTEER";
  const joined =
    volunteer &&
    (challenge.participantIds.includes(user.id) ||
      epic.challengeParticipants.some(
        (p) => p.userId === user.id && p.challengeId === challenge.id,
      ));
  const personal = personalChallengeContribution(
    challenge,
    volunteer ? user.id : "",
    activities,
    result.contributions,
  );
  const canClaim =
    volunteer &&
    challengeRewardAvailable(
      challenge,
      user.id,
      result,
      activities,
      state.transactions,
    );
  const claimed =
    volunteer &&
    state.transactions.some(
      (t) =>
        t.id === `challenge:${challenge.id}:${user.id}` &&
        t.kind === "CHALLENGE_REWARD",
    );
  const people = state.accounts
    .filter((a) => a.role === "VOLUNTEER")
    .map((a) => getVolunteer(a.id, state)!);
  const publicIds = new Set(publicQuests(state).map((q) => q.id));
  const quests = state.questRecords.filter(
    (q) =>
      challenge.relatedQuestIds.includes(q.id) &&
      (publicIds.has(q.id) ||
        q.id.startsWith("history-") ||
        state.participations.some(
          (p) => p.questId === q.id && p.userId === user?.id,
        )),
  );
  return (
    <div className="container page-section exploration-page">
      <Link to="/challenges" className="back-link">
        <ArrowLeft size={17} />
        Усі міські виклики
      </Link>
      <ChallengeHero
        challenge={challenge}
        progress={result}
        organization={org}
      />
      <section className="challenge-progress-overview">
        <BossProgress progress={result} />
        <div>
          <p className="eyebrow">РАЗОМ НАБЛИЖАЄМО ЗМІНИ</p>
          <h2>
            {result.complete
              ? "Спільна мета стала результатом"
              : result.status === "EXPIRED"
                ? "Період закінчився. Внесок залишився."
                : result.status === "CANCELLED"
                  ? "Цей виклик скасовано"
                  : "У великої мети багато добрих рук"}
          </h2>
          <p>{challenge.description}</p>
          <ChallengeCountdown
            challenge={challenge}
            status={result.status}
            now={state.clock}
          />
          {result.complete && (
            <p className="success-message">
              <CheckCircle2 size={19} />
              Усі обов’язкові цілі виконані. Фактичні результати збережено
              повністю — навіть понад початкову мету.
            </p>
          )}
          {volunteer ? (
            <Button
              disabled={join.isPending || joined || result.status !== "ACTIVE"}
              onClick={() => join.mutate(challenge.id)}
            >
              {join.isPending
                ? "Зберігаємо…"
                : joined
                  ? "Виклик у твоєму просторі"
                  : result.status === "ACTIVE"
                    ? "Додати до моїх викликів"
                    : "Нові долучення закриті"}
            </Button>
          ) : (
            <DemoDialog>
              <Button>Відкрити як волонтер</Button>
            </DemoDialog>
          )}
          {join.isError && (
            <p className="error-message" role="alert">
              {join.error.message}
            </p>
          )}
          <p className="field-hint">
            Долучення не створює внеску. Результат зараховується лише після
            підтвердження пов’язаного квесту в період виклику.
          </p>
        </div>
      </section>
      <section className="personal-section">
        <SectionHeading
          title="Кожна ціль має свій вимір"
          description="Жодних сум годин і кілограмів: у кожної мети свій фактичний результат."
        />
        <div className="challenge-goals-grid">
          {result.goals.map((g) => (
            <ChallengeGoalCard key={g.id} goal={g} />
          ))}
        </div>
      </section>
      <div className="personal-stats challenge-result-stats">
        <Card className="personal-stat">
          <Users size={22} />
          <strong>{result.contributorCount}</strong>
          <h3>волонтерів із підтвердженим внеском</h3>
        </Card>
        <Card className="personal-stat">
          <Clock3 size={22} />
          <strong>{quantity(result.hours)}</strong>
          <h3>особистих годин волонтерства разом</h3>
        </Card>
        <Card className="personal-stat">
          <Flag size={22} />
          <strong>{challenge.relatedQuestIds.length}</strong>
          <h3>пов’язаних квестів</h3>
        </Card>
        <Card className="personal-stat">
          <Users size={22} />
          <strong>{result.participantCount}</strong>
          <h3>долучилися або вже зробили внесок</h3>
        </Card>
      </div>
      <ChallengeTeamContext challengeId={challenge.id} />
      <div className="challenge-detail-columns">
        <div>
          <section>
            <SectionHeading title="Як зростає спільний внесок" />
            <ChallengeContributionChart progress={result} />
          </section>
          <section className="personal-section">
            <SectionHeading
              title="Волонтери, які наближають зміни"
              description="Особисті години з підтверджених участей у пов’язаних квестах."
            />
            <ChallengeLeaderboard ranking={result.ranking} people={people} />
          </section>
          <section className="personal-section">
            <SectionHeading title="Історія підтверджених внесків" />
            <ChallengeActivityFeed
              contributions={result.contributions}
              people={people}
              quests={state.questRecords}
            />
          </section>
        </div>
        <aside>
          <Card className="challenge-personal-card">
            <p className="eyebrow">ТВОЯ ЧАСТИНКА СПІЛЬНОГО</p>
            <h2>
              {volunteer
                ? "Внесок, який має значення"
                : "Кожна дія може стати початком"}
            </h2>
            {volunteer ? (
              <>
                <div className="personal-contribution-values">
                  <span>
                    <strong>{quantity(personal.hours)}</strong>особистих годин
                  </span>
                  <span>
                    <strong>{personal.quests}</strong>підтверджених квестів
                  </span>
                </div>
                {personal.sharedResults.length > 0 && (
                  <div className="personal-shared-results">
                    <h3>Твої квести додали разом</h3>
                    {personal.sharedResults.map((c) => (
                      <span key={c.id}>
                        {quantity(c.value)} {c.unit} ·{" "}
                        {
                          result.goals.find((g) => g.id === c.goalId)
                            ?.description
                        }
                      </span>
                    ))}
                    <p>
                      Це спільні результати квестів, а не твої особисті
                      кілограми чи дерева. Вони не множаться на кількість
                      учасників.
                    </p>
                  </div>
                )}
                {!personal.quests && (
                  <p>
                    Виконай пов’язаний квест і дочекайся підтвердження
                    організатора в межах дат виклику.
                  </p>
                )}
              </>
            ) : (
              <p>
                Увійди як волонтер, щоб бачити власний підтверджений внесок.
              </p>
            )}
          </Card>
          <ChallengeRewardCard challenge={challenge}>
            {volunteer ? (
              <>
                <Badge>
                  {claimed
                    ? "Фінальний бонус отримано"
                    : canClaim
                      ? "Нагорода доступна"
                      : "Потрібні спільна мета й особистий внесок"}
                </Badge>
                <ActionDialog
                  title="Спільна перемога має продовження"
                  description={`Ти долучився підтвердженою доброю справою до завершеного виклику. Одноразовий бонус: ${challenge.rewards.xp} XP та ${challenge.rewards.rewardPoints} балів. Базові нагороди за квести повторно не нараховуються.`}
                  confirmLabel="Отримати бонус та відзнаку"
                  action={() => challengesRepository.claimReward(challenge.id)}
                  trigger={
                    <Button disabled={!canClaim || claimed}>
                      {claimed
                        ? "Бонус уже отримано"
                        : "Отримати нагороду виклику"}
                    </Button>
                  }
                />
              </>
            ) : (
              <DemoDialog>
                <Button>Увійти як волонтер</Button>
              </DemoDialog>
            )}
          </ChallengeRewardCard>
          <Card className="challenge-participants">
            <h3>Разом у цій історії</h3>
            {result.participants.slice(0, peopleLimit).map((id) => {
              const person = people.find((p) => p.id === id);
              return (
                <Link to={`/profile/${id}`} key={id}>
                  <span className="avatar">{person?.initials || "В"}</span>
                  <span>{person?.name || "Волонтер"}</span>
                  <ArrowUpRight size={15} />
                </Link>
              );
            })}
            {!result.participants.length && <p>Перші долучення ще попереду.</p>}
            {result.participants.length > peopleLimit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPeopleLimit((n) => n + 8)}
              >
                Показати ще учасників
              </Button>
            )}
          </Card>
        </aside>
      </div>
      <section className="personal-section">
        <SectionHeading
          title="Квести, які наближають цю мету"
          description="Лише ці явно пов’язані квести можуть додати внесок у виклик."
        />
        <RelatedQuests quests={quests} />
        {quests.length < challenge.relatedQuestIds.length && (
          <p className="demo-caption">
            Частина пов’язаних квестів зараз недоступна для відкритого
            перегляду.
          </p>
        )}
      </section>
      <p className="demo-caption">
        Це демонстраційні результати, а не реальні показники міста. Спільні
        вимірювання є заздалегідь заданими прикладами та активуються лише після
        наявного підтвердження виконання.
      </p>
    </div>
  );
}
