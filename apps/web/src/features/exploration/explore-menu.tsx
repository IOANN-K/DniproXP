import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, ChevronDown, Flag, Gift, Map, Trophy } from "lucide-react";
const items = [
  { to: "/missions", label: "Сюжетні місії", icon: BookOpen },
  { to: "/challenges", label: "Міські виклики", icon: Flag },
  { to: "/map", label: "Мапа квестів", icon: Map },
  { to: "/leaderboard", label: "Рейтинг волонтерів", icon: Trophy },
  { to: "/rewards", label: "Винагороди", icon: Gift },
];
export function ExploreMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  const location = useLocation();
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [location.pathname]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const active = items.some((item) => location.pathname.startsWith(item.to));
  return (
    <details
      ref={ref}
      className={`explore-menu ${active ? "is-active" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && ref.current?.open) {
          ref.current.open = false;
          ref.current.querySelector("summary")?.focus();
          e.preventDefault();
        }
      }}
      onBlur={(e) => {
        if (
          !e.currentTarget.contains(e.relatedTarget as Node | null) &&
          ref.current
        )
          ref.current.open = false;
      }}
    >
      <summary>
        Досліджувати <ChevronDown size={15} />
      </summary>
      <div className="explore-menu-content">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink to={to} key={to}>
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </div>
    </details>
  );
}
