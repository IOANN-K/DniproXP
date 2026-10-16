import { useState, type ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { useVolunteer } from "../../shared/lib/use-volunteer";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useSession } from "./store";
export function DemoDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const demo = useVolunteer("demo-user")!;
  const enter = useSession((s) => s.enterDemo);
  const mutation = useMutation({
    mutationFn: enter,
    onSuccess: () => setOpen(false),
  });
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
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Входимо…" : "Спробувати демопрофіль"}{" "}
          <ArrowRight size={18} />
        </Button>
        <div className="auth-dialog-links">
          <Link to="/login" onClick={() => setOpen(false)}>
            Увійти за поштою
          </Link>
          <Link to="/register" onClick={() => setOpen(false)}>
            Створити демопрофіль
          </Link>
        </div>
        {mutation.isError && (
          <p role="alert" className="error-message">
            {mutation.error.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
