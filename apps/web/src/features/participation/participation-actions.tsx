import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Play, X, Clock3 } from "lucide-react";
import type { Participation, Quest } from "../../entities/types";
import { questApi } from "../../mocks/api";
import { pointsForQuest } from "../../mocks/repository";
import { Dialog, DialogContent } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { ReportDialog, ReportPreview } from "./report-dialog";
export { participationLabels } from "../../entities/quest/participation-status";
export function ParticipationActions({
  quest,
  participation: p,
}: {
  quest: Quest;
  participation: Participation;
}) {
  const [action, setAction] = useState<"cancel" | "start" | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      action === "cancel"
        ? questApi.cancel(quest.id, p.userId)
        : questApi.startDemo(quest.id, p.userId),
    onSuccess: () => setAction(null),
  });
  return (
    <>
      <div className="participation-actions">
        {p.status === "planned" && (
          <>
            {p.applicationStatus === "pending" ? (
              <p className="application-wait">
                <Clock3 size={17} />
                Заявка чекає на рішення організатора
              </p>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  mutation.reset();
                  setAction("start");
                }}
              >
                <Play size={15} />
                Демо: почати схвалену участь
              </Button>
            )}
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
        {p.status === "active" && (
          <>
            {p.reportRejectionReason && (
              <div className="error-message" role="status">
                <strong>Звіт потребує доопрацювання</strong>
                <p>{p.reportRejectionReason}</p>
              </div>
            )}
            <ReportDialog quest={quest} participation={p} />
            {p.report && <ReportPreview participation={p} />}
          </>
        )}
        {p.status === "pending" && (
          <>
            <ReportPreview participation={p} />
            <p className="application-wait">
              <Clock3 size={17} />
              Організатор перевірить твій звіт
            </p>
          </>
        )}
        {p.status === "completed" && (
          <>
            <span className="completed-award">
              <CheckCircle2 size={17} />+{p.awardedXp ?? quest.xp} XP · +
              {p.awardedPoints ?? pointsForQuest(quest)} балів
            </span>
            {p.report && <ReportPreview participation={p} />}
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
              : "Розпочати схвалену демоучасть?"
          }
          description={
            action === "cancel"
              ? "Місце звільниться. Поки квест доступний, можна буде подати нову заявку."
              : "Організатор уже схвалив участь. Ця дія моделює початок роботи незалежно від дати, без нарахування XP."
          }
        >
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
                : "Розпочати участь"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
