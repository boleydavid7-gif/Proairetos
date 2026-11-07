import type { Provider } from '../../core/providers';
import { hydrosHome } from './home';
import { hydrosSearch } from './search';

export const providers: readonly Provider[] = [hydrosSearch, hydrosHome];
