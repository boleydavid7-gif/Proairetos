import type { Provider } from '../../core/providers';
import { oikonomiaCalendar } from './calendar';
import { oikonomiaHome } from './home';
import { oikonomiaSearch } from './search';
import { oikonomiaNotices } from './notices';

export const providers: readonly Provider[] = [oikonomiaSearch, oikonomiaHome, oikonomiaCalendar, oikonomiaNotices];
