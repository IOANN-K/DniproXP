import { isApiMode } from "../../shared/api/config";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Repeat2,
  UserRound,
  Building2,
  ShieldCheck,
  Check,
} from "lucide-react";
import type { Role } from "../../entities/types";
import { authAdapter, roleHome, DEMO_CODE } from "./auth-adapter";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { organizations } from "../../mocks/data";
import { useSession } from "../session/store";
import { Dialog, DialogTrigger, DialogContent } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
export function DemoSwitcher() { return isApiMode ? null : <DemoDemoSwitcher />; }
function DemoDemoSwitcher() {
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState("green");
  const state = useVolunteerState();
  const [volunteer, setVolunteer] = useState("demo-user");
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const mutation = useMutation({
    mutationFn: (role: Role) => {
      const account = state.accounts.find(
        (a) => a.id === volunteer && a.role === "VOLUNTEER",
      );
      return role === "VOLUNTEER" && account
        ? authAdapter.login(account.email, DEMO_CODE)
        : authAdapter.switchDemo(role, organization);
    },
    onSuccess: (u) => {
      setOpen(false);
      navigate(roleHome(u.role));
    },
  });
  const roles = [
    {
      role: "VOLUNTEER" as const,
      title: "Волонтер",
      name: state.profiles[volunteer]?.name || "Волонтер",
      icon: UserRound,
      text: "Квести, звіти, досвід та винагороди",
    },
    {
      role: "ORGANIZER" as const,
      title: "Організатор",
      name: `Команда «${organizations.find((o) => o.id === organization)?.name}»`,
      icon: Building2,
      text: "Заявки, перевірка звітів і власні ініціативи",
    },
    {
      role: "ADMIN" as const,
      title: "Адміністратор",
      name: "Модератор демоплатформи",
      icon: ShieldCheck,
      text: "Організації, користувачі та модерація",
    },
  ];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="demo-switch-trigger" size="sm" variant="outline" aria-label="Демо">
          <Repeat2 size={16} />
          <span>Демо</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Подивись на місто з іншої ролі"
        description="Локальні демонстраційні облікові записи. Це не авторизація для реального сервісу; дані всіх ролей спільні в цьому браузері."
      >
        <label className="demo-organization-select">
          Волонтер для демонстрації
          <select
            value={volunteer}
            onChange={(e) => setVolunteer(e.target.value)}
          >
            {state.accounts
              .filter((a) => a.role === "VOLUNTEER")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {state.profiles[a.id]?.name}
                </option>
              ))}
          </select>
        </label>
        <label className="demo-organization-select">
          Команда для ролі організатора
          <select
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <div className="demo-role-list">
          {roles.map((r) => (
            <button
              key={r.role}
              disabled={mutation.isPending}
              className={user?.role === r.role ? "selected" : ""}
              onClick={() => mutation.mutate(r.role)}
            >
              <span>
                <r.icon size={23} />
              </span>
              <div>
                <strong>{r.title}</strong>
                <small>{r.name}</small>
                <p>{r.text}</p>
              </div>
              {user?.role === r.role && <Check size={19} />}
            </button>
          ))}
        </div>
        {mutation.isPending && (
          <p role="status">Перемикаємо обліковий запис…</p>
        )}
        {mutation.isError && (
          <p role="alert" className="error-message">
            {mutation.error.message}
          </p>
        )}
        <Button asChild variant="ghost">
          <Link to="/demo" onClick={() => setOpen(false)}>
            Відкрити покроковий демосценарій
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
