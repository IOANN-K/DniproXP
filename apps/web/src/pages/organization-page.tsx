import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Building2,
  Flag,
  Users,
  Clock3,
  Mail,
  ArrowUpRight,
} from "lucide-react";
import { useVolunteerState } from "../shared/lib/use-volunteer";
import { publicQuests } from "../mocks/repository";
import { QuestCard } from "../entities/quest/quest-card";
import { Card, Badge } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { SectionHeading } from "../shared/ui/section-heading";
export function OrganizationPage() {
  const { id } = useParams();
  const state = useVolunteerState();
  const [limit, setLimit] = useState(6);
  const org = state.organizations.find((o) => o.id === id);
  if (!id)
    return (
      <div className="container page-section">
        <div className="page-intro">
          <p className="eyebrow">СПІЛЬНОТИ, ЩО ДІЮТЬ</p>
          <h1>Разом змінюємо Дніпро</h1>
          <p>Познайомся з демонстраційними організаціями платформи.</p>
        </div>
        <div className="organization-grid">
          {state.organizations.map((o) => (
            <Card key={o.id}>
              <span className="organization-avatar">{o.initials}</span>
              <h2>{o.name}</h2>
              <p>{o.description}</p>
              <Badge>
                {o.moderation === "approved"
                  ? "Схвалено у демоверсії"
                  : o.moderation === "pending"
                    ? "Очікує модерації"
                    : "Діяльність призупинено"}
              </Badge>
              <Link to={`/organizations/${o.id}`} className="text-link">
                Познайомитися <ArrowUpRight size={16} />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    );
  if (!org)
    return (
      <div className="container empty-state">
        <Building2 size={40} />
        <h1>Організацію не знайдено</h1>
        <Button asChild>
          <Link to="/organizations">Усі організації</Link>
        </Button>
      </div>
    );
  const quests = state.questRecords.filter((q) => q.organizationId === org.id);
  const publicList = publicQuests(state).filter(
    (q) => q.organizationId === org.id,
  );
  const active = publicList.filter((q) =>
    ["published", "active"].includes(q.lifecycle || ""),
  );
  const completed = quests.filter(
    (q) => q.lifecycle === "completed" && q.moderation === "approved",
  );
  const entries = state.participations.filter((p) =>
    quests.some((q) => q.id === p.questId),
  );
  const hours = entries
    .filter((p) => p.status === "completed")
    .reduce(
      (n, p) =>
        n +
        parseFloat(
          quests.find((q) => q.id === p.questId)?.duration.replace(",", ".") ||
            "0",
        ),
      0,
    );
  return (
    <div className="container page-section">
      <Card className="organization-public-hero">
        <span className="organization-avatar">
          <Building2 size={42} />
        </span>
        <div>
          <p className="eyebrow">ДЕМОНСТРАЦІЙНА ОРГАНІЗАЦІЯ</p>
          <h1>{org.name}</h1>
          <p>{org.description}</p>
          <div className="profile-badges">
            <Badge>{org.focus || "Міське волонтерство"}</Badge>
            <Badge>
              {org.moderation === "approved"
                ? "Схвалено на демоплатформі"
                : org.moderation === "pending"
                  ? "На модерації"
                  : "Діяльність призупинено"}
            </Badge>
          </div>
        </div>
      </Card>
      <div className="personal-stats">
        {[
          {
            icon: Flag,
            value: completed.length,
            label: "завершених ініціатив",
          },
          {
            icon: Users,
            value: new Set(
              entries
                .filter((p) => p.status !== "cancelled")
                .map((p) => p.userId),
            ).size,
            label: "волонтерів долучилося",
          },
          { icon: Clock3, value: hours, label: "підтверджених годин" },
          { icon: Flag, value: active.length, label: "відкритих квестів" },
        ].map((s) => (
          <Card className="personal-stat" key={s.label}>
            <s.icon size={22} />
            <strong>{s.value.toLocaleString("uk-UA")}</strong>
            <h3>{s.label}</h3>
          </Card>
        ))}
      </div>
      {org.moderation !== "approved" && (
        <p className="error-message">
          Нові публікації цієї організації поки недоступні.{" "}
          {org.moderationReason}
        </p>
      )}
      <section className="personal-section">
        <SectionHeading title="Долучайся до ініціатив" />
        <div className="quest-grid">
          {active.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
        {!active.length && (
          <Card className="inline-empty">
            <p>Зараз немає відкритих квестів цієї організації.</p>
            <Link to="/quests" className="text-link">
              Знайти інші добрі справи
            </Link>
          </Card>
        )}
      </section>
      <section className="personal-section">
        <SectionHeading title="Добрі справи, які вже відбулися" />
        <div className="quest-grid">
          {completed.slice(0, limit).map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
        {!completed.length && (
          <Card className="inline-empty">
            <p>Перша завершена ініціатива ще попереду.</p>
          </Card>
        )}
        {completed.length > limit && (
          <div className="load-more">
            <Button variant="outline" onClick={() => setLimit((n) => n + 6)}>
              Показати ще ініціативи
            </Button>
          </div>
        )}
      </section>
      <Card className="organization-contact">
        <Mail size={26} />
        <div>
          <h2>Контактна інформація</h2>
          <p>{org.email || `${org.id}@example.invalid`}</p>
          <small>
            Демонстраційна адреса. Не призначена для реального зв’язку чи
            організації зустрічей.
          </small>
        </div>
      </Card>
    </div>
  );
}
