import { useEffect, useRef, useState } from "react";
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
export function LevelUpDialog() {
  const user = useVolunteer();
  const state = useVolunteerState();
  const role = useSession((s) => s.user?.role);
  const acknowledged = useRef(
    readStorage<Record<string, number>>("dniproxp:seen-xp:v1", {}),
  );
  const [level, setLevel] = useState<number | null>(null);
  const [award, setAward] = useState(0);
  useEffect(() => {
    if (!user || role !== "VOLUNTEER") {
      setLevel(null);
      setAward(0);
      return;
    }
    const baseline = state.transactions
      .filter(
        (t) =>
          t.userId === user.id && Date.parse(t.date) <= Date.parse(DEMO_NOW),
      )
      .reduce((n, t) => n + t.xp, 0);
    const last = Number.isFinite(acknowledged.current[user.id])
      ? acknowledged.current[user.id]
      : baseline;
    if (user.xp > last) {
      setAward(user.xp - last);
      if (levelFor(user.xp).level > levelFor(last).level) setLevel(user.level);
    }
    acknowledged.current[user.id] = user.xp;
    writeStorage("dniproxp:seen-xp:v1", acknowledged.current);
  }, [user?.id, user?.xp, user?.level, role, state.transactions]);
  useEffect(() => {
    if (!award) return;
    const timer = setTimeout(() => setAward(0), 5000);
    return () => clearTimeout(timer);
  }, [award]);
  return (
    <>
      {award > 0 && (
        <div className="xp-award-toast" role="status" key={`${user?.xp}`}>
          <span>
            <Zap size={25} />
          </span>
          <div>
            <strong>+{award} XP</strong>
            <p>Організатор підтвердив твою добру справу</p>
          </div>
          <Sparkles size={22} />
        </div>
      )}
      <Dialog
        open={level !== null}
        onOpenChange={(open) => {
          if (!open) setLevel(null);
        }}
      >
        <DialogContent
          title={`Вітаємо! Новий рівень ${level || ""}`}
          description="Твої підтверджені добрі справи перетворюються на досвід."
        >
          <div className="level-up-art">
            <Trophy size={75} />
            <Sparkles size={30} />
          </div>
          <p className="level-up-name">{user ? levelFor(user.xp).name : ""}</p>
          <p className="muted">
            Дніпро стає кращим завдяки твоїй турботі. Попереду ще багато
            можливостей!
          </p>
          <Button onClick={() => setLevel(null)}>
            Продовжувати добрі справи
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
