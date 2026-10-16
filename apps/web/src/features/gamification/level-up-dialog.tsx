import { isApiMode } from "../../shared/api/config";
import { useEffect, useState } from "react";
import { Sparkles, Trophy, Zap } from "lucide-react";
import { Dialog, DialogContent } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import {
  useVolunteer,
  useVolunteerState,
} from "../../shared/lib/use-volunteer";
import { useSession } from "../session/store";
import { readStorage, writeStorage } from "../../shared/lib/storage";
import { DEMO_NOW } from "../../mocks/data";
import { levelFor } from "../../entities/gamification/levels";
export function LevelUpDialog() { return isApiMode ? null : <DemoLevelUpDialog />; }
function DemoLevelUpDialog() {
  const user = useVolunteer();
  const state = useVolunteerState();
  const role = useSession((s) => s.user?.role);
  if (!user || role !== "VOLUNTEER") return null;
  const baseline = state.transactions
    .filter(
      (t) => t.userId === user.id && Date.parse(t.date) <= Date.parse(DEMO_NOW),
    )
    .reduce((total, t) => total + t.xp, 0);
  return (
    <VolunteerXPNotice
      key={user.id}
      userId={user.id}
      xp={user.xp}
      level={user.level}
      baseline={baseline}
    />
  );
}

function VolunteerXPNotice({
  userId,
  xp,
  level,
  baseline,
}: {
  userId: string;
  xp: number;
  level: number;
  baseline: number;
}) {
  const [notice, setNotice] = useState<{
    seenXp: number;
    level: number | null;
    award: number;
  }>(() => {
    const acknowledged = readStorage<Record<string, number>>(
      "dniproxp:seen-xp:v1",
      {},
    );
    return {
      seenXp: Number.isFinite(acknowledged[userId])
        ? acknowledged[userId]
        : baseline,
      level: null,
      award: 0,
    };
  });
  // Adjust only when XP changes; no external writes or effect-triggered render loop.
  if (xp !== notice.seenXp) {
    setNotice({
      seenXp: xp,
      award: xp > notice.seenXp ? xp - notice.seenXp : notice.award,
      level:
        levelFor(xp).level > levelFor(notice.seenXp).level
          ? level
          : notice.level,
    });
  }
  useEffect(() => {
    const acknowledged = readStorage<Record<string, number>>(
      "dniproxp:seen-xp:v1",
      {},
    );
    writeStorage("dniproxp:seen-xp:v1", { ...acknowledged, [userId]: xp });
  }, [userId, xp]);
  const award = notice.award;
  const awardedXp = notice.seenXp;
  const unlockedLevel = notice.level;
  useEffect(() => {
    if (!award) return;
    const timer = setTimeout(
      () => setNotice((current) => ({ ...current, award: 0 })),
      5000,
    );
    return () => clearTimeout(timer);
  }, [award, awardedXp]);
  const dismissLevel = () =>
    setNotice((current) => ({ ...current, level: null }));
  return (
    <>
      {award > 0 && (
        <div className="xp-award-toast" role="status" key={`${xp}`}>
          <span>
            <Zap size={25} />
          </span>
          <div>
            <strong>+{award} XP</strong>
            <p>Новий досвід за підтверджені справи та досягнення</p>
          </div>
          <Sparkles size={22} />
        </div>
      )}
      <Dialog
        open={unlockedLevel !== null}
        onOpenChange={(open) => {
          if (!open) dismissLevel();
        }}
      >
        <DialogContent
          title={`Вітаємо! Новий рівень ${unlockedLevel || ""}`}
          description="Твої підтверджені добрі справи перетворюються на досвід."
        >
          <div className="level-up-art">
            <Trophy size={75} />
            <Sparkles size={30} />
          </div>
          <p className="level-up-name">{levelFor(xp).name}</p>
          <p className="muted">
            Дніпро стає кращим завдяки твоїй турботі. Попереду ще багато
            можливостей!
          </p>
          <Button onClick={dismissLevel}>Продовжувати добрі справи</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
