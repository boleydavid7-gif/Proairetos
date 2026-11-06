import type { Provider } from '../../core/providers';
import { meleteCalendar } from './calendar';
import { meleteHome } from './home';

export const providers: readonly Provider[] = [meleteHome, meleteCalendar];
