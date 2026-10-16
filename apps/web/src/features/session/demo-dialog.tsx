import { useState, type ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { useVolunteer } from "../../shared/lib/use-volunteer";
import { useSession } from "./store";
export function DemoDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const demo = useVolunteer("demo-user")!;
  const enter = useSession((s) => s.enterDemo);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        title="Твої добрі справи починаються тут"
        description="DniproXP працює в демонстраційному режимі. Справжня реєстрація ще не підключена."
      >
        <div className="demo-profile">
          <ShieldCheck size={34} />
          <div>
            <strong>{demo.name}</strong>
            <p>
              Рівень {demo.level} · {demo.xp} XP · {demo.points} бонусних балів
            </p>
          </div>
        </div>
        <p className="muted">
          Увійди в готовий демопрофіль, щоб записуватися на квести та спробувати
          обмін бонусних балів. Дані зберігаються лише в цьому браузері.
        </p>
        <Button
          onClick={() => {
            enter();
            setOpen(false);
          }}
        >
          Спробувати демопрофіль <ArrowRight size={18} />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
