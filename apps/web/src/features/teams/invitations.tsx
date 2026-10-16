import { Link } from "react-router-dom";
import { MailPlus } from "lucide-react";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { useSession } from "../session/store";
import { useTeamMutation } from "./hooks";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { invitationLabels } from "../../entities/team/presentation";
import { formatDate } from "../../shared/lib/utils";
export function MyTeamInvitations() {
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const mutation = useTeamMutation();
  const invitations =
    s.identity?.invitations
      .filter((i) => i.invitedUserId === user?.id)
      .slice()
      .reverse() || [];
  if (!invitations.length) return null;
  return (
    <section className="personal-section">
      <h2>Тебе запрошують до спільноти</h2>
      <div className="team-invitations">
        {invitations.map((inv) => {
          const team = s.identity?.teams.find((t) => t.id === inv.teamId);
          const pending =
            inv.status === "PENDING" && Date.parse(inv.expiresAt) > s.clock;
          return (
            <Card key={inv.id}>
              <MailPlus size={24} />
              <div>
                <h3>{team?.name}</h3>
                <Badge>
                  {
                    invitationLabels[
                      pending
                        ? "PENDING"
                        : inv.status === "PENDING"
                          ? "EXPIRED"
                          : inv.status
                    ]
                  }
                </Badge>
                <p>Чинне до {formatDate(inv.expiresAt)}</p>
              </div>
              {pending && (
                <div>
                  <Button
                    size="sm"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        type: "RESPOND_INVITE",
                        invitationId: inv.id,
                        accept: true,
                      })
                    }
                  >
                    Прийняти
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={mutation.isPending}
                    onClick={() =>
                      mutation.mutate({
                        type: "RESPOND_INVITE",
                        invitationId: inv.id,
                        accept: false,
                      })
                    }
                  >
                    Відхилити
                  </Button>
                  {team && (
                    <Link className="text-link" to={`/teams/${team.slug}`}>
                      Про команду
                    </Link>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {mutation.isError && (
        <p className="error-message" role="alert">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}
