import type { Prefs } from '@illusive/prefs';
import type { SyncEngine } from '@illusive/db/sync/sync_engine';

export const SYNC_STATUS_TEXT: Record<SyncEngine.Status, string> = {
	IDLE: 'Up to date',
	SYNCING: 'Syncing…',
	OFFLINE: 'Offline',
	LOGGED_OUT: 'Logged out',
	UNVERIFIED: 'Waiting for email confirmation',
	ERROR: 'Sync failed'
};

export function sync_status_color(status: SyncEngine.Status, colors: Prefs.Theme['colors']): string {
	switch (status) {
		case 'IDLE': return colors.green;
		case 'SYNCING': return colors.primary;
		case 'ERROR': return colors.red;
		case 'UNVERIFIED': return colors.orange;
		default: return colors.subtext;
	}
}
