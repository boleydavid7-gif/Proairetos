import type { ItemEvent } from '../../core/item-events/types';
import type { LifeItemType } from '../../core/life-items/types';
import { lifeItemTypeLabels } from '../capture/labels';
import { formatWhen } from './dateFields';

/** Plain descriptions of what happened. No judgment, no interpretation. */
export function describeEvent(event: ItemEvent): string {
  switch (event.kind) {
    case 'CREATED':
      return 'Captured';
    case 'TYPE_CHANGED':
      return event.toType ? `Sorted as ${lifeItemTypeLabels[event.toType as LifeItemType]}` : 'Unsorted';
    case 'SCHEDULED':
      return event.toTime ? `Set for ${formatWhen(event.toTime)}` : 'Scheduled';
    case 'RESCHEDULED':
      return event.toTime ? `Moved to ${formatWhen(event.toTime)}` : 'Time cleared';
    case 'WAITING_STARTED':
      return 'Waiting';
    case 'WAITING_ENDED':
      return 'No longer waiting';
    case 'COMPLETED':
      return 'Done';
    case 'LET_GO':
      return 'Let go';
    case 'REOPENED':
      return 'Reopened';
    case 'CARRIED':
      return 'Carried forward';
    case 'UN_CARRIED':
      return 'No longer carried';
    case 'VALUE_CONNECTED':
      return 'Connected to a value';
    case 'VALUE_DISCONNECTED':
      return 'Disconnected from a value';
    case 'HONORED':
      return 'Honored';
  }
}
