import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ArrowRight, Repeat2, Leaf } from "lucide-react";
import { authAdapter } from "../features/auth/auth-adapter";
import type { Role } from "../entities/types";
import { repository } from "../mocks/repository";
import { useVolunteerState } from "../shared/lib/use-volunteer";
import { useSession } from "../features/session/store";
import { Card, Badge } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
export function DemoScenarioPage() {
  const state = useVolunteerState();
  const user = useSession((s) => s.user);
  const navigate = useNavigate();
  const id = state.demoQuestId || "demo-city-team";
  const p = state.participations.find(
    (p) => p.questId === id && p.userId === "demo-user",
  );
  const confirmation = state.transactions.find(
    (t) => t.questId === id && t.userId === "demo-user",
  );
  const redeemed = state.redemptions.some(
    (r) =>
      r.userId === "demo-user" && confirmation && r.date >= confirmation.date,
  );
  const move = useMutation({
    mutationFn: async ({ role, to }: { role: Role; to: string }) => {
      await authAdapter.switchDemo(role);
      return to;
    },
    onSuccess: (to) => navigate(to),
  });
  const fresh = useMutation({
    mutationFn: async () => {
      if (!user) await authAdapter.switchDemo("VOLUNTEER");
      return repository.newDemoRun();
    },
  });
  const steps = [
    {
      title: "Знайди квест і подай заявку",
      text: "Відкрий деталі в ролі волонтера, ознайомся з умовами та натисни «Подати заявку».",
      role: "VOLUNTEER" as const,
      to: `/quests/${id}`,
      done: !!p,
    },
    {
      title: "Схвали заявку як організатор",
      text: "У «Зеленому Дніпрі» відкрий нову заявку Олександри й схвали участь. Демосценарій одразу відкриє активне виконання.",
      role: "ORGANIZER" as const,
      to: `/organizer/quests/${id}?tab=applications`,
      done: p?.applicationStatus === "approved",
    },
    {
      title: "Виконай завдання та подай звіт",
      text: "Повернися до волонтера, відкрий активні квести, опиши результат і додай готове демонстраційне фото.",
      role: "VOLUNTEER" as const,
      to: "/my-quests?tab=active",
      done: !!p?.report,
    },
    {
      title: "Перевір і підтвердь виконання",
      text: "Перемкнися до організатора. Переглянь звіт і натисни «Підтвердити виконання». Можна також повернути звіт із поясненням.",
      role: "ORGANIZER" as const,
      to: `/organizer/quests/${id}?tab=reports`,
      done: !!confirmation,
    },
    {
      title: "Побач оновлений прогрес",
      text: "У волонтера оновляться XP, бонусні бали, години, досягнення, історія та позиція в рейтингу.",
      role: "VOLUNTEER" as const,
      to: "/dashboard",
      done: !!confirmation,
    },
    {
      title: "Обміняй бонусні бали на нагороду",
      text: "Обери демонстраційну винагороду, відкрий деталі й підтвердь обмін. XP залишиться незмінним, сертифікат з’явиться в історії.",
      role: "VOLUNTEER" as const,
      to: "/rewards",
      done: redeemed,
    },
  ];
  return (
    <div className="container page-section">
      <div className="demo-guide-hero">
        <Badge>
          <Leaf size={15} />
          НАСКРІЗНИЙ ДЕМОСЦЕНАРІЙ
        </Badge>
        <h1>
          Від доброї ідеї
          <br />
          до відчутного внеску
        </h1>
        <p>
          Пройди весь шлях із двох ролей. Заявки, звіти й нарахування справжні в
          межах локальної демоверсії; серверна частина не використовується.
        </p>
      </div>
      <div className="demo-steps">
        {steps.map((s, i) => (
          <Card className={`demo-step ${s.done ? "done" : ""}`} key={s.title}>
            <span className="demo-step-number">
              {s.done ? (
                <CheckCircle2 size={25} />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            <div>
              <Badge>
                {s.role === "VOLUNTEER" ? "Волонтер" : "Організатор"}
              </Badge>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={move.isPending}
              onClick={() => move.mutate({ role: s.role, to: s.to })}
            >
              Відкрити крок <ArrowRight size={16} />
            </Button>
          </Card>
        ))}
      </div>
      {move.isError && (
        <p role="alert" className="error-message">
          {move.error.message}
        </p>
      )}
      <Card className="demo-replay">
        <Repeat2 size={28} />
        <div>
          <h2>Хочеш показати сценарій ще раз?</h2>
          <p>
            Створимо новий заздалегідь схвалений системний демоквест. Попередні
            записи, XP та винагороди залишаться в історії. Це виняток лише для
            презентаційного сценарію; звичайні нові квести проходять модерацію.
          </p>
        </div>
        <Button disabled={fresh.isPending} onClick={() => fresh.mutate()}>
          {fresh.isPending ? "Готуємо…" : "Підготувати новий демоквест"}
        </Button>
      </Card>
      {fresh.isSuccess && (
        <p className="success-message" role="status">
          Новий квест готовий. Почни з першого кроку.
        </p>
      )}
      {fresh.isError && (
        <p className="error-message" role="alert">
          {fresh.error.message}
        </p>
      )}
    </div>
  );
}
