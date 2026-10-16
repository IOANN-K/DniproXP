import { isApiMode } from "../../shared/api/config";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import type { Role } from "../../entities/types";
import { useSession } from "../session/store";
import { roleHome } from "./auth-adapter";
import { Button } from "../../shared/ui/button";
import { ShieldCheck } from "lucide-react";
export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const user = useSession((s) => s.user);
  const status = useSession(s => s.status);
  const error = useSession(s => s.error);
  const initialize = useSession(s => s.initialize);
  const location = useLocation();
  if (isApiMode && status === "loading") return <div className="container empty-state" role="status">Відновлюємо сесію…</div>;
  if (isApiMode && status === "error") return <div className="container empty-state" role="alert"><h1>Не вдалося перевірити сесію</h1><p>{error?.message}</p><Button onClick={() => void initialize()}>Спробувати ще раз</Button></div>;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  const identityOnly = isApiMode && ["/profile", "/passport"].includes(location.pathname);
  if (!identityOnly && !(isApiMode ? (user.roles ?? [user.role]).some(role => roles.includes(role)) : roles.includes(user.role)))
    return (
      <div className="container empty-state">
        <ShieldCheck size={42} />
        <h1>Це простір іншої ролі</h1>
        <p>
          {isApiMode ? "Ваш обліковий запис не має потрібної ролі. Права організації перевіряє сервер." : "Перемкни демообліковий запис у верхній панелі або повернися до свого кабінету."}
        </p>
        <Button asChild>
          <Link to={roleHome(user.role)}>До мого кабінету</Link>
        </Button>
      </div>
    );
  return <Outlet />;
}
