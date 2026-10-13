import { useState } from 'react';
import { DailyLine } from '../../app/family/DailyLine';
import { Brand, offerUndo } from '../../app/family/shell';
import { AppMark, CameraIcon, PlusIcon } from '../../app/family/icons';
import { Segmented } from '../../askesis/app/ui';
import { toLocalDate } from '../../core/scheduling/dates';
import photo from '../../assets/images/scenes/phyton.webp';
import photoWide from '../../assets/images/scenes/phyton-wide.webp';
import type { PhytonNav } from '../app/App';
import { myName, putPlant, settings, useHome, usePlants } from '../app/state';
import { useForecast, useRain } from '../app/rain';
import { weatherSettings } from '../../app/weather/weather';
import { degrees, frostTonight, hotDays, hotToday, isAway } from '../core/outdoors';
import { dayText as shortDay } from '../core/plants';
import { PlantList } from '../app/ui';
import { feed, grouped, toFeed, type Plant } from '../core/plants';

export default function TodayPage({ nav }: { nav: PhytonNav }) {
  const all = usePlants();
  const current = settings.use();
  const rain = useRain(current.rain);
  const forecast = useForecast(current.rain);
  const unit = weatherSettings().unit;
  const home = useHome();
  const today = toLocalDate(new Date());
  const [whose, setWhose] = useState<'mine' | 'all'>('all');
  const me = myName(current);
  const shown = whose === 'mine' && me ? all.filter((plant) => !plant.who || plant.who === me) : all;
  const groups = grouped(shown, today, current.hemisphere, rain, hotDays(forecast));
  const frost = frostTonight(all, forecast, today);
  const hot = hotToday(all, forecast, today);
  const away = current.away && current.away.to >= today ? current.away : undefined;
  const when = (day: string) => {
    const text = shortDay(day, today);
    return text === 'Today' || text === 'Tomorrow' ? text.toLowerCase() : text;
  };
  const feeding = toFeed(shown, today, current.hemisphere);
  const open = (plant: Plant) => nav.go({ name: 'plant', id: plant.id });

  return (
    <div className="home phyton-home">
      <div className="hero hero--tall hero-shade-soft">
        <picture>
          <source media="(min-width: 62rem)" srcSet={photoWide} />
          <img className="hero__image" src={photo} alt="" />
        </picture>
        <div className="hero__shade" />
        <div className="hero__content">
          <Brand name="Phyton" mark={<AppMark app="phyton" size={30} light />} light />
          <div className="home__words">
            <h1 className="home__title">{groups.now.length === 0 ? 'Nothing to check' : groups.now.length === 1 ? groups.now[0].name : `${groups.now.length} to check`}</h1>
            {home && <p className="home__sub">{home.name}</p>}
          </div>
        </div>
      </div>

      <div className="page page--under-hero">
        {me && home && <Segmented label="Whose" value={whose} options={[{ id: 'all', label: 'Everyone' }, { id: 'mine', label: me }]} onChange={setWhose} small />}

        {away && (
          <section className="card plant-note">
            <span className="card__eyebrow">{isAway(away, today) ? 'Away' : 'Going away'}</span>
            <p>{isAway(away, today) ? `Until ${when(away.to)}. Reminders wait until you’re back.` : `From ${when(away.from)} until ${when(away.to)}.`}</p>
            <div className="button-row">
              <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'sitter' })}>Sheet for whoever waters</button>
            </div>
          </section>
        )}
        {frost && (
          <section className="card plant-note plant-note--cold">
            <span className="card__eyebrow">Frost tonight · {degrees(frost.min, unit)}</span>
            <p>Outside: {frost.plants.map((plant) => plant.name).join(', ')}</p>
          </section>
        )}
        {hot && (
          <section className="card plant-note plant-note--hot">
            <span className="card__eyebrow">Hot today · {degrees(hot.max, unit)}</span>
            <p>Plants outside come round a day sooner: {hot.plants.map((plant) => plant.name).join(', ')}</p>
          </section>
        )}

        {all.length === 0 ? (
          <section className="card first-run">
            <h2 className="card__title">No plants yet</h2>
            <div className="button-row">
              <button type="button" className="button-main" onClick={() => nav.go({ name: 'add' })}><PlusIcon size={18} />Add a plant</button>
              <button type="button" className="button-quiet" onClick={() => nav.go({ name: 'identify' })}><CameraIcon size={18} />Identify</button>
            </div>
          </section>
        ) : (
          <>
            <div className="section-head">
              <h2>Check the soil</h2>
              <button type="button" className="text-link" onClick={() => nav.go({ name: 'add' })}>Add</button>
            </div>
            {groups.now.length ? <PlantList plants={groups.now} today={today} onOpen={open} /> : <p className="muted">Nothing today.</p>}
            {feeding.length > 0 && (
              <section className="card">
                <span className="card__eyebrow">Feed</span>
                <ul className="notes-list">
                  {feeding.map((plant) => (
                    <li key={plant.id} className="note-line">
                      <button type="button" className="text-link" onClick={() => open(plant)}>{plant.name}</button>
                      <button
                        type="button"
                        className="chip"
                        onClick={() => {
                          putPlant(feed(plant, today, me || plant.who));
                          offerUndo(`${plant.name} fed`, () => putPlant(plant));
                        }}
                      >
                        Fed
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {groups.week.length > 0 && (
              <>
                <div className="section-head"><h2>This week</h2></div>
                <PlantList plants={groups.week} today={today} onOpen={open} />
              </>
            )}
          </>
        )}
        {all.length > 0 && <DailyLine app="phyton" />}
      </div>
    </div>
  );
}
