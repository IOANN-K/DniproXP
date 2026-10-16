import { Link } from "react-router-dom";
import { Pencil, Play, Send, CheckCircle2, X } from "lucide-react";
import type { Quest, QuestLifecycle } from "../../entities/types";
import { organizerApi } from "../../mocks/organizer-api";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { ActionDialog } from "../../shared/ui/action-dialog";
import { Button } from "../../shared/ui/button";
export function QuestActions({ quest }: { quest: Quest }) {
  const state = useVolunteerState();
  const locked = state.participations.some((p) => p.questId === quest.id);
  const lifecycle = quest.lifecycle || "published";
  const actions: {
    next: QuestLifecycle;
    label: string;
    icon: typeof Play;
    description: string;
  }[] = [];
  if (lifecycle === "draft")
    actions.push({
      next: "published",
      label: "Подати на публікацію",
      icon: Send,
      description:
        "Перевіримо всі обов’язкові поля й майбутню дату. Після схвалення модератором квест стане видимим у каталозі.",
    });
  if (lifecycle === "published" && quest.moderation === "approved")
    actions.push({
      next: "active",
      label: "Розпочати квест",
      icon: Play,
      description:
        "У демосценарії схвалені учасники стануть активними незалежно від календарної дати. XP за початок не нараховується.",
    });
  if (lifecycle === "active")
    actions.push({
      next: "completed",
      label: "Завершити квест",
      icon: CheckCircle2,
      description:
        "Це завершує подію. Спочатку потрібно розглянути всі заявки й звіти та завершити участь волонтерів. XP за зміну статусу події не нараховується.",
    });
  if (["draft", "published", "active"].includes(lifecycle))
    actions.push({
      next: "cancelled",
      label: "Скасувати квест",
      icon: X,
      description:
        "Незавершені участі будуть скасовані, квест зникне з каталогу. Уже підтверджені внески й XP залишаться в історії. Цю дію не можна скасувати.",
    });
  return (
    <div className="quest-management-actions">
      {!locked && ["draft", "published"].includes(lifecycle) && (
        <Button size="sm" variant="outline" asChild>
          <Link to={`/organizer/quests/${quest.id}/edit`}>
            <Pencil size={15} />
            Редагувати
          </Link>
        </Button>
      )}
      {actions.map((a) => (
        <ActionDialog
          key={a.next}
          title={a.label}
          description={a.description}
          confirmLabel={a.label}
          action={() => organizerApi.transition(quest.id, a.next)}
          trigger={
            <Button
              size="sm"
              variant={a.next === "cancelled" ? "ghost" : "outline"}
            >
              <a.icon size={15} />
              {a.label}
            </Button>
          }
        />
      ))}
    </div>
  );
}
