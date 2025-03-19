import { ReplaceableLoader } from 'applesauce-loaders';
import { rxNostr } from './nostr';
import { eventStore } from './store';

export const replaceableLoader = new ReplaceableLoader(rxNostr);

// Start the loader and send any events to the event store
replaceableLoader.subscribe((packet) => {
	eventStore.add(packet.event, packet.from);
});

// @ts-ignore
window.eventStore = eventStore;
