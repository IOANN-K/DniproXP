import { useState, type ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { useSession } from "./store";
export function DemoDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
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
            <strong>Олександра Коваль</strong>
            <p>Рівень 3 · 650 XP · 4 завершені квести</p>
          </div>
        </div>
        <p className="muted">
          Увійди в готовий демопрофіль, щоб записуватися на квести та спробувати
          обмін XP. Дані зберігаються лише в цьому браузері.
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
