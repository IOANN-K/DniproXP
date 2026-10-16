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
  Waves,
  Home,
  Compass,
  Flag,
  UserRound,
  Trophy,
  Gift,
  Building2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "../../shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "../../shared/ui/sheet";
import { LevelUpDialog } from "../../features/gamification/level-up-dialog";
import {
  VolunteerAvatar,
  LevelBadge,
} from "../../entities/gamification/components";
import { useVolunteer } from "../../shared/lib/use-volunteer";
import { DemoSwitcher } from "../../features/auth/demo-switcher";
import { roleHome } from "../../features/auth/auth-adapter";
import { PlatformToast } from "../../shared/ui/platform-toast";
import { useSession } from "../../features/session/store";
import { cn } from "../../shared/lib/utils";

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

function MobileBottomNav() {
  const session = useSession((s) => s.user);

  let items = [
    { to: "/", label: "Головна", icon: Home, end: true },
    { to: "/quests", label: "Квести", icon: Compass, end: false },
    { to: "/map", label: "Мапа", icon: MapPin, end: false },
    { to: "/leaderboard", label: "Рейтинг", icon: Trophy, end: false },
    {
      to: session ? (session.role === "VOLUNTEER" ? "/dashboard" : roleHome(session.role)) : "/login",
      label: session ? "Простір" : "Увійти",
      icon: UserRound,
      end: false,
    },
  ];

  if (session?.role === "VOLUNTEER") {
    items = [
      { to: "/", label: "Головна", icon: Home, end: true },
      { to: "/quests", label: "Квести", icon: Compass, end: false },
      { to: "/my-quests", label: "Мої справи", icon: Flag, end: false },
      { to: "/map", label: "Мапа", icon: MapPin, end: false },
      { to: "/dashboard", label: "Простір", icon: UserRound, end: false },
    ];
  } else if (session?.role === "ORGANIZER") {
    items = [
      { to: "/", label: "Головна", icon: Home, end: true },
      { to: "/organizer", label: "Огляд", icon: LayoutDashboard, end: true },
      { to: "/organizer/quests", label: "Квести", icon: Flag, end: false },
      { to: "/quests", label: "Каталог", icon: Compass, end: false },
      { to: "/organizations", label: "Команди", icon: Building2, end: false },
    ];
  } else if (session?.role === "ADMIN") {
    items = [
      { to: "/", label: "Головна", icon: Home, end: true },
      { to: "/quests", label: "Квести", icon: Compass, end: false },
      { to: "/map", label: "Мапа", icon: MapPin, end: false },
      { to: "/admin", label: "Модерація", icon: ShieldCheck, end: false },
      { to: "/leaderboard", label: "Рейтинг", icon: Trophy, end: false },
    ];
  }

  return (
    <nav className="mobile-bottom-nav" aria-label="Нижня навігація застосунку">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to + label}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn("mobile-bottom-nav-item", isActive && "active")
          }
        >
          <Icon size={20} strokeWidth={2.2} />
          <span>{label}</span>
          <span className="nav-active-pill" aria-hidden="true" />
        </NavLink>
      ))}
    </nav>
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
                  className="desktop-logout-button"
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
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mobile-menu-trigger"
                  aria-label="Відкрити меню"
                >
                  <Menu size={22} />
                </Button>
              </SheetTrigger>
              <SheetContent
                title="Навігація DniproXP"
                description="Знайди свій спосіб допомогти місту"
              >
                {user && (
                  <div className="drawer-user-card">
                    <VolunteerAvatar user={user} large />
                    <div>
                      <strong>{user.name}</strong>
                      <LevelBadge xp={user.xp} />
                    </div>
                  </div>
                )}
                <nav className="mobile-nav" aria-label="Мобільне меню">
                  <div className="drawer-group">
                    <span className="drawer-group-title">Основні розділи</span>
                    <SheetClose asChild>
                      <NavLink to="/" end className="drawer-link">
                        <span className="drawer-link-label">
                          <Home size={18} /> Головна
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/quests" className="drawer-link">
                        <span className="drawer-link-label">
                          <Compass size={18} /> Квести
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/map" className="drawer-link">
                        <span className="drawer-link-label">
                          <MapPin size={18} /> Мапа добрих справ
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/leaderboard" className="drawer-link">
                        <span className="drawer-link-label">
                          <Trophy size={18} /> Рейтинг містян
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/rewards" className="drawer-link">
                        <span className="drawer-link-label">
                          <Gift size={18} /> Винагороди та бали
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                  </div>

                  {user && (
                    <div className="drawer-group">
                      <span className="drawer-group-title">
                        {session?.role === "ORGANIZER"
                          ? "Кабінет організатора"
                          : session?.role === "ADMIN"
                            ? "Панель керування"
                            : "Мій простір"}
                      </span>
                      {session?.role === "VOLUNTEER" && (
                        <>
                          <SheetClose asChild>
                            <NavLink to="/dashboard" className="drawer-link">
                              <span className="drawer-link-label">
                                <LayoutDashboard size={18} /> Огляд простору
                              </span>
                              <ArrowUpRight size={17} />
                            </NavLink>
                          </SheetClose>
                          <SheetClose asChild>
                            <NavLink to="/my-quests" className="drawer-link">
                              <span className="drawer-link-label">
                                <Flag size={18} /> Мої квести
                              </span>
                              <ArrowUpRight size={17} />
                            </NavLink>
                          </SheetClose>
                          <SheetClose asChild>
                            <NavLink to="/profile" className="drawer-link">
                              <span className="drawer-link-label">
                                <UserRound size={18} /> Профіль волонтера
                              </span>
                              <ArrowUpRight size={17} />
                            </NavLink>
                          </SheetClose>
                        </>
                      )}
                      {session?.role === "ORGANIZER" && (
                        <>
                          <SheetClose asChild>
                            <NavLink to="/organizer" end className="drawer-link">
                              <span className="drawer-link-label">
                                <LayoutDashboard size={18} /> Огляд кабінету
                              </span>
                              <ArrowUpRight size={17} />
                            </NavLink>
                          </SheetClose>
                          <SheetClose asChild>
                            <NavLink to="/organizer/quests" className="drawer-link">
                              <span className="drawer-link-label">
                                <Flag size={18} /> Квести та заявки
                              </span>
                              <ArrowUpRight size={17} />
                            </NavLink>
                          </SheetClose>
                          <SheetClose asChild>
                            <NavLink to="/organizer/quests/new" className="drawer-link">
                              <span className="drawer-link-label">
                                <Sparkles size={18} /> Створити квест
                              </span>
                              <ArrowUpRight size={17} />
                            </NavLink>
                          </SheetClose>
                        </>
                      )}
                      {session?.role === "ADMIN" && (
                        <SheetClose asChild>
                          <NavLink to="/admin" className="drawer-link">
                            <span className="drawer-link-label">
                              <ShieldCheck size={18} /> Модерація платформи
                            </span>
                            <ArrowUpRight size={17} />
                          </NavLink>
                        </SheetClose>
                      )}
                    </div>
                  )}

                  <div className="drawer-group">
                    <span className="drawer-group-title">Спільнота</span>
                    <SheetClose asChild>
                      <NavLink to="/organizations" className="drawer-link">
                        <span className="drawer-link-label">
                          <Building2 size={18} /> Організації Дніпра
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/organizers" className="drawer-link">
                        <span className="drawer-link-label">
                          <Users size={18} /> Для організаторів
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                    <SheetClose asChild>
                      <NavLink to="/demo" className="drawer-link">
                        <span className="drawer-link-label">
                          <Sparkles size={18} /> Покроковий демосценарій
                        </span>
                        <ArrowUpRight size={17} />
                      </NavLink>
                    </SheetClose>
                  </div>

                  <div className="drawer-auth-actions">
                    {user ? (
                      <Button
                        variant="outline"
                        className="drawer-logout-button"
                        onClick={() => {
                          setOpen(false);
                          logout();
                        }}
                      >
                        <LogOut size={17} /> Вийти з облікового запису
                      </Button>
                    ) : (
                      <div className="drawer-guest-buttons">
                        <SheetClose asChild>
                          <Button asChild variant="outline" className="drawer-action-btn">
                            <Link to="/login">Увійти</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button asChild className="drawer-action-btn">
                            <Link to="/register">Зареєструватися</Link>
                          </Button>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <MobileBottomNav />
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
