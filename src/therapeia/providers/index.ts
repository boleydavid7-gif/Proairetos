import type { Provider } from '../../core/providers';
import { therapeiaCalendar } from './calendar';
import { therapeiaHome } from './home';
import { therapeiaSearch } from './search';

export const providers: readonly Provider[] = [therapeiaSearch, therapeiaHome, therapeiaCalendar];
