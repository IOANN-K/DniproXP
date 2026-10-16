// Approved area-level locations copied from the existing frontend catalog, not inferred addresses.
export const locations: Readonly<
  Record<
    string,
    {
      latitude: number;
      longitude: number;
      coordinateSource: string;
      locationLabel: string;
    }
  >
> = {
  'quest-4': {
    latitude: 48.4708929,
    longitude: 35.0280756,
    coordinateSource: 'https://en.wikipedia.org/wiki/Lazar_Hloba_Park',
    locationLabel: 'Парк Лазаря Глоби — територія парку',
  },
  'quest-7': {
    latitude: 48.466261,
    longitude: 35.074267,
    coordinateSource: 'https://www.wikidata.org/wiki/Q4301455',
    locationLabel: 'Монастирський острів — територія острова',
  },
  'quest-20': {
    latitude: 48.464,
    longitude: 35.0455,
    coordinateSource:
      'https://commons.wikimedia.org/wiki/Category:Heroyiv_Maydanu_Square,_Dnipro',
    locationLabel: 'Площа Героїв Майдану — центр площі',
  },
};
