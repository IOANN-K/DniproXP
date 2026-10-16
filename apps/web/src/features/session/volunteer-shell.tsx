import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Flag,
  UserRound,
  Gift,
  ArrowRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSession } from "./store";
import { Link } from "react-router-dom";
import { roleHome } from "../auth/auth-adapter";
import { DemoDialog } from "./demo-dialog";
import { Button } from "../../shared/ui/button";
export function VolunteerShell({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  if (!user)
    return (
      <div className="container empty-state">
        <UserRound size={45} />
        <p className="eyebrow">ТВІЙ ОСОБИСТИЙ ПРОСТІР</p>
        <h1>У добрих справ є продовження</h1>
        <p>
          Увійди в демопрофіль, щоб планувати участь, відстежувати прогрес і
          отримувати винагороди.
        </p>
        <DemoDialog>
          <Button>
            Увійти в демопрофіль <ArrowRight size={17} />
          </Button>
        </DemoDialog>
      </div>
    );
  if (user.role !== "VOLUNTEER")
    return (
      <div className="container empty-state">
        <h1>Це простір волонтера</h1>
        <p>
          Обери роль волонтера через перемикач деморежиму або повернися до свого
          кабінету.
        </p>
        <Button asChild>
          <Link to={roleHome(user.role)}>До мого кабінету</Link>
        </Button>
      </div>
    );
  return (
    <div className="container volunteer-space">
      <nav className="volunteer-nav" aria-label="Простір волонтера">
        <NavLink to="/dashboard">
          <LayoutDashboard size={17} />
          Мій простір
        </NavLink>
        <NavLink to="/my-quests">
          <Flag size={17} />
          Мої квести
        </NavLink>
        <NavLink to="/profile" end>
          <UserRound size={17} />
          Профіль
        </NavLink>
        <NavLink to="/rewards">
          <Gift size={17} />
          Винагороди
        </NavLink>
      </nav>
      <p className="scenario-note">
        Демосценарій · 16 жовтня 2026 · Заявки та звіти розглядає організатор.
        Ролі можна перемикати у верхній панелі.
      </p>
      {children}
    </div>
  );
}
