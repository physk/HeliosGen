import { EventEmitter } from "node:events";

const jobEvents = new EventEmitter();
jobEvents.setMaxListeners(500);
export { jobEvents };
