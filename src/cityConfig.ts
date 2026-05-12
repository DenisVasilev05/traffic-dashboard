export interface CityConfig {
  geojsonPath: string;
  mapCenter: [number, number];
  mapZoom: number;
  // Repeat a name to increase its share of records
  districts: string[];
}

const VIENNA: CityConfig = {
  geojsonPath: '/vienna.geojson',
  mapCenter: [48.2082, 16.3738],
  mapZoom: 11,
  districts: [
    'Innere Stadt', 'Leopoldstadt', 'Landstraße', 'Wieden', 'Margareten',
    'Mariahilf', 'Neubau', 'Josefstadt', 'Alsergrund', 'Favoriten',
    'Simmering', 'Meidling', 'Hietzing', 'Penzing', 'Rudolfsheim-Fünfhaus',
    'Ottakring', 'Hernals', 'Währing', 'Döbling', 'Brigittenau',
    'Floridsdorf', 'Donaustadt', 'Liesing',
  ],
};

const NYC: CityConfig = {
  geojsonPath: '/new-york-city-boroughs.geojson',
  mapCenter: [40.65, -73.95],
  mapZoom: 10,
  districts: [
    'Manhattan', 'Manhattan', 'Manhattan', 'Manhattan', 'Manhattan', 'Manhattan', // 30%
    'Brooklyn',  'Brooklyn',  'Brooklyn',  'Brooklyn',  'Brooklyn',               // 25%
    'Queens',    'Queens',    'Queens',    'Queens',                               // 20%
    'Bronx',     'Bronx',     'Bronx',                                            // 15%
    'Staten Island', 'Staten Island',                                             // 10%
  ],
};

// To switch cities, change the value assigned to CITY below.
// Both configs are kept here; void suppresses the unused-variable warning.
void NYC;

export const CITY: CityConfig = VIENNA;
