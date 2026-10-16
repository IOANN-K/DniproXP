import { ImpactPage } from "../pages/impact-page";
import { ImpactReceiptsPage } from "../pages/impact-receipts-page";
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
import { LeaderboardPage } from "../pages/leaderboard-page";
import { RewardsPage } from "../pages/rewards-page";
import { ProfilePage } from "../pages/profile-page";
import { DashboardPage } from "../pages/dashboard-page";
import { MyQuestsPage } from "../pages/my-quests-page";
import { OrganizersPage } from "../pages/community-pages";
import { MapPage } from "../pages/map-page";
import { Button } from "../shared/ui/button";
import { ProtectedRoute } from "../features/auth/protected-route";
import { DemoScenarioPage } from "../pages/demo-scenario-page";
import { AuthPage } from "../pages/auth-page";
import { OrganizerLayout } from "./layouts/organizer-layout";
import { OrganizerDashboardPage } from "../pages/organizer/dashboard-page";
import { OrganizerQuestsPage } from "../pages/organizer/quests-page";
import { QuestFormPage } from "../pages/organizer/quest-form-page";
import { OrganizerQuestDetailPage } from "../pages/organizer/quest-detail-page";
import { OrganizationPage } from "../pages/organization-page";
import { AdminPage } from "../pages/admin-page";
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
      { path: "impact", element: <ImpactPage /> },
      { path: "leaderboard", element: <LeaderboardPage /> },
      { path: "rewards", element: <RewardsPage /> },

      { path: "profile/:id", element: <ProfilePage /> },

      { path: "organizers", element: <OrganizersPage /> },
      { path: "organizations", element: <OrganizationPage /> },
      { path: "organizations/:id", element: <OrganizationPage /> },
      { path: "login", element: <AuthPage /> },
      { path: "register", element: <AuthPage register /> },
      { path: "demo", element: <DemoScenarioPage /> },
      {
        element: <ProtectedRoute roles={["VOLUNTEER"]} />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "impact/receipts", element: <ImpactReceiptsPage /> },
          { path: "impact/receipts/:id", element: <ImpactReceiptsPage /> },
          { path: "my-quests", element: <MyQuestsPage /> },
          { path: "profile", element: <ProfilePage /> },
        ],
      },
      {
        element: <ProtectedRoute roles={["ORGANIZER"]} />,
        children: [
          {
            path: "organizer",
            element: <OrganizerLayout />,
            children: [
              { index: true, element: <OrganizerDashboardPage /> },
              { path: "quests", element: <OrganizerQuestsPage /> },
              { path: "quests/new", element: <QuestFormPage /> },
              { path: "quests/:id/edit", element: <QuestFormPage /> },
              { path: "quests/:id", element: <OrganizerQuestDetailPage /> },
            ],
          },
        ],
      },
      {
        element: <ProtectedRoute roles={["ADMIN"]} />,
        children: [{ path: "admin", element: <AdminPage /> }],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
