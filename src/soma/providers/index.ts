import type { Provider } from '../../core/providers';
import { somaHome } from './home';
import { somaSearch } from './search';

export const providers: readonly Provider[] = [somaSearch, somaHome];
