import type { Provider } from '../../core/providers';
import { askesisHome } from './home';
import { askesisSearch } from './search';

export const providers: readonly Provider[] = [askesisSearch, askesisHome];
