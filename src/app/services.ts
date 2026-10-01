import { systemContext } from '../core/context';
import { createDeviceStorage } from '../data/storage/deviceStorage';
import { createCompassService } from '../services/compass/compassService';
import { createDecisionService } from '../services/decisions/decisionService';
import { createLifeService } from '../services/life/lifeService';
import { createReflectionService } from '../services/reflection/reflectionService';
import { createScheduleService } from '../services/schedule/scheduleService';

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

export const compassService = createCompassService({
  userId,
  context,
  values: storage.values,
  statements: storage.statements,
});

export const scheduleService = createScheduleService({
  userId,
  context,
  patterns: storage.schedulePatterns,
  exceptions: storage.scheduleExceptions,
});

export const decisionService = createDecisionService({ userId, context, decisions: storage.decisions });
