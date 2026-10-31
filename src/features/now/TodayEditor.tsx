import { useRef, useState, type PointerEvent } from 'react';
import { useSheet } from '../../components/ui/useSheet';
import { useTodayParts } from '../../app/hooks/useTodayParts';
import { useTodayLayout } from '../../app/hooks/useTodayLayout';
import { useOverlays } from '../../app/overlays/OverlayContext';
import { setTodayLayout, setTodayPartShown } from '../../data/storage/preferences';
import { tap } from '../../app/feel';
import { Sym } from '../../lamplight/icons';
import {
  SECTION_NAMES,
  SECTION_PART,
  isUsualOrder,
  moveSection,
  placeSection,
  type TodayLayout,
  type TodaySection,
} from '../../core/today/layout';

/**
 * Today, arranged by the person (as Apple Health's Summary is edited): drag a section by its grip or move it with the
 * arrows, and switch it off or on. A section with a What's included part uses that same switch; the order is synced.
 */
export default function TodayEditor({ onClose }: { onClose: () => void }) {
  const { dialog, panel, close } = useSheet();
  const layout = useTodayLayout();
  const shows = useTodayParts();
  const { offerUndo } = useOverlays();
  const list = useRef<HTMLOListElement>(null);
  const [dragging, setDragging] = useState<TodaySection | null>(null);

  const save = (next: TodayLayout) => setTodayLayout({ order: next.order, off: next.off });
  const isOn = (section: TodaySection) => {
    const part = SECTION_PART[section];
    return part ? shows(part) : !layout.off.includes(section);
  };
  const toggle = (section: TodaySection) => {
    tap();
    const part = SECTION_PART[section];
    if (part) return setTodayPartShown(part, !shows(part));
    const off = layout.off.includes(section) ? layout.off.filter((each) => each !== section) : [...layout.off, section];
    save({ ...layout, off });
  };
  const move = (section: TodaySection, by: -1 | 1) => {
    tap();
    save(moveSection(layout, section, by));
  };

  // Dragging by the grip: the row under the finger is where the section goes.
  const drag = (event: PointerEvent<HTMLButtonElement>, section: TodaySection) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(section);
  };
  const over = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragging || !list.current) return;
    const rows = [...list.current.querySelectorAll<HTMLElement>('[data-section]')];
    const at = rows.findIndex((row) => {
      const box = row.getBoundingClientRect();
      return event.clientY < box.top + box.height / 2;
    });
    const to = at === -1 ? rows.length - 1 : at;
    if (layout.order.indexOf(dragging) !== to) {
      tap();
      save(placeSection(layout, dragging, to));
    }
  };

  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-label="Edit Today"
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && close()}
    >
      <div ref={panel} className="sheet__panel today-editor">
        <div className="sheet__grabber" aria-hidden="true" />
        <button type="button" className="sheet__close" onClick={close}>
          Done
        </button>
        <p className="sheet__title sheet__title--static">Edit Today</p>
        <ol className="today-editor__list" ref={list}>
          {layout.order.map((section, at) => (
            <li
              key={section}
              data-section={section}
              className="today-editor__row"
              data-off={!isOn(section) || undefined}
              data-dragging={dragging === section || undefined}
            >
              <button
                type="button"
                className="today-editor__grip"
                aria-label={`Move ${SECTION_NAMES[section]}`}
                onPointerDown={(event) => drag(event, section)}
                onPointerMove={over}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') move(section, -1);
                  if (event.key === 'ArrowDown') move(section, 1);
                }}
              >
                <span aria-hidden="true" />
              </button>
              <span className="today-editor__name">{SECTION_NAMES[section]}</span>
              <span className="today-editor__moves">
                <button type="button" aria-label={`${SECTION_NAMES[section]} up`} disabled={at === 0} onClick={() => move(section, -1)}>
                  <Sym name="chevron" size={18} />
                </button>
                <button
                  type="button"
                  aria-label={`${SECTION_NAMES[section]} down`}
                  disabled={at === layout.order.length - 1}
                  onClick={() => move(section, 1)}
                >
                  <Sym name="chevron" size={18} />
                </button>
              </span>
              <button
                type="button"
                role="switch"
                className="today-editor__switch"
                aria-checked={isOn(section)}
                aria-label={SECTION_NAMES[section]}
                onClick={() => toggle(section)}
              />
            </li>
          ))}
        </ol>
        {!isUsualOrder(layout) && (
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              save({ order: [], off: layout.off });
              const kept = layout;
              offerUndo('Usual order back', async () => save(kept));
            }}
          >
            Usual order
          </button>
        )}
      </div>
    </dialog>
  );
}
