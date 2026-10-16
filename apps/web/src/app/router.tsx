import { QuestWizardPage } from "../pages/organizer/quest-wizard-page";
import { ImpactPage } from "../pages/impact-page";
import { ImpactReceiptsPage } from "../pages/impact-receipts-page";
import { IdentityDemoPage } from "../pages/identity-demo-page";
import { PassportPage, PassportCredentialPage } from "../pages/passport";
import { SkillsPage } from "../pages/skills";
import { TeamsPage, CreateTeamPage, TeamPage } from "../pages/teams";
import { MissionsPage } from "../pages/missions";
import { MissionDetailsPage } from "../pages/mission-details";
import { ChallengesPage } from "../pages/challenges";
import { ChallengeDetailsPage } from "../pages/challenge-details";
import { createBrowserRouter } from "react-router-dom";
import { NotFound, RouteError } from "./route-feedback";
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
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "quests", element: <QuestsPage /> },
      { path: "passport/credentials/:id", element: <PassportCredentialPage /> },
      { path: "passport/:userId", element: <PassportPage /> },
      { path: "teams", element: <TeamsPage /> },
      { path: "teams/:slug", element: <TeamPage /> },
      { path: "teams/:slug/members", element: <TeamPage view="members" /> },
      { path: "teams/:slug/quests", element: <TeamPage view="quests" /> },
      { path: "teams/:slug/settings", element: <TeamPage view="settings" /> },
      { path: "missions", element: <MissionsPage /> },
      { path: "missions/:slug", element: <MissionDetailsPage /> },
      { path: "challenges", element: <ChallengesPage /> },
      { path: "challenges/:slug", element: <ChallengeDetailsPage /> },
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
      { path: "demo/identity", element: <IdentityDemoPage /> },
      {
        element: <ProtectedRoute roles={["VOLUNTEER"]} />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "impact/receipts", element: <ImpactReceiptsPage /> },
          { path: "impact/receipts/:id", element: <ImpactReceiptsPage /> },
          { path: "passport", element: <PassportPage /> },
          { path: "skills", element: <SkillsPage /> },
          { path: "teams/create", element: <CreateTeamPage /> },
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
              { path: "quests/generate", element: <QuestWizardPage /> },
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
