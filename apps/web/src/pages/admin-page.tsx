import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Building2,
  Flag,
  Search,
  ArrowUpRight,
} from "lucide-react";
import { useVolunteerState } from "../shared/lib/use-volunteer";
import { getVolunteer, questStatusLabels } from "../mocks/repository";
import { adminApi } from "../mocks/organizer-api";
import { Card, Badge, Input } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../shared/ui/tabs";
import { ActionDialog } from "../shared/ui/action-dialog";
const roles = {
  VOLUNTEER: "Волонтер",
  ORGANIZER: "Організатор",
  ADMIN: "Адміністратор",
};
export function AdminPage() {
  const state = useVolunteerState();
  const [tab, setTab] = useState("quests");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const quests = state.questRecords.filter(
    (q) =>
      !q.id.startsWith("history-") &&
      (!search ||
        q.title
          .toLocaleLowerCase("uk")
          .includes(search.toLocaleLowerCase("uk"))) &&
      (!pending || q.moderation === "pending"),
  );
  const orgs = state.organizations.filter(
    (o) =>
      (!search ||
        o.name
          .toLocaleLowerCase("uk")
          .includes(search.toLocaleLowerCase("uk"))) &&
      (!pending || o.moderation === "pending"),
  );
  const users = state.accounts.filter(
    (a) =>
      !search ||
      `${state.profiles[a.id].name} ${a.email}`
        .toLocaleLowerCase("uk")
        .includes(search.toLocaleLowerCase("uk")),
  );
  return (
    <div className="container page-section admin-space">
      <div className="workspace-page-heading">
        <div>
          <p className="eyebrow">ДЕМОНСТРАЦІЙНА МОДЕРАЦІЯ</p>
          <h1>Довіра починається з турботи</h1>
          <p>
            Базовий простір адміністратора. Без справжніх прав доступу на
            сервері.
          </p>
        </div>
        <span className="workspace-decoration">
          <ShieldCheck size={40} />
        </span>
      </div>
      <div className="personal-stats">
        {[
          { icon: Users, value: state.accounts.length, label: "користувачів" },
          {
            icon: Building2,
            value: state.organizations.length,
            label: "організацій",
          },
          {
            icon: Flag,
            value: state.questRecords.filter(
              (q) => !q.id.startsWith("history-"),
            ).length,
            label: "квестів",
          },
          {
            icon: ShieldCheck,
            value:
              state.questRecords.filter(
                (q) => q.lifecycle !== "draft" && q.moderation === "pending",
              ).length +
              state.organizations.filter((o) => o.moderation === "pending")
                .length,
            label: "очікують модерації",
          },
        ].map((s) => (
          <Card className="personal-stat" key={s.label}>
            <s.icon size={22} />
            <strong>{s.value}</strong>
            <h3>{s.label}</h3>
          </Card>
        ))}
      </div>
      <section className="personal-section">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setSearch("");
            setPending(false);
          }}
        >
          <TabsList className="participant-tabs" aria-label="Розділи модерації">
            <TabsTrigger value="quests">
              <Flag size={16} />
              Квести
            </TabsTrigger>
            <TabsTrigger value="organizations">
              <Building2 size={16} />
              Організації
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users size={16} />
              Користувачі
            </TabsTrigger>
          </TabsList>
          <div className="workspace-filters">
            <div className="search-field">
              <Search size={19} />
              <Input
                aria-label="Пошук у розділі адміністратора"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Знайти за назвою або ім’ям…"
              />
            </div>
            {tab !== "users" && (
              <label className="check-filter">
                <input
                  type="checkbox"
                  checked={pending}
                  onChange={(e) => setPending(e.target.checked)}
                />
                Лише на модерації
              </label>
            )}
          </div>
          <TabsContent value="quests">
            <div className="moderation-list">
              {quests.map((q) => (
                <Card key={q.id} className="moderation-row">
                  <div>
                    <div className="managed-quest-labels">
                      <Badge>
                        {questStatusLabels[q.lifecycle || "published"]}
                      </Badge>
                      <Badge>
                        {q.moderation === "approved"
                          ? "Схвалено"
                          : q.moderation === "rejected"
                            ? "Приховано"
                            : "Очікує розгляду"}
                      </Badge>
                    </div>
                    <h3>{q.title}</h3>
                    <p>
                      {
                        state.organizations.find(
                          (o) => o.id === q.organizationId,
                        )?.name
                      }
                    </p>
                    {q.moderationReason && (
                      <p className="form-error">{q.moderationReason}</p>
                    )}
                    <details>
                      <summary>Переглянути матеріали квесту</summary>
                      <p className="report-text">
                        {q.fullDescription ||
                          q.description ||
                          "Опис ще не заповнений"}
                      </p>
                      <p>
                        {q.address} · {q.xp} XP ·{" "}
                        {q.rewardPoints ?? Math.floor(q.xp / 2)} бонусних балів
                      </p>
                      <p>{q.instructions}</p>
                    </details>
                  </div>
                  <div className="moderation-actions">
                    {q.lifecycle !== "draft" && q.moderation !== "approved" && (
                      <ActionDialog
                        title="Схвалити публікацію?"
                        description="Квест стане доступним у каталозі, якщо організація схвалена й подію не скасовано."
                        confirmLabel="Схвалити квест"
                        action={() => adminApi.moderateQuest(q.id, true, "")}
                        trigger={<Button size="sm">Схвалити</Button>}
                      />
                    )}
                    {q.lifecycle !== "draft" && q.moderation !== "rejected" && (
                      <ActionDialog
                        title="Приховати квест?"
                        description="Нові користувачі не побачать квест у каталозі. Заявки, звіти та підтверджені внески збережуться."
                        confirmLabel="Приховати квест"
                        reasonRequired
                        action={(reason) =>
                          adminApi.moderateQuest(q.id, false, reason)
                        }
                        trigger={
                          <Button size="sm" variant="outline">
                            Приховати
                          </Button>
                        }
                      />
                    )}
                    {q.lifecycle === "draft" && (
                      <span className="field-hint">
                        Чернетка ще не подана на модерацію
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {!quests.length && <Empty />}
          </TabsContent>
          <TabsContent value="organizations">
            <div className="moderation-list">
              {orgs.map((o) => (
                <Card className="moderation-row" key={o.id}>
                  <div>
                    <Badge>
                      {o.moderation === "approved"
                        ? "Схвалено"
                        : o.moderation === "pending"
                          ? "Очікує розгляду"
                          : "Призупинено"}
                    </Badge>
                    <h3>{o.name}</h3>
                    <p>{o.description}</p>
                    {o.moderationReason && (
                      <p className="form-error">{o.moderationReason}</p>
                    )}
                    <Link className="text-link" to={`/organizations/${o.id}`}>
                      Публічна сторінка <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <div className="moderation-actions">
                    {o.moderation !== "approved" && (
                      <ActionDialog
                        title="Схвалити організацію?"
                        description="Організатор зможе подавати квести на публікацію. Кожен новий квест проходитиме окрему модерацію."
                        confirmLabel="Схвалити організацію"
                        action={() =>
                          adminApi.moderateOrganization(o.id, true, "")
                        }
                        trigger={<Button size="sm">Схвалити</Button>}
                      />
                    )}
                    {o.moderation !== "suspended" && (
                      <ActionDialog
                        title="Призупинити публікації організації?"
                        description="Квести цієї організації зникнуть із відкритого каталогу. Усі записи та вже нараховані нагороди збережуться."
                        confirmLabel="Призупинити"
                        reasonRequired
                        action={(reason) =>
                          adminApi.moderateOrganization(o.id, false, reason)
                        }
                        trigger={
                          <Button size="sm" variant="outline">
                            Призупинити
                          </Button>
                        }
                      />
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {!orgs.length && <Empty />}
          </TabsContent>
          <TabsContent value="users">
            <div className="moderation-list">
              {users.map((a) => (
                <Card className="moderation-row" key={a.id}>
                  <div>
                    <Badge>{roles[a.role]}</Badge>
                    <h3>{state.profiles[a.id].name}</h3>
                    <p>{a.email}</p>
                    {a.role === "VOLUNTEER" && (
                      <p>
                        {getVolunteer(a.id, state)?.xp} XP ·{" "}
                        {getVolunteer(a.id, state)?.questsCompleted}{" "}
                        підтверджених справ
                      </p>
                    )}
                  </div>
                  {a.role === "VOLUNTEER" && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/profile/${a.id}`}>
                        Профіль <ArrowUpRight size={15} />
                      </Link>
                    </Button>
                  )}
                </Card>
              ))}
            </div>
            {!users.length && <Empty />}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
function Empty() {
  return (
    <Card className="empty-state">
      <Search size={35} />
      <h2>Нічого за цими умовами</h2>
      <p>Зміни пошук або вимкни фільтр модерації.</p>
    </Card>
  );
}
