import type { Provider } from '../../core/providers';
import { dynamisHome } from './home';
import { dynamisSearch } from './search';
import { dynamisNotices } from './notices';

export const providers: readonly Provider[] = [dynamisSearch, dynamisHome, dynamisNotices];
