import type { Provider } from '../../core/providers';
import { theoriaHome } from './home';
import { theoriaSearch } from './search';

export const providers: readonly Provider[] = [theoriaSearch, theoriaHome];
