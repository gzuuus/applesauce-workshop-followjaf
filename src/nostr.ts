import { createRxNostr, noopVerifier } from 'rx-nostr';
import { accounts } from './accounts';
import { of, switchMap } from 'rxjs';
import { queryStore } from './store';
import { MailboxesQuery } from 'applesauce-core/queries';

export const rxNostr = createRxNostr({
	// skip verification here because we are going to verify events at the event store
	skipVerify: true,
	verifier: noopVerifier
});

accounts.active$
	.pipe(
		switchMap((account) =>
			account ? queryStore.createQuery(MailboxesQuery, account.pubkey) : of(undefined)
		)
	)
	.subscribe((mailboxes) => {
		if (mailboxes) rxNostr.setDefaultRelays(mailboxes.outboxes);
		else rxNostr.setDefaultRelays([]);
	});

rxNostr.createOutgoingMessageObservable().subscribe((message) => {
	console.log('Relay messages', message);
});

rxNostr.createConnectionStateObservable().subscribe((message) => {
	console.log('Relay connections', message);
});
