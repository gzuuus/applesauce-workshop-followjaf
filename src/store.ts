import { EventStore } from 'applesauce-core';
import { verifyEvent } from 'nostr-tools';
import { QueryStore } from 'applesauce-core';

export const eventStore = new EventStore();
export const queryStore = new QueryStore(eventStore);

// verify the events when they are added to the store
eventStore.verifyEvent = verifyEvent;
