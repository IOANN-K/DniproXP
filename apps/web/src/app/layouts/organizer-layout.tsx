import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Building2,
  LayoutDashboard,
  Flag,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { useOrganizer } from "../../features/organizer/use-organizer";
import { Button } from "../../shared/ui/button";
import { Badge } from "../../shared/ui/primitives";
export function OrganizerLayout() {
  const { organization } = useOrganizer();
  return (
    <div className="container organizer-space">
      <div className="organizer-space-header">
        <span className="organization-avatar">
          <Building2 size={26} />
        </span>
        <div>
          <p className="eyebrow">КАБІНЕТ ОРГАНІЗАТОРА</p>
          <h1>{organization.name}</h1>
        </div>
        <Button asChild>
          <Link to="/organizer/quests/new">
            <Plus size={18} />
            Створити квест
          </Link>
        </Button>
      </div>
      <nav className="workspace-nav" aria-label="Кабінет організатора">
        <NavLink to="/organizer" end>
          <LayoutDashboard size={17} />
          Огляд
        </NavLink>
        <NavLink to="/organizer/quests">
          <Flag size={17} />
          Мої квести та заявки
        </NavLink>
        <Link to={`/organizations/${organization.id}`}>
          Сторінка організації <ArrowUpRight size={16} />
        </Link>
      </nav>
      <div className="workspace-notice">
        <Badge>ДЕМОНСТРАЦІЙНИЙ КАБІНЕТ</Badge>
        <p>
          Усі зміни спільні з простором волонтера й зберігаються в цьому
          браузері. Дата сценарію — 16 жовтня 2026.
        </p>
      </div>
      {organization.moderation !== "approved" && (
        <div className="error-message" role="status">
          <strong>
            {organization.moderation === "pending"
              ? "Організація очікує схвалення адміністратора."
              : "Публікації організації призупинені."}
          </strong>
          <p>
            {organization.moderationReason ||
              "Чернетки можна готувати вже зараз. Публікація стане доступною після модерації."}
          </p>
        </div>
      )}
      <Outlet />
    </div>
  );
}
