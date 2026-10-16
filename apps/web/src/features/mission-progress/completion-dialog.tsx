import { useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
import type {
  QuestChain,
  QuestChainProgress,
} from "../../entities/mission/types";
import { MissionRewardPreview } from "../../entities/mission/components";
import { useClaimMission } from "./hooks";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
export function MissionCompletionDialog({
  mission,
  progress,
}: {
  mission: QuestChain;
  progress: QuestChainProgress;
}) {
  const [open, setOpen] = useState(false);
  const claim = useClaimMission();
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!claim.isPending) {
          setOpen(v);
          claim.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          disabled={progress.rewardClaimed || progress.status !== "COMPLETED"}
        >
          <Trophy size={18} />
          {progress.rewardClaimed
            ? "Фінальний бонус отримано"
            : "Отримати фінальний бонус"}
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Історію пройдено. Дніпро дякує!"
        description="Усі обов’язкові етапи підтверджені. Нагорода за фінал видається один раз і не повторює базові нарахування квестів."
      >
        <div className="story-completion-art">
          <Trophy size={66} />
          <Sparkles size={27} />
        </div>
        <h3>{mission.rewards.achievement.title}</h3>
        <MissionRewardPreview reward={mission.rewards} />
        {claim.isError && (
          <p className="error-message" role="alert">
            {claim.error.message}
          </p>
        )}
        <Button
          disabled={claim.isPending}
          onClick={() =>
            claim.mutate(mission.id, { onSuccess: () => setOpen(false) })
          }
        >
          {claim.isPending
            ? "Зберігаємо нагороду…"
            : "Забрати бонус та відзнаку"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
