import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import type { Role } from "../../entities/types";
import { useSession } from "../session/store";
import { roleHome } from "./auth-adapter";
import { Button } from "../../shared/ui/button";
import { ShieldCheck } from "lucide-react";
export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const user = useSession((s) => s.user);
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  if (!roles.includes(user.role))
    return (
      <div className="container empty-state">
        <ShieldCheck size={42} />
        <h1>Це простір іншої ролі</h1>
        <p>
          Перемкни демообліковий запис у верхній панелі або повернися до свого
          кабінету.
        </p>
        <Button asChild>
          <Link to={roleHome(user.role)}>До мого кабінету</Link>
        </Button>
      </div>
    );
  return <Outlet />;
}
