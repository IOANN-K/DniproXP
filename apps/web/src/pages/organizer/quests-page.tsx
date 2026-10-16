import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowUpRight, Flag, Plus } from "lucide-react";
import { useOrganizer } from "../../features/organizer/use-organizer";
import { questStatusLabels } from "../../mocks/repository";
import { QuestActions } from "../../features/organizer/quest-actions";
import { Card, Badge, Input, Photo } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { formatDate } from "../../shared/lib/utils";
export function OrganizerQuestsPage() {
  const { quests, participations } = useOrganizer();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const list = quests
    .filter(
      (q) =>
        (!status || q.lifecycle === status) &&
        (!search ||
          q.title
            .toLocaleLowerCase("uk")
            .includes(search.toLocaleLowerCase("uk"))),
    )
    .sort((a, b) =>
      (b.updatedAt || b.date).localeCompare(a.updatedAt || a.date),
    );
  return (
    <>
      <div className="workspace-page-heading">
        <div>
          <h2>Ініціативи твоєї команди</h2>
          <p>Від першої чернетки до підтверджених добрих справ.</p>
        </div>
        <Badge>{quests.length} квестів</Badge>
      </div>
      <div className="workspace-filters">
        <div className="search-field">
          <Search size={19} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Пошук власних квестів"
            placeholder="Назва квесту…"
          />
        </div>
        <label>
          <span className="sr-only">Статус квесту</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Усі статуси</option>
            {Object.entries(questStatusLabels).map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="managed-quest-list">
        {list.map((q) => (
          <Card className="managed-quest-card" key={q.id}>
            <Photo src={q.image} alt={q.imageAlt} />
            <div>
              <div className="managed-quest-labels">
                <Badge>{questStatusLabels[q.lifecycle || "published"]}</Badge>
                <Badge>
                  {q.moderation === "pending"
                    ? "На модерації"
                    : q.moderation === "rejected"
                      ? "Приховано модератором"
                      : "Схвалено"}
                </Badge>
              </div>
              <h3>
                <Link to={`/organizer/quests/${q.id}`}>{q.title}</Link>
              </h3>
              <p>
                {q.date ? formatDate(q.date) : "Дата ще не визначена"} ·{" "}
                {q.district || "Район ще не вказаний"}
              </p>
              <span className="field-hint">
                Заявки:{" "}
                {
                  participations.filter(
                    (p) =>
                      p.questId === q.id &&
                      p.applicationStatus === "pending" &&
                      p.status === "planned",
                  ).length
                }{" "}
                · Звіти:{" "}
                {
                  participations.filter(
                    (p) => p.questId === q.id && p.status === "pending",
                  ).length
                }
              </span>
              <QuestActions quest={q} />
              <Link className="text-link" to={`/organizer/quests/${q.id}`}>
                Керувати квестом та учасниками <ArrowUpRight size={16} />
              </Link>
            </div>
          </Card>
        ))}
      </div>
      {!list.length && (
        <Card className="empty-state">
          <Flag size={38} />
          <h2>
            {quests.length
              ? "За цими фільтрами нічого немає"
              : "Перша ініціатива починається тут"}
          </h2>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatus("");
            }}
          >
            Скинути фільтри
          </Button>
          <Button asChild>
            <Link to="/organizer/quests/new">
              <Plus size={17} />
              Створити квест
            </Link>
          </Button>
        </Card>
      )}
    </>
  );
}
