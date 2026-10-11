import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../askesis/styles/askesis.css';
import '../app/family/apps.css';
import './styles/ergon.css';
import '../styles/premium.css';
import '../app/family/account.css';
import App from './app/App';
import { startApp } from '../app/family/startApp';
import { readInvite } from './core/invite';
import { keepInvite } from './screens/HouseholdPage';

// A home's invite: the key is after `#`, read here once and taken out of the address.
const invite = readInvite(location.search, location.hash);
if (invite) {
  keepInvite(invite);
  history.replaceState(history.state, '', `${location.pathname}?open=household`);
}

startApp('ergon', App, { light: '#eff1ed', dark: '#0e1112' });
