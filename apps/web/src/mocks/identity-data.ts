import type { VolunteerState } from "../entities/types";
import type { Team } from "../entities/team/types";
import type { IdentityState } from "../entities/identity-types";
import type { PassportVisibilitySettings } from "../entities/passport/types";
export const defaultPassportVisibility: PassportVisibilitySettings = {
  publicProfile: true,
  showVerifiedHours: true,
  showAchievements: true,
  showSkillProgress: true,
  showActivityHistory: true,
  showOrganizations: true,
};
export function identitySeed(s: VolunteerState): IdentityState {
  const ids = ["demo-user", "u2", "u3", "u4"].filter((id) =>
    s.accounts.some((a) => a.id === id),
  );
  const names = [
    "Берег добрих справ",
    "Сусіди поруч",
    "Зелені вихідні",
    "Лапки у турботі",
    "Відкриті знання",
    "Місто без бар’єрів",
    "Тепла доставка",
    "Хранителі історій",
    "Коло підтримки",
    "Енергія району",
    "Сортуємо разом",
    "Майстерня спільноти",
  ];
  const categories: Team["category"][] = [
    "eco",
    "social",
    "eco",
    "animals",
    "education",
    "city",
    "social",
    "culture",
    "social",
    "city",
    "eco",
    "education",
  ];
  const avatars: Team["avatar"][] = ["leaf", "heart", "flag", "sun"];
  const result: IdentityState = {
    schemaVersion: 1,
    passports: {},
    teams: [],
    memberships: [],
    invitations: [],
    teamQuests: [],
    events: [],
  };
  if (ids.length < 4) return result;
  names.forEach((name, i) => {
    const id = `team-${i + 1}`,
      ownerId = ids[i % ids.length],
      other = ids[(i + 1) % ids.length];
    result.teams.push({
      id,
      slug: `spilnota-${i + 1}`,
      name,
      description: `Демонстраційна команда «${name}» об’єднує сусідів навколо регулярної допомоги Дніпру. Підтримуємо одне одного та підтверджуємо кожну добру справу через організаторів.`,
      avatar: avatars[i % 4],
      coverImage:
        categories[i] === "eco"
          ? "/images/nature.jpg"
          : categories[i] === "animals"
            ? "/images/dogs.jpg"
            : "/images/community.jpg",
      category: categories[i],
      city: "Дніпро",
      createdAt: "2026-09-01T08:00:00+03:00",
      ownerId,
      visibility: "PUBLIC",
      maxMembers: 12,
      status: "ACTIVE",
    });
    [ownerId, other].forEach((userId, j) =>
      result.memberships.push({
        id: `membership:${id}:${userId}`,
        teamId: id,
        userId,
        role: j === 0 ? "OWNER" : i % 2 ? "MANAGER" : "MEMBER",
        status: "ACTIVE",
        joinedAt: "2026-09-01T08:00:00+03:00",
      }),
    );
    result.invitations.push({
      id: `invite-accepted-${i + 1}`,
      teamId: id,
      invitedUserId: other,
      invitedBy: ownerId,
      status: "ACCEPTED",
      createdAt: "2026-09-01T08:00:00+03:00",
      expiresAt: "2026-09-08T08:00:00+03:00",
    });
    const invited = ids[(i + 2) % ids.length];
    result.invitations.push({
      id: `invite-seed-${i + 1}`,
      teamId: id,
      invitedUserId: invited,
      invitedBy: ownerId,
      status:
        i % 4 === 0
          ? "DECLINED"
          : i % 4 === 1
            ? "PENDING"
            : i % 4 === 2
              ? "EXPIRED"
              : "REVOKED",
      createdAt: "2026-10-10T08:00:00+03:00",
      expiresAt:
        i % 4 === 1 ? "2026-10-30T23:59:59+02:00" : "2026-10-12T08:00:00+03:00",
    });
    if (i === 2 || i === 4)
      result.memberships.push({
        id: `membership:${id}:${invited}`,
        teamId: id,
        userId: invited,
        role: "MEMBER",
        status: i === 2 ? "LEFT" : "REMOVED",
        joinedAt: "2026-09-01T08:00:00+03:00",
        endedAt: "2026-09-02T08:00:00+03:00",
      });
    result.events.push({
      id: `team-event-seed-${i}`,
      teamId: id,
      actorId: ownerId,
      title: "Команду створено. Починаємо історію спільних справ.",
      date: "2026-09-01T08:00:00+03:00",
    });
  });
  s.questRecords
    .filter((q) => q.id.startsWith("history-"))
    .forEach((q, i) => {
      const team = result.teams[i % 12];
      const members = result.memberships.filter(
        (m) => m.teamId === team.id && m.status === "ACTIVE",
      );
      const confirmed = s.participations.filter(
        (p) =>
          p.questId === q.id &&
          p.status === "completed" &&
          !p.teamParticipationId &&
          members.some((m) => m.userId === p.userId),
      );
      if (!confirmed.length) return;
      const id = `team-quest-seed-${q.id}`;
      const createdAt = new Date(Date.parse(q.date) - 86400000).toISOString();
      confirmed.forEach((p) => (p.teamParticipationId = id));
      result.teamQuests.push({
        id,
        teamId: team.id,
        questId: q.id,
        participantIds: confirmed.map((p) => p.userId),
        status: "COMPLETED",
        createdAt,
        approvedAt: createdAt,
        completedAt: q.date,
      });
    });
  return result;
}
