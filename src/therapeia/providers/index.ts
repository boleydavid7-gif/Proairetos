import type { Provider } from '../../core/providers';
import { therapeiaHome } from './home';
import { therapeiaSearch } from './search';

export const providers: readonly Provider[] = [therapeiaSearch, therapeiaHome];
