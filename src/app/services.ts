import { systemContext } from '../core/context';
import { createDeviceStorage } from '../data/storage/deviceStorage';
import { createLifeService } from '../services/life/lifeService';
import { createReflectionService } from '../services/reflection/reflectionService';

// Until accounts exist, everything belongs to one person on this device.
const userId = 'local';
const context = systemContext();
const storage = createDeviceStorage();

export const storageMode = storage.mode;

export const lifeService = createLifeService({
  userId,
  context,
  items: storage.items,
  events: storage.events,
});

export const reflectionService = createReflectionService({
  userId,
  context,
  reflections: storage.reflections,
});
