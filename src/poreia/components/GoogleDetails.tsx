import { useEffect, useState } from 'react';
import { Waiting } from '../../lamplight/Waiting';
import { Outbound } from '../app/ui';
import { googlePlace, travelReady } from '../app/world';
import { placeLine, type GooglePlace } from '../core/googlePlace';

/** Google's rating, hours, photos and a few reviews for a place, credited as Google asks; only when set up. */
export function GoogleDetails({ name, lat, lon }: { name: string; lat?: number; lon?: number }) {
  const [place, setPlace] = useState<GooglePlace | null>();
  const [unreached, setUnreached] = useState(false);
  useEffect(() => {
    setPlace(undefined);
    setUnreached(false);
    if (lat === undefined || lon === undefined) return;
    let live = true;
    void (async () => {
      if (!(await travelReady()).places) return live && setPlace(null);
      try {
        const found = await googlePlace(name, lat, lon);
        if (live) setPlace(found);
      } catch {
        if (live) setUnreached(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [name, lat, lon]);

  if (place === null || lat === undefined) return null;
  if (unreached) return null;
  if (place === undefined)
    return (
      <p className="muted">
        <Waiting>Asking Google…</Waiting>
      </p>
    );
  return (
    <section className="card poreia-google">
      <h2 className="card__title">On Google</h2>
      {placeLine(place) && <p className="poreia-google__line">{placeLine(place)}</p>}
      {place.summary && <p>{place.summary}</p>}
      {place.photos.length > 0 && (
        <div className="poreia-google__photos">
          {place.photos.map((photo) => (
            <figure key={photo.url}>
              <img src={photo.url} alt="" referrerPolicy="no-referrer" />
              {photo.by && (
                <figcaption className="fine">{photo.byUrl ? <Outbound href={photo.byUrl}>{photo.by}</Outbound> : photo.by}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
      {place.hours && place.hours.length > 0 && (
        <details className="poreia-fold">
          <summary>Opening hours</summary>
          <ul className="poreia-google__hours">
            {place.hours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      {place.wheelchair !== undefined && <p className="muted">{place.wheelchair ? 'Wheelchair-accessible entrance' : 'No wheelchair-accessible entrance listed'}</p>}
      {place.reviews.length > 0 && (
        <details className="poreia-fold">
          <summary>Reviews</summary>
          <ul className="poreia-google__reviews">
            {place.reviews.map((review, index) => (
              <li key={index}>
                <p className="muted">{[review.rating !== undefined ? `${review.rating} ★` : undefined, review.by, review.when].filter(Boolean).join(' · ')}</p>
                <p>{review.text}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="button-row">
        {place.mapsUrl && <Outbound href={place.mapsUrl}>Open in Google Maps</Outbound>}
      </div>
      <p className="fine">From Google.</p>
    </section>
  );
}
