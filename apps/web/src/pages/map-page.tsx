import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPin, Zap } from "lucide-react";
import { questApi } from "../mocks/api";
import { Button } from "../shared/ui/button";
import { Badge } from "../shared/ui/primitives";
export function MapPage() {
  const {
    data = [],
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["quests"], queryFn: () => questApi.list() });
  const [selected, setSelected] = useState("quest-1");
  const quest = data.find((q) => q.id === selected) || data[0];
  const lat = quest?.coordinates[0] || 48.46;
  const lon = quest?.coordinates[1] || 35.04;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.04}%2C${lat - 0.025}%2C${lon + 0.04}%2C${lat + 0.025}&layer=mapnik&marker=${lat}%2C${lon}`;
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">ДОБРІ СПРАВИ ПОРУЧ</p>
        <h1>Твоє місто можливостей</h1>
        <p>Обирай квест у списку — мапа покаже його демонстраційну локацію.</p>
      </div>
      {isError ? (
        <div className="empty-state">
          <h2>Не вдалося завантажити квести</h2>
          <Button onClick={() => void refetch()}>Повторити</Button>
        </div>
      ) : (
        <div className="map-layout">
          <div className="map-list" aria-label="Обери квест на мапі">
            {isPending ? (
              <p role="status">Завантажуємо квести…</p>
            ) : (
              data
                .filter((q) => q.status !== "completed")
                .map((q) => (
                  <button
                    key={q.id}
                    className={
                      q.id === selected ? "map-item selected" : "map-item"
                    }
                    onClick={() => setSelected(q.id)}
                    aria-pressed={q.id === selected}
                  >
                    <span>
                      <MapPin size={18} />
                      {q.district}
                    </span>
                    <strong>{q.title}</strong>
                    <small>{q.address}</small>
                    <Badge>
                      <Zap size={12} />+{q.xp} XP
                    </Badge>
                  </button>
                ))
            )}
          </div>
          <div className="map-view">
            <iframe
              title="Демонстраційна локація квесту на OpenStreetMap"
              src={src}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="map-selected">
              <div>
                <Badge>ОРІЄНТОВНА ЛОКАЦІЯ</Badge>
                <h2>{quest?.title || "Обери квест"}</h2>
                <p>{quest?.address}</p>
              </div>
              {quest && (
                <Button asChild>
                  <Link to={`/quests/${quest.id}`}>
                    Про квест <ArrowUpRight size={17} />
                  </Link>
                </Button>
              )}
            </div>
            <p className="demo-caption">
              Координати умовні та не призначені для навігації. Мапа потребує
              інтернету.{" "}
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`}
                target="_blank"
                rel="noreferrer"
              >
                Відкрити OpenStreetMap
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
