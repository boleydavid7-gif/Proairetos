import type { Provider } from '../../core/providers';
import { poreiaHome } from './home';
import { poreiaSearch } from './search';

export const providers: readonly Provider[] = [poreiaSearch, poreiaHome];
