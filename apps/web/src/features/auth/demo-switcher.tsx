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
import { authAdapter, roleHome } from "./auth-adapter";
import { organizations } from "../../mocks/data";
import { useSession } from "../session/store";
import { Dialog, DialogTrigger, DialogContent } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
export function DemoSwitcher() {
  const [open, setOpen] = useState(false);
  const [organization, setOrganization] = useState("green");
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  const mutation = useMutation({
    mutationFn: (role: Role) => authAdapter.switchDemo(role, organization),
    onSuccess: (u) => {
      setOpen(false);
      navigate(roleHome(u.role));
    },
  });
  const roles = [
    {
      role: "VOLUNTEER" as const,
      title: "Волонтер",
      name: "Олександра Коваль",
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
        <Button className="demo-switch-trigger" size="sm" variant="outline">
          <Repeat2 size={16} />
          <span>Демо</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Подивись на місто з іншої ролі"
        description="Локальні демонстраційні облікові записи. Це не авторизація для реального сервісу; дані всіх ролей спільні в цьому браузері."
      >
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
