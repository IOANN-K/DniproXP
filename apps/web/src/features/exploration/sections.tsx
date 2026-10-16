import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, Flag, Trophy } from "lucide-react";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import {
  explorationOf,
  selectMissionProgress,
  selectChallengeProgress,
  selectExplorationBadges,
} from "../../mocks/exploration-selectors";
import { MissionCard } from "../../entities/mission/components";
import { CityChallengeCard } from "../../entities/challenge/components";
import { Card, Badge } from "../../shared/ui/primitives";
import { SectionHeading } from "../../shared/ui/section-heading";
import { formatDate } from "../../shared/lib/utils";

export function ExplorationEntryCards() {
  return (
    <div className="exploration-entry-grid">
      <Link className="card exploration-entry" to="/missions">
        <span className="exploration-entry-icon">
          <BookOpen size={27} />
        </span>
        <div>
          <span className="eyebrow">ТВОЯ ІСТОРІЯ</span>
          <h2>Сюжетні місії</h2>
          <p>
            Пов’язані добрі справи, нові етапи й окрема відзнака за пройдений
            шлях.
          </p>
        </div>
        <ArrowUpRight size={24} />
      </Link>
      <Link className="card exploration-entry" to="/challenges">
        <span className="exploration-entry-icon">
          <Flag size={27} />
        </span>
        <div>
          <span className="eyebrow">НАША СПІЛЬНА МЕТА</span>
          <h2>Міські виклики</h2>
          <p>
            Об’єднуй внесок із сусідами. Кожна підтверджена дія наближає зміни.
          </p>
        </div>
        <ArrowUpRight size={24} />
      </Link>
    </div>
  );
}

