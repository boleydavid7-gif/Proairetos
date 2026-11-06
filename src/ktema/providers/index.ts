import type { Provider } from '../../core/providers';
import { ktemaCalendar } from './calendar';
import { ktemaHome } from './home';
import { ktemaNotices } from './notices';
import { ktemaSearch } from './search';

export const providers: readonly Provider[] = [ktemaSearch, ktemaHome, ktemaCalendar, ktemaNotices];
