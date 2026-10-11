import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '../askesis/styles/askesis.css';
import '../app/family/apps.css';
import './styles/diaita.css';
import '../styles/premium.css';
import '../app/family/account.css';
import App from './app/App';
import { startApp } from '../app/family/startApp';

startApp('diaita', App, { light: '#f1eee8', dark: '#0e1014' });
