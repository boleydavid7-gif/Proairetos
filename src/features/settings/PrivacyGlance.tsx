/**
 * Privacy at a glance (as Apple's privacy labels show it): what stays on the device, what is sealed before it leaves,
 * what the server can see, and every outside service with what it receives. The same facts as /privacy, short.
 */
const GLANCE: { title: string; lines: string[] }[] = [
  {
    title: 'Stays on this device',
    lines: [
      'Everything, until you turn on sync.',
      'Photos and files on items, books, songs, and photos of plants and people.',
      'Your passcode, your weather place and other calendars’ events.',
      'Text read from a photo and voice notes turned into text: both done on the device.',
    ],
  },
  {
    title: 'Sealed before it leaves',
    lines: [
      'With sync on, your items, notes, reflections, schedule and every app’s records are encrypted here with a key the server never has.',
      'Reminder words, and backups kept in your own Google Drive, Dropbox or OneDrive.',
      'Shared lists, with a key only the people in them have.',
    ],
  },
  {
    title: 'What the server can see',
    lines: [
      'Your email address, to sign you in.',
      'How many records you have, their rough sizes and kinds, and when they changed.',
      'When reminders are due, and each device’s address for notifications.',
      'The calendar link’s file, only if you turn it on (“Busy” times by default).',
    ],
  },
  {
    title: 'Outside services, only when you use them',
    lines: [
      'Open-Meteo: weather, with a place rounded to about a kilometer.',
      'OpenStreetMap, OpenFreeMap, Wikivoyage and Wikipedia: places, maps and guides for a trip.',
      'Ticketmaster, LiteAPI, Duffel, AeroDataBox and Google Places: a place, dates and travelers only, through proairetos.com.',
      'Pl@ntNet: the plant photos you choose, when you tap Identify.',
      'Open Food Facts: a barcode’s number. Free Dictionary API: the one word you look up. TheMealDB: recipe ideas.',
      'Hugging Face: Mneme’s speech model, downloaded once.',
      'Stripe: when you buy a plan. Strava: only if you connect it.',
      'Your phone’s speech service (Apple or Google), when you dictate.',
    ],
  },
  {
    title: 'Never',
    lines: ['What you write is never read, analyzed or scored, your mood is never guessed, there is no advertising, and nothing you write trains AI.'],
  },
];

export default function PrivacyGlance() {
  return (
    <section className="settings-card privacy-glance" aria-label="Privacy at a glance">
      {GLANCE.map((group) => (
        <div key={group.title} className="privacy-glance__group">
          <h3>{group.title}</h3>
          <ul>
            {group.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ))}
      <a className="text-link" href="/privacy" target="_blank" rel="noreferrer">
        Read the full privacy page
      </a>
    </section>
  );
}
