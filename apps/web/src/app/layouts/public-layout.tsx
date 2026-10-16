import { BrandIcon } from "../../features/brand/brand-icon";
import { CommunityMenu } from "../../features/teams/community-menu";
import { ExploreMenu } from "../../features/exploration/explore-menu";
import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  MapPin,
  LogOut,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "../../shared/ui/sheet";
import { LevelUpDialog } from "../../features/gamification/level-up-dialog";
import { VolunteerAvatar } from "../../entities/gamification/components";
import { useVolunteer } from "../../shared/lib/use-volunteer";
import { DemoSwitcher } from "../../features/auth/demo-switcher";
import { roleHome } from "../../features/auth/auth-adapter";
import { PlatformToast } from "../../shared/ui/platform-toast";
import { useSession } from "../../features/session/store";
const links = [
  ["/", "Головна"],
  ["/quests", "Квести"],
  ["/missions", "Сюжетні місії"],
  ["/challenges", "Міські виклики"],
  ["/map", "Мапа"],
  ["/impact", "Вплив міста"],
  ["/leaderboard", "Рейтинг"],
  ["/rewards", "Нагороди"],
  ["/demo", "Демосценарій"],
  ["/teams", "Команди"],
  ["/passport", "Мій паспорт"],
  ["/skills", "Мої навички"],
];
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="DniproXP — головна">
      <span className="logo-mark">
        <BrandIcon name="logo" size={48} />
      </span>
      <span>
        Dnipro<span className="logo-xp">XP</span>
      </span>
    </Link>
  );
}
export function PublicLayout() {
  const user = useVolunteer();
  const session = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() =>
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ behavior: "smooth" }),
      );
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location.pathname, location.hash]);
  return (
    <>
      <a className="skip-link" href="#main">
        Перейти до вмісту
      </a>
      <header className="app-header">
        <div className="container header-inner">
          <Logo />
          <nav className="desktop-nav" aria-label="Основна навігація">
            {links.slice(0, 2).map(([to, title]) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {title}
              </NavLink>
            ))}
            <ExploreMenu />
            <CommunityMenu />
          </nav>
          <div className="header-actions">
            <DemoSwitcher />
            {user ? (
              <>
                <Link
                  className="profile-link"
                  to={session ? roleHome(session.role) : "/dashboard"}
                  aria-label="Мій простір"
                >
                  <VolunteerAvatar user={user} />
                  <span>{user.name.split(" ")[0]}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  aria-label="Вийти"
                >
                  <LogOut size={18} />
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="login-button">
                  <Link to="/login">Увійти</Link>
                </Button>
                <Button asChild size="sm" className="header-register">
                  <Link to="/register">
                    Долучитися <ArrowUpRight size={16} />
                  </Link>
                </Button>
              </>
            )}
            <MobileNavigation key={location.pathname + location.search} />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <LevelUpDialog />
      <PlatformToast />
      <footer className="footer">
        <div className="container">
          <div className="footer-main">
            <div>
              <Logo />
              <p>
                Маленькі дії. Великі зміни.
                <br />
                Разом створюємо Дніпро, який любимо.
              </p>
              <span className="footer-location">
                <MapPin size={15} /> Дніпро, Україна
              </span>
            </div>
            <div>
              <h3>Досліджуй</h3>
              <Link to="/quests">Знайти квест</Link>
              <Link to="/missions">Сюжетні місії</Link>
              <Link to="/challenges">Міські виклики</Link>
              <Link to="/map">Квести на мапі</Link>
              <Link to="/leaderboard">Рейтинг містян і команд</Link>
              <Link to="/teams">Команди міста</Link>
              <Link to="/passport">Волонтерський паспорт</Link>
              <Link to="/skills">Дерево навичок</Link>
            </div>
            <div>
              <h3>Долучайся</h3>
              <Link to="/rewards">Нагороди та XP</Link>
              <Link to="/organizers">Організаторам</Link>
              <Link to="/organizations">Організації</Link>
              <Link to="/demo">Спробувати демосценарій</Link>
              <Link to="/#how-it-works">Як це працює</Link>
            </div>
            <div className="footer-note">
              <span className="eyebrow">ТВОЄ МІСТО. ТВОЯ СУПЕРСИЛА.</span>
              <p>Найкращий час зробити добру справу — сьогодні.</p>
              <Button asChild variant="outline">
                <Link to="/quests">
                  Почати з малого <ArrowRight size={17} />
                </Link>
              </Button>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 DniproXP. Створено з турботою про місто.</span>
            <span>
              Демонстраційна платформа · Усі події та показники вигадані
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

// Remount per destination so a navigation also closes an open mobile sheet.
function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const user = useVolunteer();
  const session = useSession((s) => s.user);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="mobile-menu-trigger"
          aria-label="Відкрити меню"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent
        title="Навігація DniproXP"
        description="Знайди свій спосіб допомогти місту"
      >
        <nav className="mobile-nav">
          {links.map(([to, title]) => (
            <SheetClose asChild key={to}>
              <NavLink to={to} end={to === "/"}>
                {title}
                <ArrowUpRight size={18} />
              </NavLink>
            </SheetClose>
          ))}
          {!session && (
            <>
              <SheetClose asChild>
                <Link to="/login">
                  Увійти <ArrowUpRight size={18} />
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link to="/register">
                  Зареєструватися <ArrowUpRight size={18} />
                </Link>
              </SheetClose>
            </>
          )}
          <SheetClose asChild>
            <Link to="/organizations">
              Організації <ArrowUpRight size={18} />
            </Link>
          </SheetClose>
          {user && (
            <>
              <SheetClose asChild>
                <Link to={session ? roleHome(session.role) : "/dashboard"}>
                  Мій простір
                  <ArrowUpRight size={18} />
                </Link>
              </SheetClose>
              {session?.role === "VOLUNTEER" && (
                <SheetClose asChild>
                  <Link to="/my-quests">
                    Мої квести
                    <ArrowUpRight size={18} />
                  </Link>
                </SheetClose>
              )}
            </>
          )}
          {session?.role === "VOLUNTEER" && (
            <SheetClose asChild>
              <Link to="/profile">
                Мій профіль
                <ArrowUpRight size={18} />
              </Link>
            </SheetClose>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
