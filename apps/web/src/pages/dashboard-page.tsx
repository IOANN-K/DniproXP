import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Flag,
  Sparkles,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { VolunteerShell } from "../features/session/volunteer-shell";
import { useVolunteer, useVolunteerState } from "../shared/lib/use-volunteer";
import { Card, Badge } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { SectionHeading } from "../shared/ui/section-heading";
import {
  XPProgress,
  LevelBadge,
  VolunteerAvatar,
  RewardPointsBalance,
  AchievementGrid,
  XPTransactionHistory,
} from "../entities/gamification/components";
import { allQuests } from "../mocks/history";
import { quests } from "../mocks/data";
import { QuestCard } from "../entities/quest/quest-card";
import { formatDate } from "../shared/lib/utils";
import { participationLabels } from "../features/participation/participation-actions";
export function DashboardPage() {
  return (
    <VolunteerShell>
      <Dashboard />
    </VolunteerShell>
  );
}
function Dashboard() {
  const user = useVolunteer()!;
  const state = useVolunteerState();
  const mine = state.participations.filter((p) => p.userId === user.id);
  const active = mine.filter(
    (p) => p.status === "active" || p.status === "pending",
  );
  const planned = mine
    .filter((p) => p.status === "planned")
    .map((p) => allQuests.find((q) => q.id === p.questId)!)
    .sort((a, b) => a.date.localeCompare(b.date));
  const completedCategories = mine
    .filter((p) => p.status === "completed")
    .map((p) => allQuests.find((q) => q.id === p.questId)?.categoryId);
  const recommended = quests
    .filter(
      (q) =>
        q.status === "available" &&
        q.participants < q.capacity &&
        !mine.some((p) => p.questId === q.id && p.status !== "cancelled"),
    )
    .sort(
      (a, b) =>
        Number(completedCategories.includes(b.categoryId)) -
          Number(completedCategories.includes(a.categoryId)) ||
        a.date.localeCompare(b.date),
    )
    .slice(0, 3);
  const activity = state.activity
    .filter((a) => a.userId === user.id)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <p className="eyebrow">ТВОЯ ЕНЕРГІЯ ЗМІНЮЄ МІСТО</p>
          <h1>Привіт, {user.name.split(" ")[0]}!</h1>
          <p>Ще один день, щоб зробити Дніпро трохи кращим.</p>
        </div>
        <Button asChild>
          <Link to="/quests">
            Знайти добру справу <ArrowUpRight size={17} />
          </Link>
        </Button>
      </div>
      <div className="dashboard-overview">
        <Card className="dashboard-identity">
          <div className="identity-top">
            <VolunteerAvatar user={user} large />
            <div>
              <LevelBadge xp={user.xp} />
              <h2>{user.name}</h2>
              <Link to="/profile" className="text-link">
                Мій профіль <ArrowUpRight size={15} />
              </Link>
            </div>
            <span className="identity-spark">
              <Sparkles size={35} />
            </span>
          </div>
          <XPProgress xp={user.xp} />
        </Card>
        <Card className="dashboard-points">
          <RewardPointsBalance balance={user.points} />
          <p>
            Витрачай на приємності. Твій накопичений XP залишається з тобою.
          </p>
          <Link to="/rewards" className="text-link">
            Обрати винагороду <ArrowUpRight size={17} />
          </Link>
        </Card>
      </div>
      <div className="personal-stats">
        {[
          {
            icon: CheckCircle2,
            value: user.questsCompleted,
            label: "завершені квести",
            note: "Підтверджені добрі справи",
          },
          {
            icon: Clock3,
            value: user.hours.toLocaleString("uk-UA"),
            label: "годин волонтерства",
            note: "Твій час для міста",
          },
          {
            icon: Flag,
            value: active.length,
            label: "квести в роботі",
            note: "Активні та на перевірці",
          },
          {
            icon: CalendarDays,
            value: planned.length,
            label: "найближчі зустрічі",
            note: "Уже є у твоїх планах",
          },
        ].map((s) => (
          <Card key={s.label} className="personal-stat">
            <s.icon size={22} />
            <strong>{s.value}</strong>
            <h3>{s.label}</h3>
            <p>{s.note}</p>
          </Card>
        ))}
      </div>
      <div className="dashboard-middle">
        <section>
          <SectionHeading
            title="Твої активні справи"
            action={
              <Link className="text-link" to="/my-quests">
                Усі мої квести <ArrowUpRight size={16} />
              </Link>
            }
          />
          <div className="compact-quest-list">
            {active.length ? (
              active.map((p) => {
                const q = allQuests.find((q) => q.id === p.questId)!;
                return (
                  <Card key={p.id} className="active-quest-row">
                    <span className="active-quest-icon">
                      <Flag size={23} />
                    </span>
                    <div>
                      <Badge>{participationLabels[p.status]}</Badge>
                      <h3>
                        <Link to={`/quests/${q.id}`}>{q.title}</Link>
                      </h3>
                      <p>
                        {p.status === "pending"
                          ? "Твій звіт готовий до демоперевірки"
                          : "Виконай завдання та подай звіт про участь"}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        to={`/my-quests?tab=${p.status}`}
                        aria-label={`Керувати участю: ${q.title}`}
                      >
                        <ArrowUpRight size={19} />
                      </Link>
                    </Button>
                  </Card>
                );
              })
            ) : (
              <Card className="inline-empty">
                <Flag size={28} />
                <p>
                  Зараз немає активних квестів. Нова добра справа вже поруч.
                </p>
                <Link to="/quests" className="text-link">
                  Знайти квест
                </Link>
              </Card>
            )}
          </div>
        </section>
        <section>
          <SectionHeading title="Найближчі події" />
          <Card className="upcoming-list">
            {planned.length ? (
              planned.slice(0, 3).map((q) => (
                <Link to={`/quests/${q.id}`} key={q.id}>
                  <span className="event-date">
                    <CalendarDays size={22} />
                  </span>
                  <div>
                    <strong>{q.title}</strong>
                    <time dateTime={q.date}>{formatDate(q.date)}</time>
                    <small>{q.district} район</small>
                  </div>
                  <ArrowUpRight size={17} />
                </Link>
              ))
            ) : (
              <p className="muted">Заплануй добру справу в каталозі.</p>
            )}
          </Card>
        </section>
      </div>
      <section className="personal-section">
        <SectionHeading
          eyebrow="НА ОСНОВІ ТВОЇХ ДОБРИХ СПРАВ"
          title="Може відгукнутися саме тобі"
          action={
            <Link to="/quests" className="text-link">
              Каталог <ArrowUpRight size={17} />
            </Link>
          }
        />
        <div className="quest-grid">
          {recommended.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      </section>
      <section className="personal-section">
        <SectionHeading
          title="Останні досягнення"
          description="Твої нещодавні відзнаки та наступна мета."
        />
        <AchievementGrid completed={user.questsCompleted} recent />
      </section>
      <div className="dashboard-bottom">
        <section>
          <SectionHeading title="Стрічка добрих справ" />
          <Card className="activity-feed">
            {activity.length ? (
              activity.slice(0, 6).map((a) => (
                <div key={a.id}>
                  <span className={`activity-dot ${a.kind}`} />
                  <div>
                    <strong>
                      {a.questId ? (
                        <Link to={`/quests/${a.questId}`}>{a.title}</Link>
                      ) : (
                        a.title
                      )}
                    </strong>
                    <time dateTime={a.date}>{formatDate(a.date)}</time>
                  </div>
                </div>
              ))
            ) : (
              <p>Твоя історія починається тут.</p>
            )}
          </Card>
        </section>
        <section>
          <SectionHeading
            title="Рух досвіду та балів"
            action={<TrendingUp size={22} />}
          />
          <Card className="history-card">
            <XPTransactionHistory
              transactions={state.transactions
                .filter((t) => t.userId === user.id)
                .slice(-5)}
            />
          </Card>
        </section>
      </div>
    </>
  );
}
