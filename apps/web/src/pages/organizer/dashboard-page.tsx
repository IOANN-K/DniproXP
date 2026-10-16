import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Flag,
  Users,
  CheckCircle2,
  Inbox,
  ArrowUpRight,
  Leaf,
} from "lucide-react";
import { useOrganizer } from "../../features/organizer/use-organizer";
import { getVolunteer } from "../../mocks/repository";
import { Card, Badge } from "../../shared/ui/primitives";
import { SectionHeading } from "../../shared/ui/section-heading";
import { formatDate } from "../../shared/lib/utils";
export function OrganizerDashboardPage() {
  const { state, user, quests, participations } = useOrganizer();
  const applications = participations.filter(
    (p) => p.applicationStatus === "pending" && p.status === "planned",
  );
  const reports = participations.filter((p) => p.status === "pending");
  const completed = participations.filter((p) => p.status === "completed");
  const events = quests
    .filter((q) => ["published", "active"].includes(q.lifecycle || ""))
    .sort((a, b) => a.date.localeCompare(b.date));
  const weeks = Array.from({ length: 7 }, (_, i) => {
    const end = state.clock - (6 - i) * 86400000;
    const date = new Date(end).toISOString().slice(0, 10);
    return {
      date,
      count: participations.filter(
        (p) => (p.updatedAt || p.createdAt).slice(0, 10) === date,
      ).length,
    };
  });
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <p className="eyebrow">ТВОЇ ІНІЦІАТИВИ ОБ’ЄДНУЮТЬ</p>
          <h2>Вітаємо, {user.name.split(" ")[0]}!</h2>
          <p>Допоможи добрим ідеям перетворитися на спільні справи.</p>
        </div>
        <span className="workspace-decoration">
          <Leaf size={43} />
        </span>
      </div>
      <div className="organizer-stats">
        {[
          { icon: Flag, value: quests.length, label: "створено квестів" },
          {
            icon: Clock3,
            value: quests.filter((q) => q.lifecycle === "active").length,
            label: "активні квести",
          },
          {
            icon: CalendarDays,
            value: quests.filter((q) => q.lifecycle === "published").length,
            label: "заплановані",
          },
          { icon: Inbox, value: applications.length, label: "нові заявки" },
          {
            icon: CheckCircle2,
            value: completed.length,
            label: "підтверджені виконання",
          },
          {
            icon: Users,
            value: new Set(
              participations
                .filter(
                  (p) =>
                    p.applicationStatus !== "rejected" &&
                    p.status !== "cancelled",
                )
                .map((p) => p.userId),
            ).size,
            label: "волонтери команди",
          },
        ].map((s) => (
          <Card className="personal-stat" key={s.label}>
            <s.icon size={21} />
            <strong>{s.value}</strong>
            <h3>{s.label}</h3>
          </Card>
        ))}
      </div>
      <div className="organizer-dashboard-grid">
        <section>
          <SectionHeading
            title="Останні заявки"
            action={<Badge>{applications.length} чекають</Badge>}
          />
          <Card className="workspace-list">
            {applications.length ? (
              applications
                .slice()
                .reverse()
                .slice(0, 5)
                .map((p) => (
                  <Link
                    to={`/organizer/quests/${p.questId}?tab=applications`}
                    key={p.id}
                  >
                    <span className="avatar">
                      {getVolunteer(p.userId, state)?.initials}
                    </span>
                    <div>
                      <strong>{getVolunteer(p.userId, state)?.name}</strong>
                      <p>{quests.find((q) => q.id === p.questId)?.title}</p>
                      <time>{formatDate(p.createdAt)}</time>
                    </div>
                    <ArrowUpRight size={18} />
                  </Link>
                ))
            ) : (
              <div className="inline-empty">
                <Inbox size={30} />
                <p>
                  Усі заявки розглянуті. Нові з’являться після запису
                  волонтерів.
                </p>
              </div>
            )}
          </Card>
        </section>
        <section>
          <SectionHeading title="Найближчі події" />
          <Card className="workspace-list">
            {events.length ? (
              events.slice(0, 4).map((q) => (
                <Link to={`/organizer/quests/${q.id}`} key={q.id}>
                  <span className="event-date">
                    <CalendarDays size={22} />
                  </span>
                  <div>
                    <strong>{q.title}</strong>
                    <time>{formatDate(q.date)}</time>
                    <p>{q.address}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <div className="inline-empty">
                <p>Створи й опублікуй свою наступну ініціативу.</p>
                <Link to="/organizer/quests/new" className="text-link">
                  Створити квест
                </Link>
              </div>
            )}
          </Card>
        </section>
        <section>
          <SectionHeading
            title="Рух спільноти"
            description="Оновлення участі за останні 7 днів демосценарію."
          />
          <Card className="activity-chart">
            {weeks.map((w) => (
              <div key={w.date}>
                <strong>{w.count}</strong>
                <span
                  style={{
                    height: `${12 + (w.count / Math.max(1, ...weeks.map((w) => w.count))) * 95}px`,
                  }}
                />
                <small>
                  {w.date.slice(8)}.{w.date.slice(5, 7)}
                </small>
              </div>
            ))}
          </Card>
        </section>
        <section>
          <SectionHeading
            title="Звіти, що чекають на тебе"
            action={<Badge>{reports.length}</Badge>}
          />
          <Card className="workspace-list">
            {reports.length ? (
              reports.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/organizer/quests/${p.questId}?tab=reports`}
                >
                  <span className="transaction-icon">
                    <CheckCircle2 size={19} />
                  </span>
                  <div>
                    <strong>{getVolunteer(p.userId, state)?.name}</strong>
                    <p>{quests.find((q) => q.id === p.questId)?.title}</p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <div className="inline-empty">
                <CheckCircle2 size={29} />
                <p>Усі звіти розглянуті.</p>
              </div>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}
