import type { Provider } from '../../core/providers';
import { ergonHome } from './home';
import { ergonNotices } from './notices';
import { ergonSearch } from './search';

export const providers: readonly Provider[] = [ergonSearch, ergonHome, ergonNotices];
