import type { Provider } from '../../core/providers';
import { diaitaHome } from './home';
import { diaitaNotices } from './notices';

export const providers: readonly Provider[] = [diaitaHome, diaitaNotices];
