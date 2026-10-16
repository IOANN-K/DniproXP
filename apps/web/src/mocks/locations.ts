// Coordinates refer to the named public location, never a fabricated meeting point.
// Verified against the linked geographic records on 2026-10-16.
export const verifiedLocations: Record<
  string,
  {
    coordinates: [number, number];
    coordinateSource: string;
    locationLabel: string;
  }
> = {
  "quest-4": {
    coordinates: [48.4708929, 35.0280756],
    coordinateSource: "https://en.wikipedia.org/wiki/Lazar_Hloba_Park",
    locationLabel: "Парк Лазаря Глоби — територія парку",
  },
  "quest-7": {
    coordinates: [48.466261, 35.074267],
    coordinateSource: "https://www.wikidata.org/wiki/Q4301455",
    locationLabel: "Монастирський острів — територія острова",
  },
  "quest-20": {
    coordinates: [48.464, 35.0455],
    coordinateSource:
      "https://commons.wikimedia.org/wiki/Category:Heroyiv_Maydanu_Square,_Dnipro",
    locationLabel: "Площа Героїв Майдану — центр площі",
  },
};
