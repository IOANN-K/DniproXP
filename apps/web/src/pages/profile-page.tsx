import { PersonalExploration } from "../features/exploration/sections";
import { Link, useParams } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  Flag,
  ArrowUpRight,
  MapPin,
  Zap,
} from "lucide-react";
import { useSession } from "../features/session/store";
import { VolunteerShell } from "../features/session/volunteer-shell";
import { useVolunteer, useVolunteerState } from "../shared/lib/use-volunteer";
import { getVolunteer } from "../mocks/repository";
import { categories } from "../mocks/data";
import {
  LevelBadge,
  VolunteerAvatar,
  XPProgress,
  AchievementGrid,
  XPTransactionHistory,
} from "../entities/gamification/components";
import { CategoryIcon } from "../entities/quest/category-icon";
import { Card, Badge, Photo } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { SectionHeading } from "../shared/ui/section-heading";
import { EditProfileDialog } from "../features/profile/edit-profile-dialog";
import { formatDate } from "../shared/lib/utils";
export function ProfilePage() {
  const { id } = useParams();
  const self = useSession((s) => s.user);
  return id ? (
    <ProfileContent userId={id} />
  ) : (
    <VolunteerShell>
      {self && <ProfileContent userId={self.id} />}
    </VolunteerShell>
  );
}
function ProfileContent({ userId }: { userId: string }) {
  const state = useVolunteerState();
  const user = useVolunteer(userId);
  const self = useSession((s) => s.user);
  const own = self?.id === userId;
  const publicPage = !!useParams().id;
  if (!user)
    return (
      <div className="container empty-state">
        <h1>Профіль не знайдено</h1>
        <p>Повернися до спільноти та познайомся з її учасниками.</p>
        <Button asChild>
          <Link to="/leaderboard">Рейтинг волонтерів</Link>
        </Button>
      </div>
    );
  const completed = state.participations
    .filter((p) => p.userId === user.id && p.status === "completed")
    .sort((a, b) =>
      (b.confirmedAt || b.createdAt).localeCompare(
        a.confirmedAt || a.createdAt,
      ),
    );
  const activities = categories
    .map((c) => ({
      ...c,
      count: completed.filter(
        (p) =>
          state.questRecords.find((q) => q.id === p.questId)?.categoryId ===
          c.id,
      ).length,
    }))
    .filter((c) => c.count > 0);
  const ranked = state.accounts
    .filter((a) => a.role === "VOLUNTEER")
    .map((a) => getVolunteer(a.id, state)!)
    .sort((a, b) => b.xp - a.xp || a.id.localeCompare(b.id));
  return (
    <div className={publicPage ? "container page-section" : ""}>
      <Card className="public-profile-hero">
        <div className="profile-cover">
          <span>ДОБРІ СПРАВИ МАЮТЬ ОБЛИЧЧЯ</span>
          <div className="cover-rings" />
        </div>
        <div className="public-profile-content">
          <VolunteerAvatar user={user} large />
          <div className="profile-heading">
            <div>
              <p className="eyebrow">ВОЛОНТЕРСЬКА СПІЛЬНОТА ДНІПРА</p>
              <h1>{user.name}</h1>
              <div className="profile-badges">
                <LevelBadge xp={user.xp} />
                <Badge>
                  <MapPin size={13} />
                  Дніпро
                </Badge>
                <Badge>Демопрофіль</Badge>
              </div>
            </div>
            {own && <EditProfileDialog user={user} />}
          </div>
          <p className="profile-bio">
            {user.bio || "Профіль волонтера спільноти DniproXP."}
          </p>
        </div>
      </Card>
      <div className="personal-stats profile-stat-grid">
        {[
          { icon: Zap, value: user.xp, label: "накопичено XP" },
          {
            icon: Flag,
            value: user.questsCompleted,
            label: "завершено квестів",
          },
          { icon: Clock3, value: user.hours, label: "годин волонтерства" },
          {
            icon: CalendarDays,
            value: ranked.findIndex((u) => u.id === userId) + 1,
            label: "місце в рейтингу",
          },
        ].map((s) => (
          <Card className="personal-stat" key={s.label}>
            <s.icon size={21} />
            <strong>{s.value.toLocaleString("uk-UA")}</strong>
            <h3>{s.label}</h3>
          </Card>
        ))}
      </div>
      <section className="personal-section">
        <SectionHeading title="Прогрес добрих справ" />
        <Card className="profile-progress-card">
          <div>
            <h3>Кожна підтверджена справа наближає до нового рівня</h3>
            <p>Досвід накопичується й не зникає після обміну бонусних балів.</p>
          </div>
          <XPProgress xp={user.xp} />
        </Card>
      </section>
      <section className="personal-section">
        <SectionHeading title="Досягнення" />
        <AchievementGrid completed={user.questsCompleted} />
      </section>
      <PersonalExploration userId={user.id} publicProfile={!own} />
      <div className="profile-columns">
        <section>
          <SectionHeading title="Завершені квести" />
          <div className="profile-completed">
            {completed.map((p) => {
              const q = state.questRecords.find((q) => q.id === p.questId)!;
              return (
                <Card key={p.id}>
                  <Photo src={q.image} alt={q.imageAlt} loading="lazy" />
                  <div>
                    <h3>
                      <Link to={`/quests/${q.id}`}>{q.title}</Link>
                    </h3>
                    <time dateTime={p.confirmedAt || p.createdAt}>
                      {formatDate(p.confirmedAt || p.createdAt)}
                    </time>
                    <Badge>
                      +
                      {state.transactions.find(
                        (t) => t.userId === user.id && t.questId === q.id,
                      )?.xp || q.xp}{" "}
                      XP
                    </Badge>
                  </div>
                  <Link
                    to={`/quests/${q.id}`}
                    className="button button-ghost button-icon"
                    aria-label={`Відкрити квест: ${q.title}`}
                  >
                    <ArrowUpRight size={18} />
                  </Link>
                </Card>
              );
            })}
            {!completed.length && (
              <Card className="inline-empty">
                <p>Перша підтверджена добра справа ще попереду.</p>
              </Card>
            )}
          </div>
        </section>
        <section>
          <SectionHeading title="Напрями, що відгукуються" />
          <Card className="profile-categories">
            {activities.map((c) => (
              <div key={c.id}>
                <span className={`category-icon ${c.color}`}>
                  <CategoryIcon category={c} size={20} />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${(c.count / Math.max(1, completed.length)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span>{c.count}</span>
              </div>
            ))}
            {!activities.length && (
              <p className="muted">
                Напрями з’являться після першого завершеного квесту.
              </p>
            )}
          </Card>
          {own && (
            <>
              <SectionHeading title="Твоя історія нарахувань" />
              <Card className="history-card">
                <XPTransactionHistory
                  transactions={state.transactions.filter(
                    (t) => t.userId === user.id,
                  )}
                />
              </Card>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
