import type { Provider } from '../../core/providers';
import { poreiaCalendar } from './calendar';
import { poreiaHome } from './home';
import { poreiaNotices } from './notices';
import { poreiaSearch } from './search';

export const providers: readonly Provider[] = [poreiaSearch, poreiaHome, poreiaCalendar, poreiaNotices];
