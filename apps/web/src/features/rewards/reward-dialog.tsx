import { useSession } from "../session/store";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Coins, Gift, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Reward } from "../../entities/types";
import { rewardsApi } from "../../mocks/api";
import { organizations } from "../../mocks/data";
import {
  useVolunteer,
  useVolunteerState,
} from "../../shared/lib/use-volunteer";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { Badge } from "../../shared/ui/primitives";
import { DemoDialog } from "../session/demo-dialog";
export function RewardDialog({ reward }: { reward: Reward }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const current = useVolunteer();
  const role = useSession((s) => s.user?.role);
  const user = role === "VOLUNTEER" ? current : null;
  const state = useVolunteerState();
  const existing = state.redemptions.find(
    (r) => r.rewardId === reward.id && r.userId === user?.id,
  );
  const remaining = Math.max(
    0,
    reward.stock -
      state.redemptions.filter((r) => r.rewardId === reward.id).length,
  );
  const mutation = useMutation({
    mutationFn: () => rewardsApi.redeem(reward.id, user!.id),
    onSuccess: () => setConfirm(false),
  });
  const unavailable = remaining === 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (mutation.isPending) return;
        setOpen(value);
        setConfirm(false);
        mutation.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Детальніше
        </Button>
      </DialogTrigger>
      <DialogContent
        title={
          mutation.isSuccess
            ? "Твоя вдячність від спільноти"
            : confirm
              ? "Підтвердити обмін балів?"
              : reward.name
        }
        description={
          confirm
            ? `Обмін коштує ${reward.cost} бонусних балів. Це локальна демонстраційна дія без справжніх платежів.`
            : "Вигадана пропозиція для демонстрації винагород DniproXP."
        }
      >
        {existing ? (
          <div className="reward-confirmed">
            <CheckCircle2 size={42} />
            <h3>Демосертифікат отримано</h3>
            <code>{existing.code}</code>
            <p>Не діє в реальних закладах. Збережено в історії винагород.</p>
            <Button asChild variant="outline">
              <Link to="/rewards?tab=history" onClick={() => setOpen(false)}>
                До історії отриманих нагород
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="reward-dialog-summary">
              <span>
                <Gift size={32} />
              </span>
              <div>
                <Badge>{reward.category}</Badge>
                <strong>{reward.name}</strong>
                <small>
                  {
                    organizations.find((o) => o.id === reward.organizationId)
                      ?.name
                  }{" "}
                  · демонстраційний партнер
                </small>
              </div>
            </div>
            <p className="reward-details">{reward.details}</p>
            <div className="exchange-summary">
              <div>
                <span>Вартість</span>
                <strong>
                  <Coins size={17} />
                  {reward.cost} балів
                </strong>
              </div>
              <div>
                <span>Доступно</span>
                <strong>{remaining} шт.</strong>
              </div>
              {user && (
                <>
                  <div>
                    <span>Твій баланс</span>
                    <strong>{user.points} балів</strong>
                  </div>
                  {confirm && (
                    <div>
                      <span>Залишиться після обміну</span>
                      <strong>{user.points - reward.cost} балів</strong>
                    </div>
                  )}
                </>
              )}
            </div>
            {confirm && (
              <div className="safe-note">
                <ShieldCheck size={20} />
                <p>
                  Накопичений XP та рівень залишаться без змін. Цей
                  демосертифікат можна отримати один раз.
                </p>
              </div>
            )}
            {mutation.isError && (
              <p className="error-message" role="alert">
                {mutation.error.message}
              </p>
            )}
            {!user ? (
              <DemoDialog>
                <Button>Увійти для обміну</Button>
              </DemoDialog>
            ) : (
              <Button
                disabled={
                  unavailable || user.points < reward.cost || mutation.isPending
                }
                onClick={() => (confirm ? mutation.mutate() : setConfirm(true))}
              >
                {mutation.isPending
                  ? "Обмінюємо…"
                  : unavailable
                    ? "Пропозиція недоступна"
                    : user.points < reward.cost
                      ? "Недостатньо бонусних балів"
                      : confirm
                        ? `Підтверджую: ${reward.cost} балів`
                        : "Обміняти бонусні бали"}
              </Button>
            )}
            {confirm && (
              <Button
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => setConfirm(false)}
              >
                Назад до опису
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
