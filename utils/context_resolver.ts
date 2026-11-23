import { is_empty, random_of, shuffle_array } from '@common/utils/util';
import { play_artist_discord_send, play_playlist_discord_send, play_track_discord_send } from '@illusive/discord';
import { upload_track_thumbnail } from '@illusive/document_picker';
import { download_track, undownload_track } from '@illusive/downloader';
import { GLOBALS } from '@illusive/globals';
import { delete_track } from '@illusive/illusi/src/components/track';
import { if_confirm, share_item } from '@illusive/illusi/src/illusi_utils';
import { play, play_shuffle, play_track_next, push_track_to_playing_queue, play_tracks_next, push_tracks_to_playing_queue, sprinkle_into_queue } from '@illusive/play';
import { Prefs } from '@illusive/prefs';
import { SQLfs } from '@illusive/sql/sql_fs';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { ShareLinks } from '@illusive/share_links';
import type { CompactArtist, CompactPlaylist, NamedUUID, Playlist, Track } from '@illusive/types';
import type { ResponseError } from '@common/types';
import { remove_topic } from '@common/utils/clean_util';
import { SQLPlaylists } from '@illusive/sql/sql_playlists';
import { create_uri, track_exists } from '@illusive/illusive_utils';
import { TimedCache } from '@common/types';
import { Constants } from '@illusive/constants';
import { SharedRouter } from './shared_routes';
import { alert_error } from '@illusive/illusi/src/alert';
import { Illusive } from '@illusive/illusive';
import { error_undefined } from '@common/utils/util';
import { catch_log } from '@common/utils/error_util';
import { reinterpret_cast } from '@common/cast';

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

	export type CollectionAction = 'play' | 'shuffle' | 'enqueue' | 'play-next' | 'sprinkle-in-queue' | 'station';
	type TracksSource = () => Promise<Track[] | ResponseError>;
	const has_station_seed = (track: Track) => !is_empty(track.youtube_id) || !is_empty(track.soundcloud_id);

	/** Plays or queues a whole collection; shuffle_first mixes the tracks before ordered actions (artists) */
	async function resolve_collection_action(action: CollectionAction, source: TracksSource, from: string, shuffle_first = false) {
		const fetched = await source();
		if ('error' in fetched) {
			alert_error(fetched);
			return;
		}
		const saved_tracks = SQLTracks.add_playback_saved_data_to_tracks(fetched);
		const tracks = shuffle_first ? shuffle_array(saved_tracks) : saved_tracks;
		if (tracks.length === 0) return;
		switch (action) {
			case 'play':
				GLOBALS.global_var.play_tracks(tracks[0], tracks, from, !shuffle_first);
				break;
			case 'shuffle':
				await play_shuffle(tracks, from);
				break;
			case 'enqueue':
				await push_tracks_to_playing_queue(tracks);
				break;
			case 'play-next':
				await play_tracks_next(tracks);
				break;
			case 'sprinkle-in-queue':
				await sprinkle_into_queue(tracks);
				break;
			case 'station': {
				const seeds = tracks.filter(has_station_seed);
				if (seeds.length === 0) {
					GLOBALS.global_var.bottom_alert?.('No tracks to start a station from', 'WARN');
					return;
				}
				const seed = random_of(seeds);
				const station_tracks = error_undefined(await Illusive.get_station_tracks(seed)) ?? [];
				play(seed, 'Station', () => SQLTracks.add_playback_saved_data_to_tracks(station_tracks)).catch(catch_log);
				break;
			}
		}
	}
	const COLLECTION_ACTIONS: readonly string[] = ['play', 'shuffle', 'enqueue', 'play-next', 'sprinkle-in-queue', 'station'] satisfies CollectionAction[];
	function is_collection_key<P extends string>(prefix: P, action_key: string): action_key is `${P}-${CollectionAction}` {
		return action_key.startsWith(`${prefix}-`) && COLLECTION_ACTIONS.includes(action_key.slice(prefix.length + 1));
	}
	const collection_action = (prefix: string, action_key: string) => reinterpret_cast<CollectionAction>(action_key.slice(prefix.length + 1));
	function view_artists(prefix: string, action_key: string, artists: NamedUUID[]) {
		const index = action_key === `${prefix}-view-artist` ? 0 : parseInt(action_key.replace(`${prefix}-view-artist-`, ''));
		SharedRouter.goto_shared_artist(artists[index]?.uri ?? '');
	}

	export type PlaylistContextKeys
		= `playlist-${CollectionAction}`
			| 'playlist-push-discord'
			| 'playlist-share-illusi'
			| 'playlist-duplicate'
			| 'playlist-pin'
			| 'playlist-public'
			| 'playlist-archive'
			| 'playlist-delete';
	export async function resolve_playlist_context(playlist: Playlist, action_key: PlaylistContextKeys, on_change?: (patch: Partial<Playlist>) => void) {
		if (is_collection_key('playlist', action_key)) {
			await resolve_collection_action(collection_action('playlist', action_key), async () => SQLPlaylists.playlist_tracks(playlist.uuid), playlist.title);
			return;
		}
		switch (action_key) {
			case 'playlist-push-discord':
				await play_playlist_discord_send(Prefs.get_pref('discord_webhook_url'), create_uri('illusi', playlist.uuid), Prefs.get_pref('always_shuffle') ? 'shuffle' : 'order', e => alert_error(e));
				break;
			case 'playlist-share-illusi':
				await share_item({ link: ShareLinks.playlist(playlist.uuid) });
				break;
			case 'playlist-duplicate':
				if (await SQLPlaylists.duplicate_playlist(playlist.uuid) === undefined) GLOBALS.global_var.bottom_alert?.('Failed to Duplicate Playlist', 'WARN');
				else GLOBALS.global_var.bottom_alert?.(`Duplicated ${playlist.title}`, 'GOOD');
				break;

			case 'playlist-pin': {
				const pinned = !(playlist.pinned ?? false);
				on_change?.({ pinned });
				await SQLPlaylists.pin_unpin_playlist(playlist.uuid, pinned);
				break;
			}
			case 'playlist-public': {
				const is_public = !(playlist.public ?? false);
				on_change?.({ public: is_public });
				await SQLPlaylists.public_private_playlist(playlist.uuid, is_public);
				break;
			}
			case 'playlist-archive': {
				const archived = !(playlist.archived ?? false);
				on_change?.({ archived });
				await SQLPlaylists.archive_playlist(playlist.uuid, archived);
				break;
			}
			case 'playlist-delete':
				if_confirm('Are you sure you want to delete this playlist?', 'This action can NOT be reversed', async () => {
					await SQLPlaylists.delete_playlist(playlist.uuid);
				}).catch(catch_log);
				break;
		}
	}

	export type ArtistContextKeys = Exclude<`artist-${CollectionAction}`, 'artist-play'> | 'artist-push-discord' | 'artist-view';
	export async function resolve_artist_context(artist: CompactArtist, action_key: ArtistContextKeys) {
		const uri = artist.name.uri;
		if (is_empty(uri)) return;
		if (is_collection_key('artist', action_key)) {
			await resolve_collection_action(collection_action('artist', action_key), async () => Illusive.get_artist_tracks(uri!), remove_topic(artist.name.name), true);
			return;
		}
		switch (action_key) {
			case 'artist-push-discord':
				await play_artist_discord_send(Prefs.get_pref('discord_webhook_url'), uri!, e => alert_error(e));
				break;
			case 'artist-view':
				SharedRouter.goto_shared_artist(uri!);
				break;
		}
	}

	export type AlbumContextKeys
		= `album-${CollectionAction}`
			| 'album-push-discord'
			| 'album-share'
			| 'album-save-to-library'
			| 'album-view-artist'
			| `album-view-artist-${string}`;
	const album_tracks_cache = new TimedCache<string, Track[]>(Constants.playlist_cache_duration_seconds * 1000);
	function known_album_tracks(album: CompactPlaylist): Track[] | undefined {
		const uri = album.title.uri;
		if (is_empty(uri)) return undefined;
		const page_cache = GLOBALS.global_var.playlist_cache.get(uri!);
		if (page_cache !== undefined && is_empty(page_cache.continuation)) return page_cache.tracks;
		return album_tracks_cache.get(uri!);
	}
	async function album_tracks(album: CompactPlaylist): Promise<Track[] | ResponseError> {
		const known = known_album_tracks(album);
		if (known !== undefined) return known;
		const tracks = await Illusive.get_uri_playlist_tracks(album.title.uri!, album.type === 'ALBUM');
		return 'error' in tracks ? tracks : album_tracks_cache.update(album.title.uri!, tracks);
	}
	/** Whether every track of the album is in the library; undefined until its tracks are known */
	export function album_in_library(album: CompactPlaylist): boolean | undefined {
		const tracks = known_album_tracks(album);
		if (tracks === undefined || tracks.length === 0) return undefined;
		return tracks.every(track => track_exists(track, GLOBALS.global_var.sql_tracks));
	}
	/** Loads the album's tracks so the menu can tell if it is already saved; resolves true when they were newly loaded */
	export async function prefetch_album_tracks(album: CompactPlaylist): Promise<boolean> {
		if (album.song_track || is_empty(album.title.uri) || known_album_tracks(album) !== undefined) return false;
		return !('error' in await album_tracks(album));
	}
	export async function resolve_album_context(album: CompactPlaylist, action_key: AlbumContextKeys) {
		const uri = album.title.uri;
		if (is_collection_key('album', action_key)) {
			if (!is_empty(uri)) await resolve_collection_action(collection_action('album', action_key), async () => album_tracks(album), album.title.name);
			return;
		}
		switch (action_key) {
			case 'album-push-discord':
				await play_playlist_discord_send(Prefs.get_pref('discord_webhook_url'), uri!, Prefs.get_pref('always_shuffle') ? 'shuffle' : 'order', e => alert_error(e));
				break;
			case 'album-share':
				await share_item({ link: ShareLinks.uri(uri!) });
				break;
			case 'album-save-to-library': {
				const tracks = await album_tracks(album);
				if ('error' in tracks) {
					alert_error(tracks);
					break;
				}
				const unsaved_tracks = tracks.filter(track => !track_exists(track, GLOBALS.global_var.sql_tracks));
				if (unsaved_tracks.length === 0) {
					GLOBALS.global_var.bottom_alert?.('Already in Library', 'INFO');
					break;
				}
				await SQLTracks.insert_all_tracks(unsaved_tracks);
				GLOBALS.global_var.bottom_alert?.(`Saved ${unsaved_tracks.length} ${unsaved_tracks.length === 1 ? 'Track' : 'Tracks'} to Library`, 'GOOD');
				break;
			}
			case 'album-view-artist':
			default:
				view_artists('album', action_key, album.artist);
				break;
		}
	}

	/** A compact playlist holding a song acts on that track, anything else as an album */
	export function compact_playlist_song(album: CompactPlaylist): Track | undefined {
		return album.song_track ? SQLTracks.add_playback_saved_data_to_track(album.song_track) : undefined;
	}
	export async function resolve_compact_playlist_context(album: CompactPlaylist, action_key: string) {
		const song = compact_playlist_song(album);
		if (song !== undefined) await resolve_track_context(song, undefined, reinterpret_cast<TrackContextKeys>(action_key));
		else await resolve_album_context(album, reinterpret_cast<AlbumContextKeys>(action_key));
	}

	export type TracksListContextKeys = `tracks-${CollectionAction}`;
	export async function resolve_tracks_list_context(title: string, get_tracks: () => Promise<Track[]>, action_key: TracksListContextKeys) {
		await resolve_collection_action(collection_action('tracks', action_key), get_tracks, title);
	}
}
