import type { Provider } from '../../core/providers';
import { phytonHome } from './home';
import { phytonNotices } from './notices';

export const providers: readonly Provider[] = [phytonHome, phytonNotices];
