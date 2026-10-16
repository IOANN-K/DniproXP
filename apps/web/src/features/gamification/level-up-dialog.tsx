import { useEffect, useRef, useState } from "react";
import { Sparkles, Trophy, Zap } from "lucide-react";
import { Dialog, DialogContent } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { useVolunteer } from "../../shared/lib/use-volunteer";
import { levelFor } from "../../entities/gamification/levels";
export function LevelUpDialog() {
  const user = useVolunteer();
  const previous = useRef<{ id: string; xp: number; level: number } | null>(
    null,
  );
  const [level, setLevel] = useState<number | null>(null);
  const [award, setAward] = useState(0);
  useEffect(() => {
    if (!user) {
      previous.current = null;
      setLevel(null);
      setAward(0);
      return;
    }
    const before = previous.current;
    if (before?.id === user.id && user.xp > before.xp) {
      setAward(user.xp - before.xp);
      if (user.level > before.level) setLevel(user.level);
    }
    previous.current = { id: user.id, xp: user.xp, level: user.level };
  }, [user?.id, user?.xp, user?.level]);
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
            <p>Твій внесок підтверджено демосистемою</p>
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
