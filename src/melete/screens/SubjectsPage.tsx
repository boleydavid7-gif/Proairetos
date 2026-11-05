import { Empty } from '../../app/family/shell';
import { BookIcon, PlusIcon } from '../../app/family/icons';
import { toLocalDate } from '../../core/scheduling/dates';
import type { MeleteNav } from '../app/App';
import { subjects } from '../app/state';
import { dateFact, upcomingDates } from '../core/subjects';

export default function SubjectsPage({ nav }: { nav: MeleteNav }) {
  const list = [...subjects.use()].sort((a, b) => a.name.localeCompare(b.name));
  const today = toLocalDate(new Date());
  return (
    <div className="page melete-page">
      <div className="page-top section-head">
        <h1 className="title">Subjects</h1>
        <button type="button" className="button-main" onClick={() => nav.go({ name: 'subject' })}><PlusIcon size={18} />Add</button>
      </div>
      {list.length === 0 ? (
        <Empty icon={<BookIcon size={28} />} title="No subjects yet" />
      ) : (
        <ul className="chore-list">
          {list.map((subject) => {
            const next = upcomingDates([subject], today)[0];
            return (
              <li key={subject.id} className="chore">
                <button type="button" className="chore__open" onClick={() => nav.go({ name: 'subject', id: subject.id })}>
                  <span className="melete-name"><i className="melete-dot" style={{ background: `var(--tag-${subject.color ?? 'sage'})` }} aria-hidden="true" />{subject.name}</span>
                  {next && <small>{dateFact(next.date, today)}</small>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
