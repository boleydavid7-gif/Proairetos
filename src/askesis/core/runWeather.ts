/*
 * The weather at the hour of a run, and what published guidance says about it: heat (ACSM's position stand on exertional
 * heat illness), cold (ACSM's on cold-weather exercise), ice, rain, UV (WHO's UV index) and air quality (EPA's AQI).
 * Facts and the sources' own words; the runner decides.
 */

export type RunHour = {
  /** °C. */
  temp: number;
  feels: number;
  humidity?: number;
  /** %. */
  rain?: number;
  /** km/h. */
  wind?: number;
  uv?: number;
  code?: number;
  day?: boolean;
  /** US AQI. */
  aqi?: number;
};

export type RunNote = { text: string; source: string };

export const WEATHER_SOURCES = {
  heat: 'Armstrong et al. 2007, ACSM position stand: exertional heat illness during training and competition',
  cold: 'Castellani et al. 2006, ACSM position stand: prevention of cold injuries during exercise',
  uv: 'World Health Organization, Global Solar UV Index (2002)',
  air: 'US EPA, Air Quality Index: a guide to air quality and your health (2014)',
};

const SNOW_OR_FREEZING = new Set([56, 57, 66, 67, 71, 73, 75, 77, 85, 86]);

/** What the sources say for this hour, most pressing first; `easier` when they suggest an easier, shorter or moved run. */
export function runNotes(hour: RunHour, degrees: (celsius: number) => string): { notes: RunNote[]; easier: boolean } {
  const notes: RunNote[] = [];
  let easier = false;
  if (hour.feels >= 32) {
    notes.push({ text: `Feels like ${degrees(hour.feels)}. ACSM suggests an easier or shorter run, early or late in the day, with drinks before and after.`, source: WEATHER_SOURCES.heat });
    easier = true;
  } else if (hour.feels >= 27) {
    notes.push({ text: `Feels like ${degrees(hour.feels)}. Go by effort rather than pace; heat raises it. Drink before and after.`, source: WEATHER_SOURCES.heat });
  }
  if (hour.aqi !== undefined && hour.aqi > 150) {
    notes.push({ text: `Air quality is unhealthy (AQI ${Math.round(hour.aqi)}). The EPA suggests shorter, easier activity, or indoors.`, source: WEATHER_SOURCES.air });
    easier = true;
  } else if (hour.aqi !== undefined && hour.aqi > 100) {
    notes.push({ text: `Air quality is unhealthy for sensitive groups (AQI ${Math.round(hour.aqi)}), such as people with asthma.`, source: WEATHER_SOURCES.air });
  }
  if (hour.temp <= 1 && ((hour.rain ?? 0) >= 40 || (hour.code !== undefined && SNOW_OR_FREEZING.has(hour.code)))) {
    notes.push({ text: 'Ice is possible. Shorter strides and a route you know help with footing.', source: WEATHER_SOURCES.cold });
  }
  if (hour.feels <= -10) notes.push({ text: `Feels like ${degrees(hour.feels)}. Cover hands, ears and face; frostbite can start within 30 minutes at this cold with wind.`, source: WEATHER_SOURCES.cold });
  else if (hour.feels <= 0) notes.push({ text: `Feels like ${degrees(hour.feels)}. Thin layers you can take off once warm.`, source: WEATHER_SOURCES.cold });
  if (hour.day !== false && (hour.uv ?? 0) >= 6) notes.push({ text: `UV ${Math.round(hour.uv!)}, high: a cap, sunscreen, or shade.`, source: WEATHER_SOURCES.uv });
  return { notes, easier };
}

/** "6 PM · 72°, feels 75° · rain 70% · wind 25 km/h", for the hour. */
export function hourLine(hour: RunHour, label: string, degrees: (celsius: number) => string, windUnit: 'km/h' | 'mph'): string {
  const wind = hour.wind === undefined ? undefined : windUnit === 'mph' ? Math.round(hour.wind / 1.609) : Math.round(hour.wind);
  return [
    label,
    `${degrees(hour.temp)}${Math.abs(hour.feels - hour.temp) >= 2 ? `, feels ${degrees(hour.feels)}` : ''}`,
    (hour.rain ?? 0) >= 30 ? `rain ${hour.rain}%` : undefined,
    wind !== undefined && wind >= (windUnit === 'mph' ? 15 : 25) ? `wind ${wind} ${windUnit}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The forecast hour to show for a run on `date`: the runner's usual time rounded to the hour, else the next whole hour. */
export function runHourFor(date: string, runAt: string | undefined, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (runAt) {
    const [h, m] = runAt.split(':').map(Number);
    return `${date}T${pad(Math.min(23, h + (m >= 30 ? 1 : 0)))}:00`;
  }
  return `${date}T${pad(Math.min(23, now.getHours() + (now.getMinutes() > 0 ? 1 : 0)))}:00`;
}
