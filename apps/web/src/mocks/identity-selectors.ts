import type { VolunteerState } from "../entities/types";
import type {
  VolunteerPassport,
  PassportView,
  PassportCredential,
} from "../entities/passport/types";
import { identityOf } from "./identity-integration";
import { activitiesOf, selectExplorationBadges } from "./exploration-selectors";
import { skillDefinitions } from "../entities/skill/catalog";
import { calculateSkills } from "../entities/skill/calculator";
import { levelFor } from "../entities/gamification/levels";
import { achievements } from "./data";
export const selectSkills = (s: VolunteerState, userId: string) =>
  calculateSkills(
    skillDefinitions,
    userId,
    activitiesOf(s),
    s.questRecords,
    s.participations,
  );
export function buildPassport(
  s: VolunteerState,
  userId: string,
): VolunteerPassport | null {
  const a = s.accounts.find((a) => a.id === userId && a.role === "VOLUNTEER");
  const meta = identityOf(s).passports[userId];
  const profile = s.profiles[userId];
  if (!a || !meta || !profile) return null;
  const activity = activitiesOf(s).filter((a) => a.userId === userId);
  const xp = s.transactions
    .filter((t) => t.userId === userId)
    .reduce((n, t) => n + t.xp, 0);
  const organizations = s.organizations.flatMap((o) => {
    const entries = activity.filter(
      (a) =>
        s.questRecords.find((q) => q.id === a.questId)?.organizationId === o.id,
    );
    return entries.length
      ? [
          {
            organizationId: o.id,
            name: o.name,
            completedQuests: entries.length,
            verifiedHours: entries.reduce((n, a) => n + a.hours, 0),
          },
        ]
      : [];
  });
  return {
    userId,
    passportId: meta.passportId,
    displayName: profile.name,
    avatar: profile.avatar,
    joinDate: meta.joinDate,
    volunteerLevel: levelFor(xp).level,
    totalXp: xp,
    verifiedHours: activity.reduce((n, a) => n + a.hours, 0),
    completedQuests: activity.length,
    achievements: [
      ...achievements
        .filter((a) => activity.length >= a.target)
        .map((a) => ({ id: a.id, title: a.name, description: a.description })),
      ...selectExplorationBadges(s, userId).map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        href: b.href,
      })),
    ],
    skillProgress: selectSkills(s, userId),
    organizationExperience: organizations,
    activityHistory: activity
      .slice()
      .reverse()
      .map((a) => ({
        id: a.id,
        questId: a.questId,
        title: s.questRecords.find((q) => q.id === a.questId)!.title,
        confirmedAt: a.occurredAt,
        hours: a.hours,
        credentialId: `credential:${a.participationId}`,
      })),
    visibilitySettings: meta.visibility,
    demo: true,
  };
}
// Public components receive this filtered object, never the owner's full read model.
export function projectPassport(
  passport: VolunteerPassport,
  owner: boolean,
): PassportView {
  const settings = passport.visibilitySettings!;
  if (!owner && !settings.publicProfile) return { restricted: true };
  if (owner) return { restricted: false, passport };
  const {
    userId,
    passportId,
    displayName,
    avatar,
    joinDate,
    volunteerLevel,
    totalXp,
    completedQuests,
    demo,
  } = passport;
  const projected: VolunteerPassport = {
    userId,
    passportId,
    displayName,
    avatar,
    joinDate,
    volunteerLevel,
    totalXp,
    completedQuests,
    demo,
  };
  if (settings.showVerifiedHours)
    projected.verifiedHours = passport.verifiedHours;
  if (settings.showAchievements) projected.achievements = passport.achievements;
  if (settings.showSkillProgress)
    projected.skillProgress = passport.skillProgress?.map((p) => ({
      ...p,
      evidence: settings.showActivityHistory
        ? p.evidence.map((e) => {
            const { hours, ...visible } = e;
            return settings.showVerifiedHours ? { ...visible, hours } : visible;
          })
        : [],
    }));
  if (settings.showOrganizations)
    projected.organizationExperience = passport.organizationExperience?.map(
      (o) =>
        settings.showVerifiedHours
          ? o
          : {
              organizationId: o.organizationId,
              name: o.name,
              completedQuests: o.completedQuests,
            },
    );
  if (settings.showActivityHistory)
    projected.activityHistory = passport.activityHistory?.map((a) => {
      const { hours, ...visible } = a;
      return settings.showVerifiedHours ? { ...visible, hours } : visible;
    });
  return { restricted: false, passport: projected };
}
export function selectCredential(
  s: VolunteerState,
  id: string,
  viewerId: string | null,
): PassportCredential | null {
  const p = s.participations.find((p) => `credential:${p.id}` === id);
  if (!p) return null;
  const a = activitiesOf(s).find((a) => a.participationId === p.id);
  if (!a) return null;
  const settings = identityOf(s).passports[p.userId]?.visibility;
  if (!settings) return null;
  const own = viewerId === p.userId;
  if (!own && (!settings.publicProfile || !settings.showActivityHistory))
    return null;
  const quest = s.questRecords.find((q) => q.id === p.questId)!;
  const org = s.organizations.find((o) => o.id === quest.organizationId)!;
  return {
    id,
    userId: p.userId,
    title: quest.title,
    questId: quest.id,
    ...(own || settings.showVerifiedHours ? { hours: a.hours } : {}),
    verification: {
      credentialId: id,
      sourceActivityId: a.id,
      issuedAt: a.occurredAt,
      issuedBy:
        own || settings.showOrganizations
          ? org.name
          : "Демонстраційна платформа",
      verificationStatus: "DEMO_CONFIRMED",
      evidenceReferences: own
        ? [`participation:${p.id}`, `transaction:${a.id}`]
        : [],
    },
  };
}
export function visibleTeams(s: VolunteerState, viewerId: string | null) {
  const i = identityOf(s);
  return i.teams.filter(
    (t) =>
      t.visibility === "PUBLIC" ||
      i.memberships.some(
        (m) =>
          m.teamId === t.id && m.userId === viewerId && m.status === "ACTIVE",
      ) ||
      i.invitations.some(
        (inv) =>
          inv.teamId === t.id &&
          inv.invitedUserId === viewerId &&
          inv.status === "PENDING" &&
          Date.parse(inv.expiresAt) > s.clock,
      ),
  );
}
