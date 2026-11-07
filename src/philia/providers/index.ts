import type { Provider } from '../../core/providers';
import { philiaCalendar } from './calendar';
import { philiaHome } from './home';
import { philiaNotices } from './notices';
import { philiaSearch } from './search';

export const providers: readonly Provider[] = [philiaSearch, philiaHome, philiaCalendar, philiaNotices];
