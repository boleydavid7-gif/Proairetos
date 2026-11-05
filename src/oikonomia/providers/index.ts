import type { Provider } from '../../core/providers';
import { oikonomiaHome } from './home';
import { oikonomiaSearch } from './search';

export const providers: readonly Provider[] = [oikonomiaSearch, oikonomiaHome];
