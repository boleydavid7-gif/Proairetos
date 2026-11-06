import type { Provider } from '../../core/providers';
import { ktemaHome } from './home';
import { ktemaSearch } from './search';

export const providers: readonly Provider[] = [ktemaSearch, ktemaHome];