export function PersonalExploration({
  userId,
  publicProfile = false,
}: {
  userId: string;
  publicProfile?: boolean;
}) {
  const s = useVolunteerState();
  const epic = explorationOf(s);
  const missions = epic.missions
    .filter((m) => m.status !== "DRAFT")
    .map((mission) => ({
      mission,
      progress: selectMissionProgress(s, mission.id, userId)!,
    }))
    .filter((r) =>
      publicProfile
        ? r.progress.status === "COMPLETED"
        : r.progress.enrolled ||
          r.progress.requiredCompleted > 0 ||
          r.progress.optionalCompleted > 0 ||
          r.progress.steps.some((step) => step.status === "IN_PROGRESS"),
    )
    .sort(
      (a, b) =>
        Number(b.progress.status === "IN_PROGRESS") -
          Number(a.progress.status === "IN_PROGRESS") ||
        b.progress.percentage - a.progress.percentage,
    );
  const visibleMissions = publicProfile
    ? missions.slice(0, 3)
    : [
        ...missions
          .filter((r) => r.progress.status !== "COMPLETED")
          .slice(0, 2),
        ...missions
          .filter((r) => r.progress.status === "COMPLETED")
          .slice(0, 1),
      ];
  for (const record of missions) {
    if (visibleMissions.length >= 3) break;
    if (!visibleMissions.some((r) => r.mission.id === record.mission.id))
      visibleMissions.push(record);
  }
  const challenges = epic.challenges
    .filter((c) => c.status !== "DRAFT")
    .map((challenge) => ({
      challenge,
      progress: selectChallengeProgress(s, challenge.id)!,
    }))
    .filter(
      (r) =>
        r.progress.ranking.some((p) => p.userId === userId) ||
        (!publicProfile &&
          (r.challenge.participantIds.includes(userId) ||
            epic.challengeParticipants.some(
              (p) => p.userId === userId && p.challengeId === r.challenge.id,
            ))),
    );
  return (
    <>
      <section className="personal-section">
        <SectionHeading
          title={publicProfile ? "Пройдені сюжетні місії" : "Мої місії"}
          description={
            publicProfile
              ? "Історії, де всі основні етапи підтверджено."
              : "Твій шлях, наступні кроки та окремі бонуси за завершення."
          }
          action={
            <Link className="text-link" to="/missions">
              Усі місії <ArrowUpRight size={17} />
            </Link>
          }
        />
        {missions.length ? (
          <div className="story-grid">
            {visibleMissions.map((r) => (
              <div className="personal-story" key={r.mission.id}>
                <MissionCard {...r} />
                {!publicProfile && r.progress.nextStepId && (
                  <Link
                    className="personal-story-next"
                    to={`/quests/${r.mission.steps.find((step) => step.id === r.progress.nextStepId)!.questId}`}
                  >
                    <span>
                      Наступний квест:{" "}
                      {
                        r.mission.steps.find(
                          (step) => step.id === r.progress.nextStepId,
                        )!.title
                      }
                    </span>
                    <ArrowUpRight size={18} />
                  </Link>
                )}
                {r.progress.status === "COMPLETED" && (
                  <p className="personal-story-next">
                    <Trophy size={18} />
                    {r.progress.rewardClaimed
                      ? "Фінальний бонус та відзнаку отримано"
                      : "Фінальний бонус доступний на сторінці місії"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Card className="inline-empty">
            <BookOpen size={29} />
            <p>
              {publicProfile
                ? "Перші завершені історії ще попереду."
                : "Обери свою історію. Уже підтверджені квести в її періоді також враховуються."}
            </p>
            <Link className="text-link" to="/missions">
              Переглянути місії <ArrowUpRight size={16} />
            </Link>
          </Card>
        )}
        {missions.length > 3 && (
          <p className="field-hint">
            Показано 3 з {missions.length} місій. Повний прогрес доступний у
            каталозі.
          </p>
        )}
      </section>
      {!publicProfile && (
        <section className="personal-section">
          <SectionHeading
            title="Мої міські виклики"
            description="Особистий внесок у спільну мету міста."
            action={
              <Link className="text-link" to="/challenges">
                Усі виклики <ArrowUpRight size={17} />
              </Link>
            }
          />
          {challenges.length ? (
            <div className="story-grid">
              {challenges.slice(0, 3).map((r) => (
                <CityChallengeCard key={r.challenge.id} {...r} now={s.clock} />
              ))}
            </div>
          ) : (
            <Card className="inline-empty">
              <Flag size={29} />
              <p>Знайди спільну мету й долучайся до пов’язаних квестів.</p>
              <Link className="text-link" to="/challenges">
                Обрати міський виклик <ArrowUpRight size={16} />
              </Link>
            </Card>
          )}
        </section>
      )}
      <ExplorationAchievements userId={userId} />
    </>
  );
}

export function ExplorationAchievements({ userId }: { userId: string }) {
  const state = useVolunteerState();
  const badges = selectExplorationBadges(state, userId);
  return (
    <section className="personal-section">
      <SectionHeading
        title="Відзнаки історій та спільних перемог"
        description="Особливі досягнення, отримані разом із одноразовими фінальними нагородами."
      />
      {badges.length ? (
        <div className="story-badge-grid">
          {badges.map((b) => (
            <Link className="card story-earned-badge" to={b.href} key={b.id}>
              <Trophy size={29} />
              <div>
                <Badge>Отримано {formatDate(b.date)}</Badge>
                <h3>{b.title}</h3>
                <p>{b.description}</p>
                <small>{b.sourceTitle}</small>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          ))}
        </div>
      ) : (
        <Card className="inline-empty">
          <Trophy size={28} />
          <p>
            Відзнаки з’являться після завершення місії або спільної мети виклику
            та отримання фінального бонусу.
          </p>
        </Card>
      )}
    </section>
  );
}

export function QuestExplorationLinks({ questId }: { questId: string }) {
  const s = useVolunteerState();
  const epic = explorationOf(s);
  const missions = epic.missions.filter(
    (m) =>
      m.status !== "DRAFT" && m.steps.some((step) => step.questId === questId),
  );
  const challenges = epic.challenges.filter(
    (c) => c.status !== "DRAFT" && c.relatedQuestIds.includes(questId),
  );
  if (!missions.length && !challenges.length) return null;
  return (
    <section className="detail-section quest-exploration">
      <h2>Ця добра справа — частина більшого</h2>
      <p>
        Підтверджений внесок може продовжити історію та наблизити спільну мету в
        межах її дат.
      </p>
      <div>
        {missions.map((m) => (
          <Link key={m.id} to={`/missions/${m.slug}`}>
            <BookOpen size={19} />
            <span>
              <small>СЮЖЕТНА МІСІЯ</small>
              <strong>{m.title}</strong>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        ))}
        {challenges.map((c) => (
          <Link key={c.id} to={`/challenges/${c.slug}`}>
            <Flag size={19} />
            <span>
              <small>МІСЬКИЙ ВИКЛИК</small>
              <strong>{c.title}</strong>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
