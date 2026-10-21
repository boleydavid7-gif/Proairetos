import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { Waiting } from '../../lamplight/Waiting';
import type { SpotCategory } from '../core/spots';

/*
 * A map in the page: MapLibre drawing OpenFreeMap's vector tiles (OpenStreetMap data, no key, no account), dark or
 * light with the app. The map's code loads only when a map is first shown. Pins are small dots in a category's color;
 * tapping one picks it. Nothing about the person leaves the device beyond which tiles are drawn.
 */

export type Pin = { id: string; lat: number; lon: number; label: string; category: SpotCategory | 'home' | 'booking' | 'plan' | 'saved' };

type Props = {
  center: { lat: number; lon: number };
  pins: readonly Pin[];
  /** The pin to bring into view and mark. */
  chosen?: string;
  onPick?: (id: string) => void;
  zoom?: number;
  height?: string;
  label: string;
};

const STYLE = { dark: 'https://tiles.openfreemap.org/styles/dark', light: 'https://tiles.openfreemap.org/styles/positron' };

const lightNow = () => {
  const theme = document.documentElement.dataset.theme;
  return theme === 'light' || (theme === 'system' && matchMedia('(prefers-color-scheme: light)').matches);
};

let library: Promise<typeof import('maplibre-gl')> | undefined;
const loadLibrary = () => {
  library ??= Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([module]) => module);
  return library;
};

export default function MapView({ center, pins, chosen, onPick, zoom = 13, height = '18rem', label }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | undefined>(undefined);
  const markers = useRef(new Map<string, Marker>());
  const pick = useRef(onPick);
  pick.current = onPick;
  const [state, setState] = useState<'loading' | 'ready' | 'unreached'>('loading');

  useEffect(() => {
    let live = true;
    loadLibrary()
      .then((maplibre) => {
        if (!live || !box.current) return;
        const instance = new maplibre.Map({
          container: box.current,
          style: lightNow() ? STYLE.light : STYLE.dark,
          center: [center.lon, center.lat],
          zoom,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
        });
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right');
        instance.on('load', () => {
          // The credit starts folded to its button, as on small maps elsewhere; a tap opens it.
          box.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
          if (live) setState('ready');
        });
        instance.on('error', () => live && setState((current) => (current === 'loading' ? 'unreached' : current)));
        map.current = instance;
      })
      .catch(() => live && setState('unreached'));
    return () => {
      live = false;
      markers.current.forEach((marker) => marker.remove());
      markers.current.clear();
      map.current?.remove();
      map.current = undefined;
    };
  }, []);

  useEffect(() => {
    map.current?.easeTo({ center: [center.lon, center.lat], duration: 400 });
  }, [center.lat, center.lon]);

  // Pins follow the list: added, moved or taken away without drawing the map again.
  useEffect(() => {
    if (!map.current) return;
    void loadLibrary().then((maplibre) => {
      const instance = map.current;
      if (!instance) return;
      const keep = new Set(pins.map((pin) => pin.id));
      for (const [id, marker] of markers.current) {
        if (!keep.has(id)) {
          marker.remove();
          markers.current.delete(id);
        }
      }
      for (const pin of pins) {
        let marker = markers.current.get(pin.id);
        if (!marker) {
          const dot = document.createElement('button');
          dot.type = 'button';
          dot.className = `poreia-pin poreia-pin--${pin.category}`;
          dot.setAttribute('aria-label', pin.label);
          dot.title = pin.label;
          dot.addEventListener('click', (event) => {
            event.stopPropagation();
            pick.current?.(pin.id);
          });
          marker = new maplibre.Marker({ element: dot }).setLngLat([pin.lon, pin.lat]).addTo(instance);
          markers.current.set(pin.id, marker);
        } else {
          marker.setLngLat([pin.lon, pin.lat]);
        }
        marker.getElement().classList.toggle('is-chosen', pin.id === chosen);
      }
    });
  }, [pins, chosen, state]);

  useEffect(() => {
    const pin = pins.find((each) => each.id === chosen);
    if (pin) map.current?.easeTo({ center: [pin.lon, pin.lat], zoom: Math.max(map.current.getZoom(), 14), duration: 450 });
  }, [chosen]);

  return (
    <div className="poreia-map" style={{ height }} role="region" aria-label={label}>
      <div ref={box} className="poreia-map__canvas" />
      {state === 'loading' && (
        <p className="poreia-map__note muted">
          <Waiting>Drawing the map…</Waiting>
        </p>
      )}
      {state === 'unreached' && <p className="poreia-map__note muted">Couldn’t draw the map. Check the connection.</p>}
    </div>
  );
}
