import { useRef, useState } from 'react';
import { barcodesHere, contactsHere, nfcHere, pickContact, productName, readBarcode, writeTag } from './deviceExtras';
import './readFromPhoto.css';
import { Waiting } from '../../lamplight/Waiting';

/** A photo of a barcode, then the product's name to look over (Android Chrome). */
export function ScanBarcode({ onName, className = 'button-quiet' }: { onName: (name: string) => void; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  if (!barcodesHere()) return null;
  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(event) => {
          const photo = event.target.files?.[0];
          event.target.value = '';
          if (!photo) return;
          setBusy(true);
          setNote('');
          void readBarcode(photo)
            .then(async (code) => {
              if (!code) return setNote('No barcode was found in that photo.');
              const name = await productName(code).catch(() => undefined);
              if (name) onName(name);
              else setNote(`${code} is not in Open Food Facts. Type its name.`);
            })
            .catch(() => setNote('The barcode could not be read.'))
            .finally(() => setBusy(false));
        }}
      />
      <button type="button" className={className} disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Waiting>Reading…</Waiting> : 'Scan a barcode'}
      </button>
      {note && <p className="read-photo__note" role="status">{note}</p>}
    </>
  );
}

/** "From contacts": one contact's name, phone and email (Android Chrome). */
export function FromContacts({ onPick, className = 'button-quiet' }: { onPick: (contact: { name?: string; phone?: string; email?: string }) => void; className?: string }) {
  if (!contactsHere()) return null;
  return (
    <button type="button" className={className} onClick={() => void pickContact().then((contact) => contact && onPick(contact), () => undefined)}>
      From contacts
    </button>
  );
}

/** "Write to an NFC tag": a sticker that opens this page when a phone touches it (Android Chrome writes; most phones read). */
export function WriteTag({ path, className = 'button-quiet' }: { path: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'waiting' | 'done' | 'retry'>('idle');
  if (!nfcHere()) return null;
  return (
    <>
      <button
        type="button"
        className={className}
        disabled={state === 'waiting'}
        onClick={() => {
          setState('waiting');
          void writeTag(new URL(path, location.origin).href).then(
            () => setState('done'),
            () => setState('retry'),
          );
        }}
      >
        {state === 'waiting' ? 'Hold a tag to the phone…' : 'Write to an NFC tag'}
      </button>
      {state === 'done' && <p className="read-photo__note" role="status">Written. Touch the tag with a phone to open this page.</p>}
      {state === 'retry' && <p className="read-photo__note" role="alert">The tag was not written. Hold it still against the back of the phone and try again.</p>}
    </>
  );
}
