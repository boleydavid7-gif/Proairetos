import type { ReactNode } from 'react';
import { displayName } from '../../data/storage/preferences';
import { PrintIcon } from './icons';
import './print.css';

/**
 * A page made for paper: shown on screen as a white sheet with Back, Print and the page's own choices above it,
 * and on paper as the sheet alone (print.css hides the rest of the app).
 */
export function PrintSheet({ title, onBack, choices, children }: { title: string; onBack: () => void; choices?: ReactNode; children: ReactNode }) {
  const name = displayName().trim();
  const date = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="page print-page">
      <div className="print-bar">
        <button type="button" className="back-link" onClick={onBack}>Back</button>
        <button type="button" className="button-main" onClick={() => window.print()}><PrintIcon size={18} />Print</button>
      </div>
      {choices && <div className="print-choices">{choices}</div>}
      <div className="print-scroll">
        <article className="print-sheet" aria-label={title}>
          <header className="print-sheet__head">
            <h1>{title}</h1>
            <p>{[name, date].filter(Boolean).join(' · ')}</p>
          </header>
          {children}
        </article>
      </div>
    </div>
  );
}

/** A titled part of the sheet. */
export function PrintPart({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="print-part">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** A plain table; empty cells stay empty. */
export function PrintTable({ columns, rows }: { columns: readonly string[]; rows: readonly (readonly (string | undefined)[])[] }) {
  return (
    <div className="print-table-wrap" tabIndex={0} aria-label={columns[0]}>
    <table className="print-table">
      <thead>
        <tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>{row.map((cell, at) => (at === 0 ? <th key={at} scope="row">{cell}</th> : <td key={at}>{cell ?? ''}</td>))}</tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
