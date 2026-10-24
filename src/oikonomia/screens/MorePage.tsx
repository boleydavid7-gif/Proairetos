import type { Nav } from '../app/App';
import { BillsIcon, CalendarIcon, ChevronIcon, DownloadIcon, SettingsIcon, WalletIcon } from '../app/icons';
import { HistoryIcon } from '../../app/family/icons';
import { useSettings } from '../app/state';
import { offerUndo } from '../app/undo';
import { exportAll, listBills, listBudgets, listEnvelopes, loadSettings, putBill, putBudget, restore, saveSettings } from '../data/store';
import { envelopesCsv, billsCsv, expensesCsv } from '../core/export';
import { monthsWithSpent, spentIn } from '../data/spent';
import { PageTop } from '../app/ui';
import AccountCard from '../../app/family/AccountCard';
import FamilyApps from '../../app/family/FamilyApps';
import FamilyBackup from '../../app/family/FamilyBackup';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK', 'JPY', 'INR', 'SGD', 'HKD', 'ZAR', 'MXN', 'BRL'];

function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(undefined, { type: 'currency' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Bills and monthly plans in the old currency move to the new one; the amounts stay as written. */
async function changeCurrency(next: string): Promise<void> {
  const settings = loadSettings();
  const from = settings.currency;
  if (next === from) return;
  const bills = (await listBills()).filter((bill) => bill.currency === from);
  const budgets = (await listBudgets()).filter((budget) => budget.currency === from);
  saveSettings({ ...settings, currency: next });
  for (const bill of bills) await putBill({ ...bill, currency: next });
  for (const budget of budgets) await putBudget({ ...budget, currency: next });
  offerUndo(`Amounts now in ${next}`, async () => {
    saveSettings({ ...loadSettings(), currency: from });
    for (const bill of bills) await putBill(bill);
    for (const budget of budgets) await putBudget(budget);
  });
}

export default function MorePage({ nav, about = false }: { nav: Nav; about?: boolean }) {
  const settings = useSettings();

  if (about) {
    return (
      <div className="page oiko-page">
        <PageTop><button type="button" className="back-link" onClick={nav.back}>Back</button><p className="label">About</p></PageTop>
        <h1 className="title">About Oikonomia</h1>
        <p className="lead">Oikonomia is Greek for running a household: bills, subscriptions, spending and a monthly budget, with the dates and amounts in view.</p>
      </div>
    );
  }

  return (
    <div className="page oiko-page">
      <PageTop><h1 className="title">More</h1></PageTop>
      <AccountCard app="Oikonomia" what="Your bills, spending and budget" waiting="Bills" />

      <ul className="rows">
        <li><button type="button" className="row" onClick={() => nav.go({ name: 'budget' })}><span className="row__icon"><WalletIcon size={22} /></span><span className="row__text"><span>Monthly plan</span><span className="row__detail">What the month holds, by area</span></span><ChevronIcon size={18} /></button></li>
        <li><button type="button" className="row" onClick={() => nav.go({ name: 'envelopes' })}><span className="row__icon"><WalletIcon size={22} /></span><span className="row__text"><span>Savings envelopes</span><span className="row__detail">Vacation and custom goals</span></span><ChevronIcon size={18} /></button></li>
        <li><button type="button" className="row" onClick={() => nav.go({ name: 'pay' })}><span className="row__icon"><CalendarIcon size={22} /></span><span className="row__text"><span>Pay</span><span className="row__detail">When pay comes in</span></span><ChevronIcon size={18} /></button></li>
        <li><button type="button" className="row" onClick={() => nav.go({ name: 'spent' })}><span className="row__icon"><BillsIcon size={22} /></span><span className="row__text"><span>Expenses</span><span className="row__detail">From statements or expenses, by area</span></span><ChevronIcon size={18} /></button></li>
        <li><button type="button" className="row" onClick={() => nav.go({ name: 'year' })}><span className="row__icon"><HistoryIcon size={22} /></span><span className="row__text"><span>Your year</span><span className="row__detail">Paid and spent, by year</span></span><ChevronIcon size={18} /></button></li>
        <li><a className="row" href="/?open=settings"><span className="row__icon"><SettingsIcon size={22} /></span><span className="row__text"><span>Appearance and reminders</span><span className="row__detail">Shared with Proairetos</span></span><ChevronIcon size={18} /></a></li>
      </ul>

      <section className="oiko-options">
        <p className="label">Options</p>
        <ul className="rows">
          <li>
            <label className="row row--select">
              <span className="row__icon"><WalletIcon size={22} /></span>
              <span className="row__text"><span>Currency</span></span>
              <select className="row__select" value={settings.currency} onChange={(event) => void changeCurrency(event.target.value)}>
                {[...new Set([settings.currency, ...CURRENCIES])].map((code) => <option key={code} value={code}>{currencyName(code)} ({code})</option>)}
              </select>
            </label>
          </li>
          <li>
            <label className="row row--select">
              <span className="row__icon"><CalendarIcon size={22} /></span>
              <span className="row__text"><span>Week starts</span></span>
              <select className="row__select" value={settings.planWeekStart} onChange={(event) => saveSettings({ ...loadSettings(), planWeekStart: Number(event.target.value) })}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
            </label>
          </li>
        </ul>
      </section>

      <section className="oiko-data">
        <p className="label">Your data</p>
        <FamilyBackup
          older={async (text: string) => {
            const file = JSON.parse(text) as { app?: unknown };
            if (file.app !== 'oikonomia') return undefined;
            const count = await restore(file);
            return count === 1 ? 'One record brought in from an older Oikonomia backup.' : `${count} records brought in from an older Oikonomia backup.`;
          }}
        />
      </section>

      <section className="oiko-data">
        <p className="label">Export</p>
        <p className="muted">Readable copies for your records or another app.</p>
        <div className="button-row oiko-export-actions">
          <button type="button" className="button-quiet" onClick={async () => downloadText('oikonomia-expenses.csv', expensesCsv(monthsWithSpent().flatMap((month) => spentIn(month)), settings.currency), 'text/csv;charset=utf-8')}><DownloadIcon size={18} /> Expenses CSV</button>
          <button type="button" className="button-quiet" onClick={async () => downloadText('oikonomia-bills.csv', billsCsv(await listBills()), 'text/csv;charset=utf-8')}><DownloadIcon size={18} /> Bills CSV</button>
          <button type="button" className="button-quiet" onClick={async () => downloadText('oikonomia-envelopes.csv', envelopesCsv(await listEnvelopes()), 'text/csv;charset=utf-8')}><DownloadIcon size={18} /> Envelopes CSV</button>
          <button type="button" className="button-quiet" onClick={async () => downloadText('oikonomia-archive.json', JSON.stringify({ ...(await exportAll()), expenses: monthsWithSpent().flatMap((month) => spentIn(month)) }, null, 2), 'application/json;charset=utf-8')}><DownloadIcon size={18} /> JSON archive</button>
        </div>
      </section>

      <FamilyApps current="oikonomia" />

      <button type="button" className="text-link" onClick={() => nav.go({ name: 'about' })}>About Oikonomia</button>
    </div>
  );
}
