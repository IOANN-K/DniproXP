import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, ArrowUpRight, BadgeCheck } from "lucide-react";
import type { Quest, VolunteerState } from "../../entities/types";
import type {
  TeamMembership,
  TeamQuestParticipation,
} from "../../entities/team/types";
import { teamQuestLabels } from "../../entities/team/presentation";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { useSession } from "../session/store";
import { useTeamMutation } from "../teams/hooks";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
export function TeamQuestStatusBadge({
  participation,
}: {
  participation: TeamQuestParticipation;
}) {
  return <Badge>{teamQuestLabels[participation.status]}</Badge>;
}
export function TeamQuestProgress({
  participation: r,
  state: s,
}: {
  participation: TeamQuestParticipation;
  state: VolunteerState;
}) {
  const completed = r.participantIds.filter((id) =>
    s.participations.some(
      (p) =>
        p.teamParticipationId === r.id &&
        p.userId === id &&
        p.status === "completed",
    ),
  ).length;
  return (
    <div className="mission-progress">
      <div>
        <strong>
          {completed} / {r.participantIds.length} учасників підтверджено
        </strong>
        <TeamQuestStatusBadge participation={r} />
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Підтверджені учасники командного квесту"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={r.participantIds.length}
      >
        <span
          style={{ width: `${(completed / r.participantIds.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
export function TeamContributionList({
  participation: r,
  state: s,
}: {
  participation: TeamQuestParticipation;
  state: VolunteerState;
}) {
  return (
    <div className="team-contribution-list">
      {r.participantIds.map((id) => {
        const p = s.participations.find(
          (p) => p.teamParticipationId === r.id && p.userId === id,
        );
        const tx = s.transactions.find(
          (t) => t.id === `completion:${id}:${r.questId}`,
        );
        return (
          <div key={id}>
            <Link to={`/passport/${id}`}>{s.profiles[id]?.name}</Link>
            <span>
              {p?.status === "completed" ? (
                <>
                  <BadgeCheck size={15} />+{tx?.xp || 0} XP
                </>
              ) : p?.applicationStatus === "rejected" ? (
                "Заявку відхилено"
              ) : p?.status === "pending" ? (
                "Звіт на перевірці"
              ) : p?.status === "active" ? (
                "Виконує завдання"
              ) : p?.status === "cancelled" || !p ? (
                "Участь скасована"
              ) : (
                "Чекає схвалення"
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
export function TeamMemberSelector({
  members,
  state,
  selected,
  disabledIds,
  onChange,
}: {
  members: TeamMembership[];
  state: VolunteerState;
  selected: string[];
  disabledIds: Set<string>;
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="team-member-selector">
      <legend>Хто піде на квест?</legend>
      {members.map((m) => (
        <label key={m.id}>
          <input
            type="checkbox"
            checked={selected.includes(m.userId)}
            disabled={disabledIds.has(m.userId)}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [...selected, m.userId]
                  : selected.filter((id) => id !== m.userId),
              )
            }
          />
          <span>
            {state.profiles[m.userId]?.name}
            <small>
              {disabledIds.has(m.userId)
                ? "Уже має участь або відхилену заявку"
                : "Одне місце на квесті"}
            </small>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
export function TeamQuestDialog({ quest }: { quest: Quest }) {
  const s = useVolunteerState();
  const user = useSession((s) => s.user);
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const mutation = useTeamMutation();
  if (!quest.allowTeamParticipation) return null;
  const teams =
    s.identity?.teams.filter(
      (t) =>
        t.status === "ACTIVE" &&
        s.identity?.memberships.some(
          (m) =>
            m.teamId === t.id &&
            m.userId === user?.id &&
            m.status === "ACTIVE" &&
            m.role !== "MEMBER",
        ),
    ) || [];
  const chosen = teams.find((t) => t.id === teamId) || teams[0];
  const members =
    s.identity?.memberships.filter(
      (m) => m.teamId === chosen?.id && m.status === "ACTIVE",
    ) || [];
  const disabledIds = new Set(
    s.participations
      .filter(
        (p) =>
          p.questId === quest.id &&
          (p.status !== "cancelled" || p.applicationStatus === "rejected"),
      )
      .map((p) => p.userId),
  );
  const occupied =
    s.questRecords.find((q) => q.id === quest.id)?.participants || 0;
  const used = s.participations.filter(
    (p) =>
      p.questId === quest.id &&
      p.status !== "cancelled" &&
      p.applicationStatus !== "rejected",
  ).length;
  const free = Math.max(0, quest.capacity - occupied - used);
  return (
    <Card className="team-quest-entry">
      <Users size={27} />
      <h3>Добрі справи легші разом</h3>
      <p>
        Квест приймає команди до {quest.teamParticipantLimit || quest.capacity}{" "}
        учасників. Зараз вільно {free} місць.
      </p>
      {user?.role === "VOLUNTEER" && teams.length ? (
        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!mutation.isPending) {
              setOpen(v);
              if (v) {
                setSelected([]);
                mutation.reset();
              }
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              disabled={
                !free ||
                quest.status === "completed" ||
                !["published", "active"].includes(quest.lifecycle || "")
              }
            >
              Подати командну заявку
            </Button>
          </DialogTrigger>
          <DialogContent
            title="Разом на добру справу"
            description="Кожен вибраний волонтер займе одне місце. Заявки та звіти розглядаються організатором окремо, XP нараховується тільки підтвердженим учасникам."
          >
            <label className="team-dialog-select">
              Команда
              <select
                value={chosen?.id || ""}
                disabled={mutation.isPending}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setSelected([]);
                }}
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <TeamMemberSelector
              members={members}
              state={s}
              selected={selected}
              disabledIds={disabledIds}
              onChange={setSelected}
            />
            <p className="field-hint">
              Вибрано {selected.length} · вільно {free} · ліміт заявки{" "}
              {quest.teamParticipantLimit || quest.capacity}
            </p>
            {mutation.isError && (
              <p className="error-message" role="alert">
                {mutation.error.message}
              </p>
            )}
            <Button
              disabled={
                mutation.isPending ||
                !chosen ||
                !selected.length ||
                selected.length > free ||
                selected.length > (quest.teamParticipantLimit || quest.capacity)
              }
              onClick={() =>
                chosen &&
                mutation.mutate(
                  {
                    type: "APPLY_QUEST",
                    teamId: chosen.id,
                    questId: quest.id,
                    participantIds: selected,
                  },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              {mutation.isPending ? "Подаємо заявки…" : "Подати заявку команди"}
            </Button>
          </DialogContent>
        </Dialog>
      ) : (
        <Button asChild variant="outline">
          <Link to={user ? "/teams" : "/login"}>
            {user
              ? "Знайти або створити команду"
              : "Увійти для командної участі"}
            <ArrowUpRight size={16} />
          </Link>
        </Button>
      )}
      <p className="field-hint">
        Командну заявку подає власник або координатор.
      </p>
    </Card>
  );
}
export function OrganizerTeamApplications({ questId }: { questId: string }) {
  const s = useVolunteerState();
  const records =
    s.identity?.teamQuests.filter((r) => r.questId === questId) || [];
  if (!records.length) return null;
  return (
    <section className="personal-section">
      <h2>Командні заявки</h2>
      <p className="muted">
        Схвалення участі й підтвердження звітів виконуються нижче для кожного
        волонтера через наявний процес.
      </p>
      <div className="team-quest-list">
        {records.map((r) => (
          <Card key={r.id}>
            <h3>{s.identity?.teams.find((t) => t.id === r.teamId)?.name}</h3>
            <TeamQuestProgress participation={r} state={s} />
            <TeamContributionList participation={r} state={s} />
          </Card>
        ))}
      </div>
    </section>
  );
}
