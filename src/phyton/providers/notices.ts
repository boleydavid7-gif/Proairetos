import { weatherSettings } from '../../app/weather/weather';
import { daysAhead, noticeLine, type Provider } from '../../core/providers';
import { plantNotices } from '../core/notices';
import { forecastNow, rainNow } from '../app/rain';
import { allPlants, myName, settings } from '../app/state';

/** Plants to check and feed, and frost tonight, as Phyton's own notice function works them out (rain and forecast from this device's caches). */
export const phytonNotices: Provider<'notices'> = {
  app: 'phyton',
  capability: 'notices',
  version: 1,
  privacy: 'own-search',
  sources: ['local:phyton:plant:', 'shared:phyton', 'setting:phyton:settings', 'device:phytonDevice.rain'],
  read: (ctx) => {
    const plants = allPlants();
    const phyton = settings.load();
    const notices = plantNotices(plants, phyton.notices, myName(phyton) || undefined, ctx.today, daysAhead(ctx), ctx.now, {
      hemisphere: phyton.hemisphere,
      rain: phyton.rain ? rainNow() : {},
      forecast: phyton.rain ? forecastNow() : {},
      unit: weatherSettings().unit,
      away: phyton.away,
    });
    return notices.map((notice) => noticeLine('phyton', notice));
  },
};
