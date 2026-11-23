import { useEffect, useState } from 'react';
import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { SyncEngine } from '@illusive/db/sync/sync_engine';
import type { AuthMe } from '@origin/illusi/types';
import { catch_log } from '@common/utils/error_util';

// Shared so the Extras account row, the login sheet and the sync page show the same account
let cached: AuthMe | null = null;
const listeners = new Set<(account: AuthMe | null) => void>();

function publish(account: AuthMe | null) {
	cached = account;
	for (const listener of listeners) listener(account);
}

/** Fetches the signed-in account; keeps the last one if the server can't be reached */
export async function refresh_illusi_account(): Promise<AuthMe | null> {
	if (!IllusiAccount.is_logged_in()) {
		publish(null);
		return null;
	}
	const result = await IllusiAccount.account();
	if ('error' in result) return cached;
	publish(result);
	return result;
}

export function update_illusi_account(fields: Partial<AuthMe>) {
	if (cached !== null) publish({ ...cached, ...fields });
}

export function is_unverified(account: AuthMe | null, progress: SyncEngine.Progress): boolean {
	return account?.email_verified === false || progress.status === 'UNVERIFIED';
}

export default function useIllusiAccount() {
	const [logged_in, set_logged_in] = useState(() => {
		IllusiAccount.configure();
		return IllusiAccount.is_logged_in();
	});
	const [account, set_account] = useState<AuthMe | null>(cached);
	const [progress, set_progress] = useState<SyncEngine.Progress>(SyncEngine.get_progress());

	useEffect(() => {
		listeners.add(set_account);
		const unsubscribe_account = IllusiAccount.subscribe(set_logged_in);
		const unsubscribe_progress = SyncEngine.subscribe(set_progress);
		return () => {
			listeners.delete(set_account);
			unsubscribe_account();
			unsubscribe_progress();
		};
	}, []);

	useEffect(() => {
		if (!logged_in) {
			publish(null);
			return;
		}
		refresh_illusi_account().catch(catch_log);
	}, [logged_in]);

	return { logged_in, account, progress, unverified: logged_in && is_unverified(account, progress) };
}
