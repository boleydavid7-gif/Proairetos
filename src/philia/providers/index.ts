import type { Provider } from '../../core/providers';
import { philiaCalendar } from './calendar';
import { philiaHome } from './home';
import { philiaSearch } from './search';

export const providers: readonly Provider[] = [philiaSearch, philiaHome, philiaCalendar];
