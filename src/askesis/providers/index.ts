import type { Provider } from '../../core/providers';
import { askesisHome } from './home';
import { askesisSearch } from './search';
import { askesisNotices } from './notices';

export const providers: readonly Provider[] = [askesisSearch, askesisHome, askesisNotices];
