import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  Users,
  IdCard,
  Sparkles,
  Trophy,
  UserRound,
  Building2,
} from "lucide-react";
import { useSession } from "../session/store";
export function CommunityMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const location = useLocation();
  const user = useSession((s) => s.user);
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [location.pathname]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node))
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      className="explore-menu community-menu"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current?.open) {
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(e) => {
        if (
          ref.current &&
          !e.currentTarget.contains(e.relatedTarget as Node | null)
        )
          ref.current.open = false;
      }}
    >
      <summary>
        Спільнота <ChevronDown size={15} />
      </summary>
      <div className="explore-menu-content">
        <small>СПІЛЬНОТА</small>
        <Link to="/teams">
          <Users size={18} />
          Команди міста
        </Link>
        <Link to="/leaderboard">
          <Trophy size={18} />
          Рейтинги
        </Link>
        <Link to="/organizations">
          <Building2 size={18} />
          Організації
        </Link>
        {(!user || user.role === "VOLUNTEER") && (
          <>
            <small>МІЙ ПРОГРЕС</small>
            <Link to="/passport">
              <IdCard size={18} />
              Волонтерський паспорт
            </Link>
            <Link to="/skills">
              <Sparkles size={18} />
              Дерево навичок
            </Link>
            <Link to="/dashboard">
              <UserRound size={18} />
              Мій простір
            </Link>
          </>
        )}
      </div>
    </details>
  );
}
