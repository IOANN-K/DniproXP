import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Users, IdCard } from "lucide-react";
import { authAdapter, DEMO_CODE } from "../features/auth/auth-adapter";
import { useVolunteerState } from "../shared/lib/use-volunteer";
import { Card, Badge } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
export function IdentityDemoPage() {
  const s = useVolunteerState();
  const navigate = useNavigate();
  const team = s.identity?.teams
    .filter(
      (t) => t.ownerId === "demo-user" && t.id.startsWith("created-team-"),
    )
    .slice(-1)[0];
  const ids = ["demo-user", "u2"];
  const quest = s.questRecords.find(
    (q) =>
      ["demo-city-team", "quest-1", "quest-7", "quest-4"].includes(q.id) &&
      q.allowTeamParticipation &&
      ["published", "active"].includes(q.lifecycle || "") &&
      !s.participations.some(
        (p) =>
          ids.includes(p.userId) &&
          p.questId === q.id &&
          (p.status !== "cancelled" || p.applicationStatus === "rejected"),
      ),
  );
  const record = s.identity?.teamQuests
    .filter((r) => r.teamId === team?.id && !r.id.includes("seed"))
    .slice(-1)[0];
  const questId = record?.questId || quest?.id;
  const group = team ? `/teams/${team.slug}` : "/teams/create";
  const move = useMutation({
    mutationFn: async (step: {
      href: string;
      volunteer?: string;
      organizer?: boolean;
    }) => {
      if (step.organizer) await authAdapter.switchDemo("ORGANIZER", "green");
      else {
        const a = s.accounts.find(
          (a) => a.id === (step.volunteer || "demo-user"),
        )!;
        await authAdapter.login(a.email, DEMO_CODE);
      }
      return step.href;
    },
    onSuccess: (href) => navigate(href),
  });
  const steps = [
    {
      title: "Відкрий паспорт",
      text: "Олександра бачить підтверджену історію, стабільний номер і налаштування видимості.",
      href: "/passport",
    },
    {
      title: "Розглянь деталі підтвердження",
      text: "У паспорті відкрий запис активності: дата, джерело й демонстраційний видавець.",
      href: "/passport",
    },
    {
      title: "Досліди дерево навичок",
      text: "Порівняй напрями, рівні та джерела досвіду. Сам перегляд не нараховує XP.",
      href: "/skills",
    },
    {
      title: "Створи команду",
      text: "Заповни форму, обери видимість, обкладинку та кількість місць.",
      href: "/teams/create",
    },
    {
      title: "Запроси Максима Бондаря",
      text: "Учасники → Запросити волонтера. Власник і координатор мають право надсилати запрошення.",
      href: team ? `${group}/members` : "/teams/create",
    },
    {
      title: "Прийми запрошення як Максим",
      text: "Кнопка відкриє каталог під іншим готовим обліковим записом. Прийми запрошення у своєму блоці.",
      href: "/teams",
      volunteer: "u2",
    },
    {
      title: "Знайди спільну добру справу",
      text: "Повернися до Олександри. Обери квест, який явно дозволяє командну участь.",
      href: questId ? `/quests/${questId}` : "/quests?team=1",
    },
    {
      title: "Подай командну заявку",
      text: "У деталях квесту вибери створену команду й двох активних учасників. Кожен займе одне місце.",
      href: questId ? `/quests/${questId}` : "/quests?team=1",
    },
    {
      title: "Схвали дві заявки як організатор",
      text: "Зелений Дніпро бачить командну заявку й окремі участі. Схвали кожну; XP ще не видається.",
      href: questId
        ? `/organizer/quests/${questId}?tab=applications`
        : "/organizer/quests",
      organizer: true,
    },
    {
      title: "Подай звіт Олександри",
      text: "Мої квести → Активні. Опиши виконане завдання та за бажанням додай демонстраційне фото.",
      href: "/my-quests?tab=active",
    },
    {
      title: "Подай звіт Максима",
      text: "Відкриємо інший обліковий запис. Другий волонтер подає власний звіт за тією самою процедурою.",
      href: "/my-quests?tab=active",
      volunteer: "u2",
    },
    {
      title: "Підтвердь обидва результати",
      text: "Організатор перевіряє кожен звіт. Базова нагорода залишається одноразовою для кожного користувача й квесту.",
      href: questId
        ? `/organizer/quests/${questId}?tab=reports`
        : "/organizer/quests",
      organizer: true,
    },
    {
      title: "Побач розвиток навичок",
      text: "Підтвердження додають evidence відповідним компетенціям і командному напряму лідерства.",
      href: "/skills",
    },
    {
      title: "Побач командний результат",
      text: "Години двох волонтерів підсумовано, перша командна відзнака відкрилася за підтвердженим внеском.",
      href: group,
    },
    {
      title: "Відкрий міський виклик",
      text: "Демоквест або квест берега мають явний зв’язок із викликами. Особисті години ростуть, спільні метрики не множаться.",
      href:
        questId === "quest-4" || questId === "demo-city-team"
          ? "/challenges/bilsh-zelenyi-dnipro"
          : "/challenges/chystyi-bereh",
    },
    {
      title: "Повернися до паспорта",
      text: "Нова підтверджена активність, години, досвід і навички вже доступні в єдиному стані.",
      href: "/passport",
    },
  ];
  return (
    <div className="container page-section">
      <section className="demo-guide-hero">
        <Badge>
          <IdCard size={16} />
          ДЕМОНСТРАЦІЯ ОСОБИСТОСТІ ТА КОМАНД
        </Badge>
        <h1>
          Від особистої історії
          <br />
          до спільної справи
        </h1>
        <p>
          Усі дії використовують наявні форми й перевірку організатора. Кнопки
          лише перемикають готовий обліковий запис і відкривають потрібний
          екран.
        </p>
      </section>
      <Card className="identity-workflow-note">
        <Users size={27} />
        <div>
          <h2>
            {team
              ? `Команда сценарію: ${team.name}`
              : "Почни зі створення нової команди"}
          </h2>
          <p>
            Для сценарію використовуємо Олександру та Максима. Якщо квест уже
            пройдений, обери інший доступний командний квест у каталозі. Нові
            квести організатора потребують модерації та явного зв’язку з
            викликом для внеску в нього.
          </p>
        </div>
      </Card>
      <div className="demo-steps">
        {steps.map((step, index) => (
          <Card className="demo-step" key={step.title}>
            <span className="demo-step-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <Badge>
                {step.organizer
                  ? "Організатор"
                  : step.volunteer === "u2"
                    ? "Волонтер · Максим"
                    : "Волонтер · Олександра"}
              </Badge>
              <h2>{step.title}</h2>
              <p>{step.text}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={move.isPending}
              onClick={() => move.mutate(step)}
            >
              Відкрити крок <ArrowRight size={16} />
            </Button>
          </Card>
        ))}
      </div>
      {move.isError && (
        <p className="error-message" role="alert">
          {move.error.message}
        </p>
      )}
      <Link className="text-link" to="/demo">
        Початковий демосценарій <ArrowRight size={16} />
      </Link>
    </div>
  );
}
