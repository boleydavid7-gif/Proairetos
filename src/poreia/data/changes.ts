import { createListeners } from '../../services/listeners';

const listeners = createListeners();

export const subscribe = listeners.subscribe;
export const notify = listeners.notify;
