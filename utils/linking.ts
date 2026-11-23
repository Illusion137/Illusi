import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { IllusiViews } from '@illusive/illusi_views';
import { ShareLinks } from '@illusive/share_links';
import { Illusi } from '@origin/illusi/illusi';
import { GLOBALS } from '@illusive/globals';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import * as Linking from 'expo-linking';
import { SharedRouter } from './shared_routes';
import { SharedUrls } from '@illusive/shared_urls';
import { catch_log } from '@common/utils/error_util';

async function link_incoming_illusi_track(illusi_id: string) {
	if (!IllusiAccount.is_logged_in()) {
		GLOBALS.global_var.bottom_alert('Log in to Illusi to open this track', 'WARN');
		return;
	}
	const view = await Illusi.Tracks.get(illusi_id);
	if (Illusi.is_error(view)) {
		GLOBALS.global_var.bottom_alert('Failed to open shared track', 'WARN', view);
		return;
	}
	const [track] = IllusiViews.prefer_local([IllusiViews.track(view)], GLOBALS.global_var.sql_tracks);
	const playable = SQLTracks.add_playback_saved_data_to_track(track);
	GLOBALS.global_var.play_tracks(playable, [playable], 'Shared Track');
}

function handle_illusi_url(parsed: Linking.ParsedURL) {
	const incoming = ShareLinks.parse(parsed.path ?? '');
	if ('error' in incoming) {
		GLOBALS.global_var.bottom_alert('Failed to open Illusi link', 'WARN', incoming);
		return;
	}
	if (incoming.type === 'track') {
		const track = SQLTracks.add_playback_saved_data_to_track(incoming.track);
		GLOBALS.global_var.play_tracks(track, [track], 'Shared Track');
	} else if (incoming.type === 'illusi_track') {
		link_incoming_illusi_track(incoming.illusi_id).catch(catch_log);
	} else {
		SharedRouter.goto_shared_playlist(incoming.uri, 'URI', { force_order: '1' });
	}
}

/** The link a share sheet passed as `url=`, whole: the share extension leaves the link's own `&`s unescaped */
function shared_url(url: string): string | null {
	const match = /[?&]url=/.exec(url);
	if (match === null) return null;
	const raw = url.slice(match.index + match[0].length);
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
}

async function open_shared_url(url: string) {
	if (url.startsWith('illusi:')) return handle_illusi_url(Linking.parse(url));
	const target = await SharedUrls.resolve(url);
	if (target === null) {
		GLOBALS.global_var.bottom_alert('Illusi can\'t open this link', 'WARN');
		return;
	}
	if (target.type === 'playlist') {
		SharedRouter.goto_shared_playlist(target.uri, 'URI', {});
		return;
	}
	const resolved = await SharedUrls.resolve_track(target);
	if ('error' in resolved) {
		GLOBALS.global_var.bottom_alert('Failed to open shared track', 'WARN', resolved);
		return;
	}
	const track = SQLTracks.add_playback_saved_data_to_track(resolved);
	GLOBALS.global_var.play_tracks(track, [track], 'Shared Track');
}

function handle_link(url: string) {
	const parsed = Linking.parse(url);
	const shared = shared_url(url);
	if (shared !== null) open_shared_url(shared).catch(catch_log);
	else if (parsed.scheme === 'illusi') handle_illusi_url(parsed);
}

export function get_linking_handler() {
	Linking.getInitialURL().then((url) => {
		if (url) handle_link(url);
	}).catch(catch_log);

	const linking_handler = Linking.addEventListener('url', async ({ url }) => {
		if (url) handle_link(url);
	});

	return linking_handler;
}
