import {
  createBrowserRouter,
  Link,
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";
import { PublicLayout } from "./layouts/public-layout";
import { HomePage } from "../pages/home-page";
import { QuestsPage } from "../pages/quests-page";
import { QuestDetailPage } from "../pages/quest-detail-page";
import {
  LeaderboardPage,
  RewardsPage,
  ProfilePage,
  OrganizersPage,
} from "../pages/community-pages";
import { MapPage } from "../pages/map-page";
import { Button } from "../shared/ui/button";
function NotFound() {
  return (
    <div className="container empty-state">
      <p className="eyebrow">404</p>
      <h1>Тут поки немає квесту</h1>
      <p>Але в місті є багато добрих справ, які чекають на тебе.</p>
      <Button asChild>
        <Link to="/quests">Знайти квест</Link>
      </Button>
    </div>
  );
}
function RouteError() {
  const error = useRouteError();
  return (
    <div className="container empty-state">
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? "Сторінку не знайдено"
          : "Щось пішло не так"}
      </h1>
      <p>Спробуй відкрити сторінку ще раз.</p>
      <Button asChild>
        <a href="/">На головну</a>
      </Button>
    </div>
  );
}
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "quests", element: <QuestsPage /> },
      { path: "quests/:id", element: <QuestDetailPage /> },
      { path: "map", element: <MapPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "rewards", element: <RewardsPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "organizers", element: <OrganizersPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
