import type { Provider } from '../../core/providers';
import { ergonHome } from './home';
import { ergonSearch } from './search';

export const providers: readonly Provider[] = [ergonSearch, ergonHome];
