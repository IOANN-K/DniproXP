import { OrganizerTeamApplications } from "../../features/team-participation/components";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Users,
  Zap,
  Coins,
  FileCheck2,
  Inbox,
  CheckCircle2,
} from "lucide-react";
import { useOrganizer } from "../../features/organizer/use-organizer";
import {
  getVolunteer,
  questStatusLabels,
  pointsForQuest,
} from "../../mocks/repository";
import { organizerApi } from "../../mocks/organizer-api";
import { QuestActions } from "../../features/organizer/quest-actions";
import { Card, Badge, Photo } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { ActionDialog } from "../../shared/ui/action-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../shared/ui/tabs";
import { formatDate } from "../../shared/lib/utils";
import type { Participation, Quest } from "../../entities/types";
const groups = [
  ["all", "Усі"],
  ["applications", "Нові заявки"],
  ["approved", "Схвалені"],
  ["reports", "Звіти"],
  ["rejected", "Відхилені"],
  ["completed", "Завершені"],
  ["cancelled", "Скасовані"],
];
function matches(p: Participation, tab: string) {
  return (
    tab === "all" ||
    (tab === "applications" &&
      p.applicationStatus === "pending" &&
      p.status === "planned") ||
    (tab === "approved" &&
      p.applicationStatus === "approved" &&
      ["planned", "active"].includes(p.status)) ||
    (tab === "reports" && p.status === "pending") ||
    (tab === "rejected" && p.applicationStatus === "rejected") ||
    (tab === "completed" && p.status === "completed") ||
    (tab === "cancelled" &&
      p.status === "cancelled" &&
      p.applicationStatus !== "rejected")
  );
}
export function OrganizerQuestDetailPage() {
  const { id } = useParams();
  const { state, quests, participations } = useOrganizer();
  const [params, setParams] = useSearchParams();
  const tab = groups.some(([id]) => id === params.get("tab"))
    ? params.get("tab")!
    : "all";
  const q = quests.find((q) => q.id === id);
  if (!q)
    return (
      <Card className="empty-state">
        <h2>Квест не знайдено у твоїй організації</h2>
        <Button asChild>
          <Link to="/organizer/quests">До своїх квестів</Link>
        </Button>
      </Card>
    );
  const entries = participations.filter((p) => p.questId === id);
  return (
    <>
      <Link className="back-link" to="/organizer/quests">
        <ArrowLeft size={16} />
        До своїх квестів
      </Link>
      <Card className="organizer-quest-hero">
        <Photo src={q.image} alt={q.imageAlt} />
        <div>
          <div className="managed-quest-labels">
            <Badge>{questStatusLabels[q.lifecycle || "published"]}</Badge>
            <Badge>
              {q.moderation === "pending"
                ? "Очікує модерації"
                : q.moderation === "rejected"
                  ? "Приховано"
                  : "Модерацію пройдено"}
            </Badge>
          </div>
          <h2>{q.title}</h2>
          <p>{q.description || "Короткий опис ще не заповнений."}</p>
          <div className="organizer-quest-facts">
            <span>
              <CalendarDays size={16} />
              {q.date ? formatDate(q.date) : "Дата ще не визначена"}
            </span>
            <span>
              <MapPin size={16} />
              {q.address || "Локація ще не визначена"}
            </span>
            <span>
              <Users size={16} />
              {entries.filter((p) => p.status !== "cancelled").length} заявок ·{" "}
              {q.capacity} місць
            </span>
            <span>
              <Zap size={16} />
              {q.xp} XP
            </span>
            <span>
              <Coins size={16} />
              {pointsForQuest(q)} бонусних балів
            </span>
          </div>
          <QuestActions quest={q} />
          {q.moderationReason && (
            <p className="error-message">
              Причина модерації: {q.moderationReason}
            </p>
          )}
          <div className="organizer-detail-links">
            {q.lifecycle !== "draft" && q.moderation === "approved" && (
              <Link to={`/quests/${q.id}`} className="text-link">
                Публічний вигляд <ArrowUpRight size={15} />
              </Link>
            )}
            <Link
              to={`/organizations/${q.organizationId}`}
              className="text-link"
            >
              Сторінка організації <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </Card>
      <OrganizerTeamApplications questId={q.id} />
      <section className="personal-section">
        <div className="section-heading">
          <div>
            <h2>Люди, які долучаються</h2>
            <p className="muted">
              Схвалюй заявки, перевіряй внесок і дякуй за добрі справи.
            </p>
          </div>
          <Badge>{entries.length} заявок</Badge>
        </div>
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
          <TabsList className="participant-tabs" aria-label="Статуси учасників">
            {groups.map(([key, title]) => (
              <TabsTrigger key={key} value={key}>
                {title}
                <span>{entries.filter((p) => matches(p, key)).length}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map(([key]) => (
            <TabsContent key={key} value={key}>
              <div className="participant-list">
                {entries
                  .filter((p) => matches(p, key))
                  .map((p) => (
                    <Participant
                      key={p.id}
                      participation={p}
                      quest={q}
                      name={getVolunteer(p.userId, state)?.name || "Учасник"}
                    />
                  ))}
              </div>
              {!entries.some((p) => matches(p, key)) && (
                <Card className="empty-state">
                  <Inbox size={35} />
                  <h2>Зараз тут немає заявок</h2>
                  <p>
                    Нові записи волонтерів і подані звіти з’являтимуться
                    автоматично.
                  </p>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </>
  );
}
function Participant({
  participation: p,
  quest: q,
  name,
}: {
  participation: Participation;
  quest: Quest;
  name: string;
}) {
  const canReview = ["published", "active"].includes(q.lifecycle || "");
  return (
    <Card className="participant-card">
      <div className="participant-heading">
        <span className="avatar">
          {name
            .split(" ")
            .slice(0, 2)
            .map((s) => s[0])
            .join("")}
        </span>
        <div>
          <h3>
            <Link to={`/profile/${p.userId}`}>{name}</Link>
          </h3>
          <p>Заявка від {formatDate(p.createdAt)}</p>
        </div>
        <Badge>
          {p.applicationStatus === "rejected"
            ? "Заявку відхилено"
            : p.status === "cancelled"
              ? "Участь скасовано"
              : p.status === "completed"
                ? "Виконання підтверджено"
                : p.status === "pending"
                  ? "Звіт на перевірці"
                  : p.applicationStatus === "pending"
                    ? "Очікує схвалення"
                    : "Участь схвалено"}
        </Badge>
      </div>
      {p.applicationReason && (
        <p className="error-message">{p.applicationReason}</p>
      )}
      {p.report && (
        <div className="participant-report">
          <div>
            <h4>
              <FileCheck2 size={18} />
              Звіт волонтера
            </h4>
            <p>{p.report.text}</p>
            <small>{formatDate(p.report.submittedAt)}</small>
            {p.reportRejectionReason && (
              <p className="error-message">
                На доопрацювання: {p.reportRejectionReason}
              </p>
            )}
            {!!p.reportHistory?.length && (
              <span className="field-hint">
                Попередніх версій: {p.reportHistory.length}
              </span>
            )}
          </div>
          {p.report.photo && (
            <Photo src={p.report.photo} alt="Демонстраційне фото зі звіту" />
          )}
        </div>
      )}
      <div className="participant-actions">
        {canReview &&
          p.applicationStatus === "pending" &&
          p.status === "planned" && (
            <>
              <ActionDialog
                title="Схвалити участь?"
                description="У демонстраційному сценарії участь одразу стане активною: волонтер зможе виконати завдання та подати звіт. Нагорода за схвалення не нараховується."
                confirmLabel="Схвалити заявку"
                action={() =>
                  organizerApi.reviewApplication(q.id, p.userId, true, "")
                }
                trigger={
                  <Button size="sm">
                    <CheckCircle2 size={16} />
                    Схвалити
                  </Button>
                }
              />
              <ActionDialog
                title="Відхилити заявку"
                description="Волонтер побачить пояснення у своїх квестах. Повторна заявка на цей квест буде недоступна."
                confirmLabel="Відхилити заявку"
                reasonRequired
                action={(reason) =>
                  organizerApi.reviewApplication(q.id, p.userId, false, reason)
                }
                trigger={
                  <Button variant="outline" size="sm">
                    Відхилити
                  </Button>
                }
              />
            </>
          )}
        {p.status === "pending" && q.lifecycle !== "cancelled" && (
          <>
            <ActionDialog
              title="Підтвердити виконання?"
              description={`${name} отримає ${q.xp} XP та ${pointsForQuest(q)} бонусних балів. Результат оновить профіль, статистику, історію й рейтинг. Повторне підтвердження не створить другу нагороду.`}
              confirmLabel="Підтвердити виконання"
              action={() => organizerApi.confirm(q.id, p.userId)}
              trigger={
                <Button size="sm">
                  <CheckCircle2 size={16} />
                  Підтвердити виконання
                </Button>
              }
            />
            <ActionDialog
              title="Повернути звіт на доопрацювання"
              description="Поясни, чого бракує. Участь повернеться в активний стан, і волонтер зможе подати уточнений звіт. XP та бали не нараховуються."
              confirmLabel="Повернути звіт"
              reasonRequired
              action={(reason) =>
                organizerApi.rejectReport(q.id, p.userId, reason)
              }
              trigger={
                <Button size="sm" variant="outline">
                  Повернути з причиною
                </Button>
              }
            />
          </>
        )}
        {p.status === "completed" && (
          <span className="completed-award">
            <CheckCircle2 size={18} />
            Нараховано: {p.awardedXp ?? q.xp} XP ·{" "}
            {p.awardedPoints ?? pointsForQuest(q)} балів
          </span>
        )}
        <Link to={`/profile/${p.userId}`} className="text-link">
          Профіль волонтера <ArrowUpRight size={15} />
        </Link>
      </div>
    </Card>
  );
}
