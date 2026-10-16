import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Users,
  Zap,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import type { Quest } from "../../entities/types";
import { questApi } from "../../mocks/api";
import { useSession } from "../session/store";
import { DemoDialog } from "../session/demo-dialog";
import { Button } from "../../shared/ui/button";
import { Card } from "../../shared/ui/primitives";
export function ParticipationPanel({ quest }: { quest: Quest }) {
  const user = useSession((s) => s.user);
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const {
    data: participations = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["participations"],
    queryFn: () => questApi.participations(),
  });
  const joined = participations.some(
    (p) => p.questId === quest.id && p.userId === user?.id,
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Увійди в демопрофіль.");
      if (joined) return questApi.cancel(quest.id, user.id);
      return questApi.join(quest.id, user.id);
    },
    onSuccess: async () => {
      setNotice(
        joined
          ? "Запис скасовано. Будемо раді побачитися на іншому квесті."
          : "Ти в команді! Деталі зустрічі — на цій сторінці.",
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["quests"] }),
        client.invalidateQueries({ queryKey: ["quest", quest.id] }),
        client.invalidateQueries({ queryKey: ["participations"] }),
      ]);
    },
  });
  const completed = quest.status === "completed";
  const full = quest.participants >= quest.capacity;
  return (
    <Card className="participation-panel">
      <span className="eyebrow">ТВОЯ ДОБРА СПРАВА</span>
      <div className="participation-xp">
        <Zap size={28} fill="currentColor" />
        <strong>+{quest.xp}</strong>
        <span>XP</span>
      </div>
      <p className="muted">
        Нараховується після підтвердження участі координатором.
      </p>
      <div className="places-line">
        <Users size={18} />
        <span>
          {quest.participants} із {quest.capacity} учасників
        </span>
      </div>
      <div className="places-progress">
        <span
          style={{
            width: `${Math.min(100, (quest.participants / quest.capacity) * 100)}%`,
          }}
        />
      </div>
      <p className="availability">
        {completed
          ? "Квест завершено"
          : joined
            ? "Твоє місце в команді заброньовано"
            : full
              ? "Усі місця зайняті"
              : `Ще ${quest.capacity - quest.participants} місць у команді`}
      </p>
      {isError ? (
        <Button onClick={() => void refetch()} variant="outline">
          Повторити завантаження
        </Button>
      ) : completed || (full && !joined) ? (
        <Button disabled>
          {completed ? "Квест завершено" : "Немає вільних місць"}
        </Button>
      ) : user ? (
        <Button
          onClick={() => {
            setNotice("");
            mutation.mutate();
          }}
          disabled={mutation.isPending || isPending}
          variant={joined ? "outline" : "default"}
        >
          {mutation.isPending
            ? "Зберігаємо…"
            : joined
              ? "Скасувати запис"
              : "Долучитися"}
          {!mutation.isPending &&
            (joined ? <CheckCircle2 size={18} /> : <ArrowUpRight size={18} />)}
        </Button>
      ) : (
        <DemoDialog>
          <Button>
            Долучитися <ArrowUpRight size={18} />
          </Button>
        </DemoDialog>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {mutation.isError && (
        <p className="error-message" role="alert">
          {mutation.error.message}
        </p>
      )}
      <div className="safe-note">
        <ShieldCheck size={19} />
        <span>
          Безкоштовна участь.
          <br />
          Демонстраційний запис у цьому браузері.
        </span>
      </div>
    </Card>
  );
}
