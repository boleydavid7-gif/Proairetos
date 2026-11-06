import type { Provider } from '../../core/providers';
import { dynamisHome } from './home';
import { dynamisSearch } from './search';

export const providers: readonly Provider[] = [dynamisSearch, dynamisHome];
