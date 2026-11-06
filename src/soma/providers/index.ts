import type { Provider } from '../../core/providers';
import { somaHome } from './home';
import { somaLibrary } from './library';
import { somaSearch } from './search';

export const providers: readonly Provider[] = [somaSearch, somaHome, somaLibrary];
