import { Link, useSearchParams } from "react-router-dom";
import {
  Flag,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  Zap,
  ShieldCheck,
} from "lucide-react";
import type { Participation } from "../entities/types";
import { VolunteerShell } from "../features/session/volunteer-shell";
import { useVolunteer, useVolunteerState } from "../shared/lib/use-volunteer";
import { Card, Badge, Photo } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../shared/ui/tabs";
import {
  ParticipationActions,
  participationLabels,
} from "../features/participation/participation-actions";
import { formatDate } from "../shared/lib/utils";
const tabs: [Participation["status"], string][] = [
  ["planned", "Заплановані"],
  ["active", "Активні"],
  ["pending", "Очікують підтвердження"],
  ["completed", "Завершені"],
  ["cancelled", "Скасовані"],
];
export function MyQuestsPage() {
  return (
    <VolunteerShell>
      <MyQuests />
    </VolunteerShell>
  );
}
function MyQuests() {
  const user = useVolunteer()!;
  const state = useVolunteerState();
  const [params, setParams] = useSearchParams();
  const current = params.get("tab") || "planned";
  const tab = tabs.some(([id]) => id === current) ? current : "planned";
  const mine = state.participations.filter((p) => p.userId === user.id);
  return (
    <>
      <div className="page-intro">
        <p className="eyebrow">ВІД ПЛАНУ ДО ВПЛИВУ</p>
        <h1>Мої добрі справи</h1>
        <p>Усе, до чого ти долучаєшся, — в одному місці.</p>
      </div>
      <div className="participation-explainer">
        <ShieldCheck size={22} />
        <p>
          XP і бонусні бали з’являються тільки після перевірки звіту
          організатором. Подання заявки чи звіту не нараховує винагороду. Для
          презентації перемикай ролі у верхній панелі.
        </p>
      </div>
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
        <TabsList aria-label="Статуси моїх квестів" className="my-quest-tabs">
          {tabs.map(([id, title]) => (
            <TabsTrigger key={id} value={id}>
              {title}
              <span>{mine.filter((p) => p.status === id).length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(([id]) => (
          <TabsContent key={id} value={id}>
            <div className="my-quest-list">
              {mine
                .filter((p) => p.status === id)
                .sort((a, b) =>
                  (b.updatedAt || b.createdAt).localeCompare(
                    a.updatedAt || a.createdAt,
                  ),
                )
                .map((p) => {
                  const q = state.questRecords.find((q) => q.id === p.questId)!;
                  return (
                    <Card className="my-quest-card" key={p.id}>
                      <Link className="my-quest-photo" to={`/quests/${q.id}`}>
                        <Photo src={q.image} alt={q.imageAlt} loading="lazy" />
                      </Link>
                      <div className="my-quest-body">
                        <div className="my-quest-card-top">
                          <Badge className={`status-${p.status}`}>
                            {p.applicationStatus === "rejected"
                              ? "Заявку відхилено"
                              : p.applicationStatus === "pending"
                                ? "Заявка на розгляді"
                                : participationLabels[p.status]}
                          </Badge>
                          <span className="quest-xp-label">
                            <Zap size={14} />
                            {q.xp} XP
                          </span>
                        </div>
                        <h2>
                          <Link to={`/quests/${q.id}`}>{q.title}</Link>
                        </h2>
                        <div className="my-quest-meta">
                          <span>
                            <CalendarDays size={15} />
                            {formatDate(q.date)}
                          </span>
                          <span>
                            <MapPin size={15} />
                            {q.district} район
                          </span>
                        </div>
                        {p.applicationReason && (
                          <p className="error-message">{p.applicationReason}</p>
                        )}
                        {p.status === "pending" && (
                          <p className="field-hint">
                            Звіт надіслано. Організатор перевірить його у
                            кабінеті відповідної команди.
                          </p>
                        )}
                        {p.status === "active" && (
                          <p className="field-hint">
                            Познач виконання, подавши короткий звіт. До
                            перевірки винагорода не нараховується.
                          </p>
                        )}
                        {p.status === "cancelled" ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/quests/${q.id}`}>
                              Переглянути квест <ArrowUpRight size={15} />
                            </Link>
                          </Button>
                        ) : (
                          <ParticipationActions quest={q} participation={p} />
                        )}
                        <Link to={`/quests/${q.id}`} className="text-link">
                          Інформація про квест <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </Card>
                  );
                })}
            </div>
            {!mine.some((p) => p.status === id) && (
              <Card className="empty-state">
                <Flag size={40} />
                <h2>Тут ще немає квестів</h2>
                <p>Кожна добра справа починається з маленького кроку.</p>
                <Button asChild>
                  <Link to="/quests">
                    Знайти свою справу <ArrowUpRight size={17} />
                  </Link>
                </Button>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
