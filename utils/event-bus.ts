// utils/event-bus.ts
import mitt from 'mitt';

type Events = {
  customizationUpdated: { name: string; text: string };
};

const eventBus = mitt<Events>();
export default eventBus;
