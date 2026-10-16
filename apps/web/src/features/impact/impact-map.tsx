import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ImpactRecord } from "../../entities/impact/types";
export type ImpactGroup = {
  questId: string;
  title: string;
  records: ImpactRecord[];
  location: ImpactRecord["location"];
};
const icon = divIcon({
  className: "impact-map-pin",
  html: '<span aria-hidden="true">✓</span>',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
});
function Viewport({
  groups,
  selected,
}: {
  groups: ImpactGroup[];
  selected?: ImpactGroup;
}) {
  const map = useMap();
  useEffect(() => {
    const points = groups.flatMap((g) =>
      g.location.coordinates ? [g.location.coordinates] : [],
    );
    if (selected?.location.coordinates)
      map.setView(selected.location.coordinates, 14, { animate: false });
    else if (points.length)
      map.fitBounds(latLngBounds(points), {
        padding: [36, 36],
        maxZoom: 14,
        animate: false,
      });
    else map.setView([48.4647, 35.0462], 12);
    map.invalidateSize();
  }, [map, groups, selected]);
  return null;
}
export function ImpactMap({
  groups,
  selected,
  onSelect,
  onTileError,
  retry,
}: {
  groups: ImpactGroup[];
  selected?: ImpactGroup;
  onSelect: (id: string) => void;
  onTileError: () => void;
  retry: number;
}) {
  return (
    <MapContainer
      className="impact-leaflet"
      center={[48.4647, 35.0462]}
      zoom={12}
      scrollWheelZoom={false}
      aria-label="Мапа підтверджених демонстраційних результатів Дніпра"
    >
      <TileLayer
        key={retry}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        eventHandlers={{ tileerror: onTileError }}
      />
      <Viewport groups={groups} selected={selected} />
      {groups
        .filter((g) => g.location.coordinates)
        .map((g) => (
          <Marker
            key={g.questId}
            position={g.location.coordinates!}
            icon={icon}
            eventHandlers={{ click: () => onSelect(g.questId) }}
          >
            <Popup>
              <strong>{g.title}</strong>
              <p>{g.location.label}</p>
              <button className="text-link" onClick={() => onSelect(g.questId)}>
                Переглянути результат
              </button>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
