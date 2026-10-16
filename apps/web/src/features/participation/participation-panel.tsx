import { participationLabels } from "../../entities/quest/participation-status";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Zap, ShieldCheck } from "lucide-react";
import type { Quest } from "../../entities/types";
import { getQuestSnapshot } from "../../mocks/repository";
import { questApi } from "../../mocks/api";
import { useSession } from "../session/store";
import { DemoDialog } from "../session/demo-dialog";
import { Button } from "../../shared/ui/button";
import { Card, Badge } from "../../shared/ui/primitives";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { ParticipationActions } from "./participation-actions";
import { pointsForQuest } from "../../mocks/repository";
import { DemoSwitcher } from "../auth/demo-switcher";
export function ParticipationPanel({ quest }: { quest: Quest }) {
  const user = useSession((s) => s.user);
  const state = useVolunteerState();
  const p = state.participations.find(
    (p) => p.questId === quest.id && p.userId === user?.id,
  );
  const mutation = useMutation({
    mutationFn: () => questApi.join(quest.id, user!.id),
  });
  const joined = p && p.status !== "cancelled";
  const reserved = state.participations.filter(
    (p) => p.questId === quest.id && p.status !== "cancelled",
  ).length;
  const count =
    getQuestSnapshot(quest.id, state)?.participants ?? quest.participants;
  const full = count >= quest.capacity;
  return (
    <Card className="participation-panel">
      <span className="eyebrow">ТВОЯ ДОБРА СПРАВА</span>
      <div className="participation-xp">
        <Zap size={28} />
        <strong>+{quest.xp}</strong>
        <span>XP</span>
      </div>
      <Badge className="points-tag">
        +{pointsForQuest(quest)} бонусних балів
      </Badge>
      <p className="muted">
        Після підтвердження виконання. Запис на квест не приносить XP.
      </p>
      <div className="places-line">
        <Users size={18} />
        <span>
          {Math.min(count, quest.capacity)} із {quest.capacity} учасників
        </span>
      </div>
      <div className="places-progress">
        <span
          style={{ width: `${Math.min(100, (count / quest.capacity) * 100)}%` }}
        />
      </div>
      {joined ? (
        <>
          <p className="availability">
            <Badge>
              {p.applicationStatus === "pending"
                ? "Заявка на розгляді"
                : participationLabels[p.status]}
            </Badge>
          </p>
          <ParticipationActions quest={quest} participation={p} />
          <Button asChild variant="ghost">
            <Link to="/my-quests">До моїх квестів</Link>
          </Button>
        </>
      ) : quest.status === "completed" ||
        quest.lifecycle === "cancelled" ||
        p?.applicationStatus === "rejected" ||
        full ? (
        <Button disabled>
          {quest.lifecycle === "cancelled"
            ? "Квест скасовано"
            : p?.applicationStatus === "rejected"
              ? "Заявку відхилено"
              : quest.status === "completed"
                ? "Квест завершено"
                : "Усі місця зайняті"}
        </Button>
      ) : user?.role !== "VOLUNTEER" && user ? (
        <>
          <p className="field-hint">Участь доступна в ролі волонтера.</p>
          <DemoSwitcher />
        </>
      ) : user ? (
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending
            ? "Записуємо…"
            : p?.status === "cancelled"
              ? "Записатися знову"
              : "Подати заявку"}
        </Button>
      ) : (
        <DemoDialog>
          <Button>Долучитися</Button>
        </DemoDialog>
      )}
      {p?.applicationStatus === "rejected" && (
        <p className="error-message">Заявку відхилено: {p.applicationReason}</p>
      )}
      {mutation.isError && (
        <p className="error-message" role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className="safe-note">
        <ShieldCheck size={19} />
        <span>
          Демонстраційна участь · Збережено в цьому браузері.
          {reserved > 0 ? " Стан синхронізовано." : ""}
        </span>
      </div>
    </Card>
  );
}
