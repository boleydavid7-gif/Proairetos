import { systemContext } from '../core/context';
import {
  createMemoryItemEventRepository,
  createMemoryLifeItemRepository,
  createMemoryReflectionRepository,
} from '../data/repositories/memory/memoryRepositories';
import { createLifeService } from '../services/life/lifeService';
import { createReflectionService } from '../services/reflection/reflectionService';

// Until accounts and storage exist, everything lives in memory for one local person.
const userId = 'local';
const context = systemContext();

export const lifeService = createLifeService({
  userId,
  context,
  items: createMemoryLifeItemRepository(),
  events: createMemoryItemEventRepository(),
});

export const reflectionService = createReflectionService({
  userId,
  context,
  reflections: createMemoryReflectionRepository(),
});
