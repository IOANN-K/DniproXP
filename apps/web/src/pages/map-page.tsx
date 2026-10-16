import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  AttributionControl,
  useMap,
} from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  ArrowUpRight,
  MapPin,
  Search,
  SlidersHorizontal,
  Zap,
  MapPinned,
  LocateFixed,
  WifiOff,
} from "lucide-react";
import type { Quest } from "../entities/types";
import { questApi } from "../mocks/api";
import { categories } from "../mocks/data";
import { Button } from "../shared/ui/button";
import { Badge, Input, Photo } from "../shared/ui/primitives";
import { formatDate } from "../shared/lib/utils";
const EMPTY_QUESTS: Quest[] = [];
const markerIcon = divIcon({
  className: "quest-map-marker",
  html: '<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/></svg></span>',
  iconSize: [42, 48],
  iconAnchor: [21, 44],
  popupAnchor: [0, -40],
});
function Viewport({
  quests,
  selected,
  reset,
}: {
  quests: Quest[];
  selected: Quest | undefined;
  reset: number;
}) {
  const map = useMap();
  const selectedId = selected?.id;
  const latitude = selected?.coordinates?.[0];
  const longitude = selected?.coordinates?.[1];
  useEffect(() => {
    const points = quests.flatMap((q) =>
      q.coordinates ? [q.coordinates] : [],
    );
    if (points.length)
      map.fitBounds(latLngBounds(points), {
        padding: [45, 45],
        maxZoom: 14,
        animate: false,
      });
    else map.setView([48.4647, 35.0462], 12);
    map.invalidateSize();
  }, [map, quests, reset]);
  useEffect(() => {
    if (selectedId && latitude !== undefined && longitude !== undefined)
      map.setView([latitude, longitude], 15, {
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      });
  }, [map, selectedId, latitude, longitude]);
  return null;
}
export function MapPage() {
  const {
    data = EMPTY_QUESTS,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["quests"], queryFn: () => questApi.list() });
  const [selected, setSelected] = useState("");
  const [category, setCategory] = useState("");
  const [district, setDistrict] = useState("");
  const [search, setSearch] = useState("");
  const [onlyMapped, setOnlyMapped] = useState(true);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [filters, setFilters] = useState(false);
  const [reset, setReset] = useState(0);
  const [offline, setOffline] = useState(false);
  const [tiles, setTiles] = useState(0);
  const districts = [...new Set(data.map((q) => q.district))].sort();
  const filtered = useMemo(
    () =>
      data.filter(
        (q) =>
          q.status !== "completed" &&
          (!category || q.categoryId === category) &&
          (!district || q.district === district) &&
          (!onlyAvailable || q.participants < q.capacity) &&
          (!search ||
            `${q.title} ${q.description}`
              .toLocaleLowerCase("uk")
              .includes(search.toLocaleLowerCase("uk"))),
      ),
    [data, category, district, onlyAvailable, search],
  );
  const list = onlyMapped
    ? filtered.filter((q) => q.coordinates && q.coordinateSource)
    : filtered;
  const mapped = useMemo(
    () => filtered.filter((q) => q.coordinates && q.coordinateSource),
    [filtered],
  );
  const selectedQuest = list.find((q) => q.id === selected);
  const clear = () => {
    setCategory("");
    setDistrict("");
    setSearch("");
    setOnlyAvailable(false);
    setOnlyMapped(true);
    setSelected("");
    setReset((r) => r + 1);
  };
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">ВІДКРИЙ СВОЄ МІСТО ДЛЯ ДОБРА</p>
        <h1>Добрі справи на мапі</h1>
        <p>Обирай напрям, знаходь локацію та долучайся до змін поруч.</p>
      </div>
      <div className="catalog-toolbar">
        <div className="search-field">
          <Search size={19} />
          <Input
            aria-label="Пошук квестів на мапі"
            placeholder="Знайти квест або добру справу…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelected("");
            }}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setFilters(!filters)}
          aria-expanded={filters}
          aria-controls="map-filters"
        >
          <SlidersHorizontal size={17} />
          Фільтри
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setSelected("");
            setReset((r) => r + 1);
          }}
          aria-label="Показати всі відфільтровані локації"
        >
          <LocateFixed size={20} />
        </Button>
      </div>
      {filters && (
        <div className="map-filter-panel" id="map-filters">
          <label>
            Напрям
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSelected("");
              }}
            >
              <option value="">Усі категорії</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Район
            <select
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setSelected("");
              }}
            >
              <option value="">Усі райони</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label className="check-filter">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => {
                setOnlyAvailable(e.target.checked);
                setSelected("");
              }}
            />
            Є вільні місця
          </label>
          <Button variant="ghost" onClick={clear}>
            Скинути фільтри
          </Button>
        </div>
      )}
      <div className="map-explanation">
        <MapPinned size={23} />
        <p>
          На мапі лише перевірені реальні локації. Маркер парку чи острова
          позначає територію, а точку зустрічі уточнює організатор. Усі самі
          події — демонстраційні.
        </p>
      </div>
      <div className="map-results-line">
        <span role="status">
          На мапі: {mapped.length} · Без перевірених координат:{" "}
          {filtered.length - mapped.length}
        </span>
        <label>
          <input
            type="checkbox"
            checked={onlyMapped}
            onChange={(e) => {
              setOnlyMapped(e.target.checked);
              setSelected("");
            }}
          />
          Лише квести на мапі
        </label>
      </div>
      {isError ? (
        <div className="empty-state">
          <h2>Не вдалося отримати квести</h2>
          <Button onClick={() => void refetch()}>Повторити</Button>
        </div>
      ) : (
        <div className="interactive-map-layout">
          <div
            className="map-list"
            aria-label="Квести, що відповідають фільтрам"
          >
            {isPending ? (
              <p role="status">Завантажуємо квести…</p>
            ) : list.length ? (
              list.map((q) => (
                <button
                  key={q.id}
                  className={
                    q.id === selected ? "map-item selected" : "map-item"
                  }
                  onClick={() => setSelected(q.id)}
                  aria-pressed={q.id === selected}
                >
                  <span>
                    <MapPin size={16} />
                    {q.district}
                  </span>
                  <strong>{q.title}</strong>
                  <small>{q.address}</small>
                  <div>
                    <Badge>
                      <Zap size={12} />
                      {q.xp} XP
                    </Badge>
                    <Badge>
                      {q.coordinates
                        ? "Перевірена локація"
                        : "Координати уточнюються"}
                    </Badge>
                  </div>
                </button>
              ))
            ) : (
              <div className="map-empty">
                <MapPinned size={35} />
                <h2>Тут поки тихо</h2>
                <p>
                  Для цих фільтрів немає перевірених локацій. Переглянь список
                  без координат або зміни фільтри.
                </p>
                <Button variant="outline" onClick={clear}>
                  Показати всі локації
                </Button>
              </div>
            )}
          </div>
          <div className="leaflet-map-column">
            {offline && (
              <div className="map-offline" role="status">
                <WifiOff size={19} />
                <span>
                  Не вдалося завантажити частину мапи. Список і прев’ю квестів
                  залишаються доступними.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOffline(false);
                    setTiles((v) => v + 1);
                  }}
                >
                  Повторити
                </Button>
              </div>
            )}
            <div
              className="leaflet-wrapper"
              aria-label="Інтерактивна мапа квестів Дніпра"
            >
              <MapContainer
                center={[48.4647, 35.0462]}
                zoom={12}
                scrollWheelZoom={false}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer
                  key={tiles}
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='Дані мапи &copy; <a href="https://www.openstreetmap.org/copyright">учасники OpenStreetMap</a>'
                  eventHandlers={{ tileerror: () => setOffline(true) }}
                />
                <ZoomControl
                  position="topright"
                  zoomInTitle="Збільшити масштаб"
                  zoomOutTitle="Зменшити масштаб"
                />
                <AttributionControl position="bottomright" prefix={false} />
                <Viewport
                  quests={mapped}
                  selected={selectedQuest}
                  reset={reset}
                />
                {mapped.map((q) => (
                  <Marker
                    key={q.id}
                    position={q.coordinates!}
                    icon={markerIcon}
                    title={q.title}
                    alt={`Квест: ${q.title}`}
                    eventHandlers={{ click: () => setSelected(q.id) }}
                  >
                    <Popup closeButton={false}>
                      <div className="quest-popup">
                        <Badge>
                          {categories.find((c) => c.id === q.categoryId)?.name}
                        </Badge>
                        <strong>{q.title}</strong>
                        <p>{q.locationLabel}</p>
                        <Link to={`/quests/${q.id}`}>
                          Детальніше про квест ↗
                        </Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {selectedQuest ? (
              <div className="map-preview">
                <Photo src={selectedQuest.image} alt={selectedQuest.imageAlt} />
                <div>
                  <Badge>
                    {selectedQuest.coordinates
                      ? "Перевірена територія"
                      : "Координати уточнюються"}
                  </Badge>
                  <h2>{selectedQuest.title}</h2>
                  <p>
                    {formatDate(selectedQuest.date)} · {selectedQuest.duration}
                  </p>
                  <p>{selectedQuest.locationLabel || selectedQuest.address}</p>
                  <div className="map-preview-actions">
                    <Button asChild size="sm">
                      <Link to={`/quests/${selectedQuest.id}`}>
                        Про квест <ArrowUpRight size={16} />
                      </Link>
                    </Button>
                    {selectedQuest.coordinateSource && (
                      <a
                        href={selectedQuest.coordinateSource}
                        className="text-link"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Джерело координат <ArrowUpRight size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="map-select-hint">
                <MapPin size={21} />
                <p>
                  Натисни на маркер або обери квест у списку, щоб побачити
                  подробиці.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
