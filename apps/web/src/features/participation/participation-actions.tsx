import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Play, ShieldCheck, X } from "lucide-react";
import type { Participation, Quest } from "../../entities/types";
import { questApi } from "../../mocks/api";
import { Dialog, DialogContent } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { ReportDialog, ReportPreview } from "./report-dialog";
import { rewardPointsFor } from "../../entities/gamification/levels";
export { participationLabels } from "../../entities/quest/participation-status";
export function ParticipationActions({
  quest,
  participation,
}: {
  quest: Quest;
  participation: Participation;
}) {
  const [action, setAction] = useState<"cancel" | "start" | "confirm" | null>(
    null,
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (action === "cancel")
        await questApi.cancel(quest.id, participation.userId);
      else if (action === "start")
        await questApi.startDemo(quest.id, participation.userId);
      else if (action === "confirm")
        await questApi.confirmDemo(quest.id, participation.userId);
    },
    onSuccess: () => setAction(null),
  });
  return (
    <>
      <div className="participation-actions">
        {participation.status === "planned" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                mutation.reset();
                setAction("start");
              }}
            >
              <Play size={15} />
              Демо: почати квест
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                mutation.reset();
                setAction("cancel");
              }}
            >
              <X size={15} />
              Скасувати участь
            </Button>
          </>
        )}
        {participation.status === "active" && (
          <ReportDialog quest={quest} participation={participation} />
        )}{" "}
        {participation.status === "pending" && (
          <>
            <ReportPreview participation={participation} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                mutation.reset();
                setAction("confirm");
              }}
            >
              <ShieldCheck size={16} />
              Демо: перевірити звіт
            </Button>
          </>
        )}
        {participation.status === "completed" && (
          <>
            <span className="completed-award">
              <CheckCircle2 size={17} />+{quest.xp} XP · +
              {rewardPointsFor(quest.xp)} балів
            </span>
            {participation.report && (
              <ReportPreview participation={participation} />
            )}
          </>
        )}
      </div>
      <Dialog
        open={action !== null}
        onOpenChange={(value) => {
          if (!value && !mutation.isPending) setAction(null);
        }}
      >
        <DialogContent
          title={
            action === "cancel"
              ? "Скасувати участь?"
              : action === "start"
                ? "Змоделювати початок квесту?"
                : "Демонстраційна перевірка звіту"
          }
          description={
            action === "cancel"
              ? "Місце звільниться для іншого волонтера. Згодом можна записатися знову, якщо будуть місця."
              : action === "start"
                ? "Демосистема переведе участь в активний стан незалежно від календарної дати. XP за це не нараховується."
                : "Ти зараз моделюєш окрему дію організатора. Система перевірить наявність звіту й відсутність попереднього нарахування."
          }
        >
          {action === "confirm" && (
            <>
              <div className="confirmation-summary">
                <ShieldCheck size={28} />
                <div>
                  <strong>Звіт подано. Готовий до перевірки.</strong>
                  <p>
                    Після підтвердження: +{quest.xp} XP та +
                    {rewardPointsFor(quest.xp)} бонусних балів.
                  </p>
                </div>
              </div>
              <p className="report-text">{participation.report?.text}</p>
            </>
          )}
          {mutation.isError && (
            <p role="alert" className="error-message">
              {mutation.error.message}
            </p>
          )}
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending
              ? "Зберігаємо…"
              : action === "cancel"
                ? "Так, скасувати"
                : action === "start"
                  ? "Розпочати демоучасть"
                  : "Підтвердити від імені демосистеми"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
