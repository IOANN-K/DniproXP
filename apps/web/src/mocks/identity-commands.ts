import type { VolunteerState } from "../entities/types";
import type { IdentityCommand } from "../entities/identity-types";
import type { Team, TeamRole } from "../entities/team/types";
import { teamFormSchema } from "../entities/team/form-schema";
import { identityOf } from "./identity-integration";
import { applyParticipation } from "../entities/quest/apply-participation";
export function applyIdentityCommand(
  s: VolunteerState,
  userId: string,
  command: IdentityCommand,
  now: string,
): string | void {
  const i = identityOf(s);
  const actor = s.accounts.find((a) => a.id === userId);
  if (actor?.role !== "VOLUNTEER")
    throw new Error("Увійди як волонтер для цієї дії.");
  const member = (teamId: string, id = userId) =>
    i.memberships.find(
      (m) => m.teamId === teamId && m.userId === id && m.status === "ACTIVE",
    );
  const team = (id: string) => {
    const t = i.teams.find((t) => t.id === id && t.status === "ACTIVE");
    if (!t) throw new Error("Активну команду не знайдено.");
    return t;
  };
  const permit = (t: Team, roles: TeamRole[]) => {
    const m = member(t.id);
    if (!m || !roles.includes(m.role))
      throw new Error("Недостатньо прав у цій команді.");
    return m;
  };
  const add = (t: Team, id: string) => {
    if (member(t.id, id)) throw new Error("Волонтер уже є активним учасником.");
    if (
      i.memberships.filter((m) => m.teamId === t.id && m.status === "ACTIVE")
        .length >= t.maxMembers
    )
      throw new Error("У команді немає вільних місць.");
    const old = i.memberships.find((m) => m.teamId === t.id && m.userId === id);
    if (old) {
      old.status = "ACTIVE";
      old.role = "MEMBER";
      old.joinedAt = now;
      old.endedAt = undefined;
    } else
      i.memberships.push({
        id: `membership:${t.id}:${id}`,
        teamId: t.id,
        userId: id,
        role: "MEMBER",
        status: "ACTIVE",
        joinedAt: now,
      });
  };
  const event = (teamId: string, title: string) =>
    i.events.unshift({
      id: `team-event-${s.revision + 1}`,
      teamId,
      actorId: userId,
      title,
      date: now,
    });
  if (command.type === "PASSPORT_PRIVACY") {
    const passport = i.passports[userId];
    if (
      !passport ||
      Object.values(command.settings).some((v) => typeof v !== "boolean") ||
      Object.keys(passport.visibility).some(
        (k) => !Object.hasOwn(command.settings, k),
      )
    )
      throw new Error("Некоректні налаштування паспорта.");
    passport.visibility = { ...command.settings };
    return;
  }
  if (command.type === "SAVE_TEAM") {
    const parsed = teamFormSchema.safeParse(command.values);
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    const values = parsed.data;
    if (command.teamId) {
      const t = team(command.teamId);
      permit(t, ["OWNER", "MANAGER"]);
      if (
        values.maxMembers <
        i.memberships.filter((m) => m.teamId === t.id && m.status === "ACTIVE")
          .length
      )
        throw new Error("Ліміт менший за кількість учасників.");
      Object.assign(t, values);
      event(t.id, "Оновлено профіль команди.");
      return t.slug;
    }
    const id = `created-team-${s.nextId++}`;
    const slug = `komanda-${id}`;
    const t: Team = {
      ...values,
      id,
      slug,
      createdAt: now,
      ownerId: userId,
      status: "ACTIVE",
    };
    i.teams.push(t);
    i.memberships.push({
      id: `membership:${id}:${userId}`,
      teamId: id,
      userId,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: now,
    });
    event(id, "Створено команду. Нова історія починається разом.");
    return slug;
  }
  if (command.type === "RESPOND_INVITE" || command.type === "REVOKE_INVITE") {
    const inv = i.invitations.find((x) => x.id === command.invitationId);
    if (
      !inv ||
      inv.status !== "PENDING" ||
      Date.parse(inv.expiresAt) <= s.clock
    )
      throw new Error("Запрошення вже опрацьоване або термін минув.");
    const t = team(inv.teamId);
    if (command.type === "REVOKE_INVITE") {
      permit(t, ["OWNER", "MANAGER"]);
      inv.status = "REVOKED";
      event(t.id, "Запрошення відкликано.");
    } else {
      if (inv.invitedUserId !== userId)
        throw new Error("Це запрошення іншого волонтера.");
      if (command.accept) add(t, userId);
      inv.status = command.accept ? "ACCEPTED" : "DECLINED";
      event(
        t.id,
        command.accept
          ? "Волонтер прийняв запрошення."
          : "Запрошення відхилено.",
      );
    }
    return;
  }
  const t = team(command.teamId);
  switch (command.type) {
    case "JOIN_TEAM":
      if (t.visibility !== "PUBLIC")
        throw new Error("До приватної команди потрібне запрошення.");
      add(t, userId);
      event(t.id, "До команди долучився новий учасник.");
      break;
    case "LEAVE_TEAM": {
      const m = permit(t, ["OWNER", "MANAGER", "MEMBER"]);
      if (m.role === "OWNER")
        throw new Error(
          "Спершу передай керування або заверши існування команди.",
        );
      m.status = "LEFT";
      m.endedAt = now;
      event(t.id, "Волонтер вийшов із команди.");
      break;
    }
    case "ARCHIVE_TEAM":
      permit(t, ["OWNER"]);
      if (
        i.teamQuests.some(
          (r) =>
            r.teamId === t.id &&
            ["PENDING", "APPROVED", "IN_PROGRESS", "PARTIAL"].includes(
              r.status,
            ),
        )
      )
        throw new Error("Спочатку врегулюй командні участі.");
      t.status = "ARCHIVED";
      i.invitations
        .filter((inv) => inv.teamId === t.id && inv.status === "PENDING")
        .forEach((inv) => (inv.status = "REVOKED"));
      event(t.id, "Команду архівовано. Підтверджена історія збережена.");
      break;
    case "INVITE":
      permit(t, ["OWNER", "MANAGER"]);
      if (
        !s.accounts.some(
          (a) => a.id === command.userId && a.role === "VOLUNTEER",
        ) ||
        member(t.id, command.userId)
      )
        throw new Error("Обери волонтера, який ще не є учасником.");
      if (
        i.invitations.some(
          (inv) =>
            inv.teamId === t.id &&
            inv.invitedUserId === command.userId &&
            inv.status === "PENDING" &&
            Date.parse(inv.expiresAt) > s.clock,
        )
      )
        throw new Error("Чинне запрошення вже надіслано.");
      i.invitations.push({
        id: `invitation-${s.nextId++}`,
        teamId: t.id,
        invitedUserId: command.userId,
        invitedBy: userId,
        status: "PENDING",
        createdAt: now,
        expiresAt: new Date(s.clock + 7 * 86400000).toISOString(),
      });
      event(t.id, "Надіслано запрошення до команди.");
      break;
    case "REMOVE_MEMBER": {
      const manager = permit(t, ["OWNER", "MANAGER"]);
      const target = member(t.id, command.userId);
      if (
        !target ||
        target.role === "OWNER" ||
        target.userId === userId ||
        (manager.role === "MANAGER" && target.role !== "MEMBER")
      )
        throw new Error("Цього учасника не можна видалити з твоєю роллю.");
      target.status = "REMOVED";
      target.endedAt = now;
      event(t.id, "Учасника видалено з команди.");
      break;
    }
    case "SET_ROLE": {
      permit(t, ["OWNER"]);
      const target = member(t.id, command.userId);
      if (!target || target.role === "OWNER")
        throw new Error("Обери активного учасника без ролі власника.");
      target.role = command.role;
      event(t.id, "Роль учасника оновлено.");
      break;
    }
    case "TRANSFER_OWNER": {
      const old = permit(t, ["OWNER"]);
      const target = member(t.id, command.userId);
      if (!target || target.userId === userId)
        throw new Error("Обери іншого активного учасника.");
      old.role = "MANAGER";
      target.role = "OWNER";
      t.ownerId = target.userId;
      event(t.id, "Передано керування командою.");
      break;
    }
    case "APPLY_QUEST": {
      permit(t, ["OWNER", "MANAGER"]);
      const q = s.questRecords.find((q) => q.id === command.questId);
      const ids = [...new Set(command.participantIds)];
      if (!q?.allowTeamParticipation)
        throw new Error("Квест не дозволяє командні заявки.");
      if (
        !ids.length ||
        ids.length !== command.participantIds.length ||
        ids.length > (q.teamParticipantLimit || q.capacity)
      )
        throw new Error(
          "Перевір кількість учасників і ліміт командної заявки.",
        );
      if (ids.some((id) => !member(t.id, id)))
        throw new Error("Записувати можна лише активних учасників команди.");
      if (
        ids.some((id) =>
          s.participations.some(
            (p) =>
              p.userId === id &&
              p.questId === q.id &&
              (p.status !== "cancelled" || p.applicationStatus === "rejected"),
          ),
        )
      )
        throw new Error(
          "Хтось із вибраних учасників уже має заявку або відмову на цей квест.",
        );
      const id = `team-quest-${s.nextId++}`;
      for (const user of ids) {
        const p = applyParticipation(s, q.id, user, now);
        p.teamParticipationId = id;
      }
      i.teamQuests.push({
        id,
        teamId: t.id,
        questId: q.id,
        participantIds: ids,
        status: "PENDING",
        createdAt: now,
        approvedAt: null,
        completedAt: null,
      });
      event(
        t.id,
        "Подано командну заявку. Кожен учасник очікує рішення організатора.",
      );
      break;
    }
  }
}
