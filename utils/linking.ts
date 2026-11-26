import { IllusiAccount } from '@illusive/db/sync/illusi_account';
import { IllusiViews } from '@illusive/illusi_views';
import { ShareLinks } from '@illusive/share_links';
import { Illusi } from '@origin/illusi/illusi';
import { GLOBALS } from '@illusive/globals';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { Illusive } from '@illusive/illusive';
import type { Artwork, Track } from '@illusive/types';
import { is_empty } from '@common/utils/util';
import * as Linking from 'expo-linking';
import { SharedRouter } from './shared_routes';
import { SharedUrls } from '@illusive/shared_urls';
import { catch_log } from '@common/utils/error_util';
import { breadcrumb } from '@common/sentry_error_handler';
import { app_link_path, is_app_link, shared_url } from './app_links';

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

/** null when YouTube has the shared track's artwork; otherwise Illusi's, or the not found artwork */
async function artwork_without_youtube(track: Track): Promise<Artwork | null> {
	if (!is_empty(track.youtube_id) && await Illusive.get_highest_quality_youtube_thumbnail_uri(track.youtube_id!) !== null) return null;
	if (!is_empty(track.illusi_id) && IllusiAccount.is_logged_in()) {
		const view = await Illusi.Tracks.get(track.illusi_id!);
		const artwork_url = Illusi.is_error(view) ? '' : IllusiViews.track(view).artwork_url;
		if (!is_empty(artwork_url)) return artwork_url!;
	}
	return Illusive.illusi_dark_icon_index;
}

async function link_incoming_track(incoming: Track) {
	const track = SQLTracks.add_playback_saved_data_to_track(incoming);
	if (is_empty(track.thumbnail_uri)) {
		const artwork = await artwork_without_youtube(track);
		if (typeof artwork === 'string') track.artwork_url = artwork;
		if (artwork !== null) track.playback!.artwork = artwork;
	}
	GLOBALS.global_var.play_tracks(track, [track], 'Shared Track');
}

function handle_illusi_url(url: string) {
	const incoming = ShareLinks.parse(app_link_path(url));
	if ('error' in incoming) {
		GLOBALS.global_var.bottom_alert('Failed to open Illusi link', 'WARN', incoming);
		return;
	}
	if (incoming.type === 'track') {
		link_incoming_track(incoming.track).catch(catch_log);
	} else if (incoming.type === 'illusi_track') {
		link_incoming_illusi_track(incoming.illusi_id).catch(catch_log);
	} else {
		SharedRouter.goto_shared_playlist(incoming.uri, 'URI', { force_order: '1' });
	}
}

async function open_shared_url(url: string) {
	if (is_app_link(url)) return handle_illusi_url(url);
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
	if (!is_app_link(url)) return;
	const shared = shared_url(url);
	if (shared !== null) open_shared_url(shared).catch(catch_log);
	else handle_illusi_url(url);
}

export function get_linking_handler(app_loaded: Promise<unknown>) {
	const handle_when_loaded = (url: string | null) => {
		if (url) breadcrumb('linking', 'incoming link', { url });
		if (url) app_loaded.then(() => handle_link(url)).catch(catch_log);
	};
	Linking.getInitialURL().then(handle_when_loaded).catch(catch_log);
	return Linking.addEventListener('url', ({ url }) => handle_when_loaded(url));
}
