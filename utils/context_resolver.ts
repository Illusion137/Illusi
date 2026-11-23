import { is_empty } from '@common/utils/util';
import { play_track_discord_send } from '@illusive/discord';
import { upload_track_thumbnail } from '@illusive/document_picker';
import { download_track, undownload_track } from '@illusive/downloader';
import { GLOBALS } from '@illusive/globals';
import { delete_track } from '@illusive/illusi/src/components/track';
import { if_confirm, share_item } from '@illusive/illusi/src/illusi_utils';
import { play, play_track_next, push_track_to_playing_queue } from '@illusive/play';
import { Prefs } from '@illusive/prefs';
import { SQLfs } from '@illusive/sql/sql_fs';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { ShareLinks } from '@illusive/share_links';
import type { Track } from '@illusive/types';
import { SharedRouter } from './shared_routes';
import { alert_error } from '@illusive/illusi/src/alert';
import { Illusive } from '@illusive/illusive';
import { error_undefined } from '@common/utils/util';
import { catch_log } from '@common/utils/error_util';

export namespace ContextResolver {
	export type TrackContextKeys
		= 'track-station'
			| 'track-push-discord'
			| 'track-enqueue'
			| 'track-play-next'
			| 'track-trim-media'
			| 'track-view-info'
			| 'track-edit-info'
			| 'track-view-artist'
			| `track-view-artist-${string}`
			| 'track-view-album'
			| 'track-share-illusi'
			| 'track-share-original'
			| 'track-share-downloaded'
			| 'track-share-thumbnail'
			| 'track-download-media'
			| 'track-delete-media'
			| 'track-download-lyrics'
			| 'track-delete-lyrics'
			| 'track-download-thumbnail'
			| 'track-upload-artwork'
			| 'track-remove-artwork'
			| 'track-delete'
			| 'track-delete-playlist'
			| 'track-add-to-library'
			| 'track-add-to-playlist';
	export async function resolve_track_context(track: Track | undefined, write_playlist_uuid: string | undefined, action_key: TrackContextKeys) {
		if (track === undefined) return;
		if (action_key.includes('track-view-artist-')) {
			const index = parseInt(action_key.replace('track-view-artist-', ''));
			SharedRouter.goto_shared_artist(track.artists[index].uri ?? '');
		}
		switch (action_key) {
			case 'track-station': {
				const station_tracks = error_undefined(await Illusive.get_station_tracks(track)) ?? [];
				play(track, 'Station', () => SQLTracks.add_playback_saved_data_to_tracks(station_tracks)).catch(catch_log);
				break;
			}
			case 'track-push-discord':
				play_track_discord_send(Prefs.get_pref('discord_webhook_url'), track, e => alert_error(e)).catch(catch_log);
				break;
			case 'track-enqueue':
				push_track_to_playing_queue(track).catch(catch_log);
				break;
			case 'track-play-next':
				play_track_next(track).catch(catch_log);
				break;

			case 'track-trim-media':
				SharedRouter.goto_shared_track_trim(track.uid);
				break;
			case 'track-view-info':
				SharedRouter.goto_shared_track_info(track.uid);
				break;
			case 'track-edit-info':
				SharedRouter.goto_shared_track_edit(track.uid);
				break;

			case 'track-view-artist':
				SharedRouter.goto_shared_artist(track.artists[0].uri ?? '');
				break;
			case 'track-view-album':
				SharedRouter.goto_shared_playlist(track.album?.uri ?? '', 'URI', { fs_cache_playlist_as_album: '1' });
				break;

			case 'track-share-original': {
				const link = ShareLinks.source(track);
				if (link !== null) await share_item({ link });
				break;
			}
			case 'track-share-downloaded':
				if (is_empty(track.media_uri)) break;
				await share_item({ uri: SQLfs.media_directory(track.media_uri!) });
				break;
			case 'track-share-illusi': {
				const link = ShareLinks.track(track);
				if (link !== null) await share_item({ link });
				break;
			}

			case 'track-download-media':
				await download_track(track, false);
				break;
			case 'track-delete-media':
				await undownload_track(track);
				break;
			case 'track-download-lyrics':
			{
				const lyrics_result = await GLOBALS.global_var.download_track_lyrics(track);
				if (typeof lyrics_result === 'string') break;
				if ('error' in lyrics_result)
					GLOBALS.global_var.bottom_alert?.('Failed to Download Track Lyrics', 'WARN');
				else {
					GLOBALS.global_var.bottom_alert?.('Downloaded Track Lyrics' + (lyrics_result.sync_status !== 'NONE' ? ' (+Synced)' : ''), 'GOOD');
				}
				break;
			}
			case 'track-delete-lyrics':
			{
				await SQLTracks.undownload_track_lyrics(track);
				GLOBALS.global_var.bottom_alert?.('Removed Track Lyrics', 'INFO');
				break;
			}
			case 'track-download-thumbnail':
			{
				const downloaded_thumbnail_uri = await SQLTracks.download_thumbnail(track);
				if (downloaded_thumbnail_uri === undefined) {
					GLOBALS.global_var.bottom_alert?.('Failed to Downloaded Track Artwork', 'WARN');
					return;
				}
				GLOBALS.global_var.bottom_alert?.('Downloaded Track Artwork', 'INFO');
				break;
			}
			case 'track-upload-artwork':
				// TODO come back to this
				await upload_track_thumbnail(track, async () => {
					GLOBALS.global_var.bottom_alert?.('Updated Track Artwork', 'INFO');
				});
				break;
			case 'track-remove-artwork':
				await SQLTracks.update_track(track.uid, { ...track, thumbnail_uri: '' });
				GLOBALS.global_var.bottom_alert?.('Removed Track Artwork', 'INFO');
				break;

			case 'track-delete':
				if_confirm(`Delete:\n ${track.title}?`, 'This action can\'t be undone.', async () => delete_track(track, write_playlist_uuid)).catch(catch_log);
				break;
			case 'track-add-to-library':
				await SQLTracks.insert_track(track);
				break;
			case 'track-add-to-playlist':
				SharedRouter.goto_shared_add_to_playlists(track);
				break;
			case 'track-delete-playlist':
				// TODO await SQLPlaylists.delete_track_playlist({track_uid: track.uid, uuid: });
				break;
			case 'track-share-thumbnail':
				if (track.thumbnail_uri) {
					if (track.thumbnail_uri.includes(track.uid)) {
						await share_item({ uri: SQLfs.thumbnail_directory(track.thumbnail_uri) });
					} else await share_item({ uri: SQLfs.custom_thumbnail_directory(track.thumbnail_uri) });
				}
				break;
		}
	}
}
