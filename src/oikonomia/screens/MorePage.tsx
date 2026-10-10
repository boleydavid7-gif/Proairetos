import type { Nav } from '../app/App';
import { SettingsIcon, WalletIcon } from '../app/icons';
import { useSettings } from '../app/state';
import { offerUndo } from '../app/undo';
import { listBills, listBudgets, loadSettings, putBill, putBudget, restore, saveSettings } from '../data/store';
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
        <h1 className="title">A place for what sustains you.</h1>
        <p className="lead">Oikonomia means the care and management of a household. It keeps the essentials in view without turning them into a score.</p>
      </div>
    );
  }

  return (
    <div className="page oiko-page">
      <PageTop><h1 className="title">More</h1></PageTop>
      <AccountCard app="Oikonomia" what="Your bills and monthly plans" waiting="Bills" />

      <section className="oiko-more-list">
        <button type="button" className="row" onClick={() => nav.go({ name: 'budget' })}><span className="row__icon"><WalletIcon size={21} /></span><span className="row__text"><strong>Monthly plan</strong><small>What the month holds, by area</small></span></button>
        <button type="button" className="row" onClick={() => nav.go({ name: 'spent' })}><span className="row__icon"><WalletIcon size={21} /></span><span className="row__text"><strong>Spent</strong><small>From your statements, by area</small></span></button>
        <button type="button" className="row" onClick={() => window.location.assign('/?open=settings')}><span className="row__icon"><SettingsIcon size={21} /></span><span className="row__text"><strong>Appearance and reminders</strong><small>Shared with Proairetos</small></span></button>
      </section>

      <section className="oiko-options">
        <p className="label">Options</p>
        <label className="field">
          <span className="field__label">Currency</span>
          <select className="input" value={settings.currency} onChange={(event) => void changeCurrency(event.target.value)}>
            {[...new Set([settings.currency, ...CURRENCIES])].map((code) => <option key={code} value={code}>{currencyName(code)} ({code})</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Week starts</span>
          <select
            className="input"
            value={settings.planWeekStart}
            onChange={(event) => saveSettings({ ...loadSettings(), planWeekStart: Number(event.target.value) })}
          >
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <option key={day} value={index}>{day}</option>)}
          </select>
        </label>
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

<FamilyApps current="oikonomia" />

      <button type="button" className="text-link" onClick={() => nav.go({ name: 'about' })}>About Oikonomia</button>
    </div>
  );
}
