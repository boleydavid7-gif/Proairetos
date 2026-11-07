import type { Provider } from '../../core/providers';
import { meleteCalendar } from './calendar';
import { meleteHome } from './home';
import { meleteNotices } from './notices';

export const providers: readonly Provider[] = [meleteHome, meleteCalendar, meleteNotices];
