import { useState } from "react";
import { Link } from "react-router-dom";
import type { Team, TeamMembership } from "../../entities/team/types";
import {
  teamRoleLabels,
  membershipLabels,
  invitationLabels,
} from "../../entities/team/presentation";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { useSession } from "../session/store";
import { useTeamMutation } from "./hooks";
import { teamsApi } from "../../mocks/identity-api";
import { ActionDialog } from "../../shared/ui/action-dialog";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
export function TeamMembers({ team }: { team: Team }) {
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const memberships =
    s.identity?.memberships.filter((m) => m.teamId === team.id) || [];
  const mine = memberships.find(
    (m) => m.userId === user?.id && m.status === "ACTIVE",
  );
  const canManage =
    team.status === "ACTIVE" &&
    (mine?.role === "OWNER" || mine?.role === "MANAGER");
  const [invited, setInvited] = useState("");
  const mutation = useTeamMutation();
  const candidates = s.accounts.filter(
    (a) =>
      a.role === "VOLUNTEER" &&
      !memberships.some((m) => m.userId === a.id && m.status === "ACTIVE"),
  );
  const invitations =
    s.identity?.invitations.filter((i) => i.teamId === team.id) || [];
  return (
    <section className="personal-section">
      <h2>Люди цієї історії</h2>
      {canManage && (
        <Card className="team-invite-form">
          <h3>Запроси волонтера</h3>
          <label>
            Волонтер
            <select
              value={invited}
              onChange={(e) => setInvited(e.target.value)}
            >
              <option value="">Обери користувача</option>
              {candidates.map((a) => (
                <option key={a.id} value={a.id}>
                  {s.profiles[a.id]?.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!invited || mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { type: "INVITE", teamId: team.id, userId: invited },
                { onSuccess: () => setInvited("") },
              )
            }
          >
            Надіслати запрошення
          </Button>
          {mutation.isError && (
            <p role="alert" className="error-message">
              {mutation.error.message}
            </p>
          )}
        </Card>
      )}
      <div className="team-members-list">
        {memberships.map((m) => (
          <Member key={m.id} team={team} member={m} viewer={mine} />
        ))}
      </div>
      {canManage && (
        <Card className="team-invitation-history">
          <h3>Історія запрошень</h3>
          {invitations.length ? (
            invitations.map((inv) => (
              <div key={inv.id}>
                <span>{s.profiles[inv.invitedUserId]?.name}</span>
                <Badge>{invitationLabels[inv.status]}</Badge>
                {inv.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        type: "REVOKE_INVITE",
                        invitationId: inv.id,
                      })
                    }
                  >
                    Відкликати
                  </Button>
                )}
              </div>
            ))
          ) : (
            <p className="muted">Нові запрошення з’являться тут.</p>
          )}
        </Card>
      )}
    </section>
  );
}
function Member({
  team,
  member: m,
  viewer,
}: {
  team: Team;
  member: TeamMembership;
  viewer: TeamMembership | undefined;
}) {
  const s = useVolunteerState();
  const active = team.status === "ACTIVE" && m.status === "ACTIVE";
  const owner = viewer?.role === "OWNER" && active;
  const remove =
    active &&
    m.role !== "OWNER" &&
    m.userId !== viewer?.userId &&
    (owner || (viewer?.role === "MANAGER" && m.role === "MEMBER"));
  const name = s.profiles[m.userId]?.name || "Волонтер";
  return (
    <Card className="team-member-row">
      <span className="avatar">
        {name
          .split(/\s+/)
          .slice(0, 2)
          .map((n) => n[0])
          .join("")}
      </span>
      <div>
        <h3>
          <Link to={`/profile/${m.userId}`}>{name}</Link>
        </h3>
        <Badge>{teamRoleLabels[m.role]}</Badge>
        <small>{membershipLabels[m.status]}</small>
      </div>
      <div className="team-member-actions">
        {owner && m.role !== "OWNER" && (
          <>
            <ActionDialog
              title="Змінити роль учасника?"
              description="Координатор може редагувати команду, запрошувати волонтерів і подавати командні заявки. Передавати керування може тільки власник."
              confirmLabel={
                m.role === "MEMBER"
                  ? "Призначити координатором"
                  : "Змінити на учасника"
              }
              action={() =>
                teamsApi.mutate({
                  type: "SET_ROLE",
                  teamId: team.id,
                  userId: m.userId,
                  role: m.role === "MEMBER" ? "MANAGER" : "MEMBER",
                })
              }
              trigger={
                <Button size="sm" variant="outline">
                  {m.role === "MEMBER"
                    ? "Зробити координатором"
                    : "Зробити учасником"}
                </Button>
              }
            />
            <ActionDialog
              title="Передати керування командою?"
              description={`${name} стане власником. Твоя роль зміниться на координатора.`}
              confirmLabel="Передати керування"
              action={() =>
                teamsApi.mutate({
                  type: "TRANSFER_OWNER",
                  teamId: team.id,
                  userId: m.userId,
                })
              }
              trigger={
                <Button size="sm" variant="ghost">
                  Передати керування
                </Button>
              }
            />
          </>
        )}
        {remove && (
          <ActionDialog
            title="Завершити членство?"
            description="Попередній підтверджений внесок залишиться в історії. Нові командні заявки для цього волонтера будуть недоступні."
            confirmLabel="Видалити з команди"
            action={() =>
              teamsApi.mutate({
                type: "REMOVE_MEMBER",
                teamId: team.id,
                userId: m.userId,
              })
            }
            trigger={
              <Button size="sm" variant="ghost">
                Видалити
              </Button>
            }
          />
        )}
      </div>
    </Card>
  );
}
