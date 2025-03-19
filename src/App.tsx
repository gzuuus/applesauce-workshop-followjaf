import { createEffect, createMemo, from, Match, onMount, Switch } from 'solid-js';
import './App.css';
import { replaceableLoader } from './loaders';
import { eventStore, queryStore } from './store';
import { ProfileQuery, UserContactsQuery } from 'applesauce-core/queries';
import { accounts } from './accounts';
import { ExtensionAccount } from 'applesauce-accounts/accounts';
import { ExtensionSigner } from 'applesauce-signers';
import { of, switchMap } from 'rxjs';
import { NostrEvent } from 'nostr-tools/core';
import { rxNostr } from './nostr';
import { actions } from './actions';
import { FollowUser, UnfollowUser } from 'applesauce-actions/actions';

function App() {
	const account = from(accounts.active$);
	createEffect(async () => {
		const active = account();

		if (active) {
			// get the user's relays or fallback to some default relays
			const usersRelays = await active.getRelays?.();
			const relays = usersRelays
				? Object.keys(usersRelays)
				: ['wss://relay.damus.io', 'wss://nos.lol'];

			// tell the loader to fetch the users profile event
			replaceableLoader.next({
				pubkey: active.pubkey,
				kind: 0,
				relays
			});

			// tell the loader to fetch the users contacts
			replaceableLoader.next({
				pubkey: active.pubkey,
				kind: 3,
				relays
			});

			// tell the loader to fetch the users mailboxes
			replaceableLoader.next({
				pubkey: active.pubkey,
				kind: 10002,
				relays
			});
		}
	});

	const signout = () => {
		// do nothing if the user is not signed in
		if (!accounts.active) return;

		// signout the user
		const account = accounts.active;
		accounts.removeAccount(account);
		accounts.clearActive();
	};

	onMount(() => {
		replaceableLoader.next({
			pubkey: '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
			kind: 0,
			relays: ['wss://pyramid.fiatjaf.com/']
		});
	});

	const fiatjaf = from(
		queryStore.createQuery(
			ProfileQuery,
			'3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'
		)
	);

	const signin = async () => {
		// do nothing if the user is already signed in
		if (accounts.active) return;

		// create a new nip-07 signer and try to get the pubkey
		const signer = new ExtensionSigner();
		const pubkey = await signer.getPublicKey();

		// create a new extension account, add it, and make it the active account
		const account = new ExtensionAccount(pubkey, signer);
		accounts.addAccount(account);
		accounts.setActive(account);
	};

	const profile = from(
		accounts.active$.pipe(
			switchMap((account) =>
				account ? queryStore.createQuery(ProfileQuery, account!.pubkey) : of(undefined)
			)
		)
	);

	const contacts = from(
		accounts.active$.pipe(
			switchMap((account) =>
				account ? queryStore.createQuery(UserContactsQuery, account!.pubkey) : of(undefined)
			)
		)
	);

	const isFollowing = createMemo(() => {
		return contacts()?.some(
			(c) => c.pubkey === '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d'
		);
	});

	const toggleFollow = async () => {
		// send any created events to rxNostr and the event store
		const publish = (event: NostrEvent) => {
			eventStore.add(event);
			rxNostr.send(event);
		};

		if (isFollowing()) {
			await actions
				.exec(UnfollowUser, '3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d')
				.forEach(publish);
		} else {
			await actions
				.exec(
					FollowUser,
					'3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d',
					'wss://pyramid.fiatjaf.com/'
				)
				.forEach(publish);
		}
	};

	return (
		<>
			<div>
				<img src={fiatjaf()?.picture} class="logo" />
			</div>
			<h1>{fiatjaf()?.name}</h1>
			<div class="card">
				<div class="card">
					<p>Are you following the fiatjaf? ( creator of "The nostr" )</p>
					{account() === undefined ? (
						<button onClick={signin}>Check</button>
					) : (
						<button onClick={signout}>Signout</button>
					)}
				</div>
				<Switch
					fallback={
						<p style="font-size: 1.2rem;">
							Sign in to check if you are a follower of the fiatjaf ( creator of "The nostr" )
						</p>
					}
				>
					<Match when={contacts() && isFollowing() === undefined}>
						<p>checking...</p>
					</Match>
					<Match when={contacts() && isFollowing() === true}>
						<p style="color: green; font-weight: bold; font-size: 2rem;">
							Congratulations! You are a follower of the fiatjaf
						</p>
					</Match>
					<Match when={contacts() && isFollowing() === false}>
						<p style="color: red; font-weight: bold; font-size: 2rem;">
							Why don't you follow the fiatjaf? do you even like nostr?
						</p>
					</Match>
				</Switch>

				{contacts() && (
					<button onClick={toggleFollow}>{!isFollowing() ? 'Follow' : 'Unfollow'}</button>
				)}
			</div>
		</>
	);
}

export default App;
