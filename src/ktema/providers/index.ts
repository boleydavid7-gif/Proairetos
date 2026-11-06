import type { Provider } from '../../core/providers';
import { ktemaCalendar } from './calendar';
import { ktemaHome } from './home';
import { ktemaSearch } from './search';

export const providers: readonly Provider[] = [ktemaSearch, ktemaHome, ktemaCalendar];
