import { BrandIcon } from "../../features/brand/brand-icon";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { useOrganizer } from "../../features/organizer/use-organizer";
import { Button } from "../../shared/ui/button";
import { Badge } from "../../shared/ui/primitives";
export function OrganizerLayout() {
  const { organization } = useOrganizer();
  return (
    <div className="container organizer-space organizer-shell">
      <aside className="organizer-sidebar">
        <div className="organizer-space-header">
          <span className="organization-avatar">
            <BrandIcon name="workspace" size={36} />
          </span>
          <div>
            <p className="eyebrow">КАБІНЕТ ОРГАНІЗАТОРА</p>
            <h1>{organization.name}</h1>
          </div>
        </div>
        <Button asChild>
          <Link to="/organizer/quests/new">
            <Plus size={18} />
            Створити квест
          </Link>
        </Button>
        <p className="sidebar-label">РОБОЧИЙ ПРОСТІР</p>
        <nav className="workspace-nav" aria-label="Кабінет організатора">
          <NavLink to="/organizer" end>
            <BrandIcon name="workspace" />
            Огляд
          </NavLink>
          <NavLink to="/organizer/quests/generate">
            <BrandIcon name="compass" />
            Майстер квестів
          </NavLink>
          <NavLink to="/organizer/quests" end>
            <BrandIcon name="quest" />
            Мої квести та заявки
          </NavLink>
          <Link to={`/organizations/${organization.id}`}>
            Сторінка організації <ArrowUpRight size={16} />
          </Link>
        </nav>
        <Link to="/demo" className="sidebar-guide">
          <BrandIcon name="growth" />
          <span>
            <strong>Від ідеї до результату</strong>
            <small>Відкрити демосценарій ↗</small>
          </span>
        </Link>
      </aside>
      <div className="organizer-main">
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
    </div>
  );
}
