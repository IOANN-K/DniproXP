import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  MapPin,
  LogOut,
  Waves,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "../../shared/ui/sheet";
import { DemoDialog } from "../../features/session/demo-dialog";
import { LevelUpDialog } from "../../features/gamification/level-up-dialog";
import { VolunteerAvatar } from "../../entities/gamification/components";
import { useVolunteer } from "../../shared/lib/use-volunteer";
import { useSession } from "../../features/session/store";
const links = [
  ["/", "Головна"],
  ["/quests", "Квести"],
  ["/map", "Мапа"],
  ["/leaderboard", "Рейтинг"],
  ["/rewards", "Нагороди"],
];
export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="DniproXP — головна">
      <span className="logo-mark">
        <Waves size={26} strokeWidth={2.5} />
      </span>
      <span>
        Dnipro<span className="logo-xp">XP</span>
        <small>МІСТО ПОЧИНАЄТЬСЯ З ТЕБЕ</small>
      </span>
    </Link>
  );
}
export function PublicLayout() {
  const user = useVolunteer();
  const logout = useSession((s) => s.logout);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
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
            {links.map(([to, title]) => (
              <NavLink key={to} to={to} end={to === "/"}>
                {title}
              </NavLink>
            ))}
          </nav>
          <div className="header-actions">
            {user ? (
              <>
                <Link
                  className="profile-link"
                  to="/dashboard"
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
                <DemoDialog>
                  <Button variant="ghost" className="login-button">
                    Увійти
                  </Button>
                </DemoDialog>
                <DemoDialog>
                  <Button size="sm">
                    Долучитися <ArrowUpRight size={16} />
                  </Button>
                </DemoDialog>
              </>
            )}
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
                  {user && (
                    <>
                      <SheetClose asChild>
                        <Link to="/dashboard">
                          Мій простір
                          <ArrowUpRight size={18} />
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link to="/my-quests">
                          Мої квести
                          <ArrowUpRight size={18} />
                        </Link>
                      </SheetClose>
                    </>
                  )}
                  <SheetClose asChild>
                    <Link to="/profile">
                      Мій профіль
                      <ArrowUpRight size={18} />
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <LevelUpDialog />
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
              <Link to="/map">Квести на мапі</Link>
              <Link to="/leaderboard">Рейтинг містян</Link>
            </div>
            <div>
              <h3>Долучайся</h3>
              <Link to="/rewards">Нагороди та XP</Link>
              <Link to="/organizers">Організаторам</Link>
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
