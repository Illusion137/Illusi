import type { IconConfig, UIMenuOptions } from 'react-native-ios-context-menu';
import type { MenuConfig, MenuElementConfig, MenuAttribute } from '@components/ContextMenu/types';
import { ContextResolver } from './context_resolver';
import type { ImageItemConfig, ImageResolvedAssetSource } from 'react-native-ios-utilities';
import { Image } from 'react-native';
import { is_empty } from '@common/utils/util';
import { Prefs } from '@illusive/prefs';
import { ShareLinks } from '@illusive/share_links';
import type { CompactArtist, CompactPlaylist, EditMode, NamedUUID, Playlist, Track } from '@illusive/types';
import { remove_topic } from '@common/utils/clean_util';
import { reinterpret_cast } from '@common/cast';
import { GLOBALS } from '@illusive/globals';
import { Constants } from '@illusive/constants';
import { RepeatMode } from 'react-native-everything-player';

type Icon = ImageResolvedAssetSource | string;
export function resolve_icon(icon?: Icon): IconConfig | ImageItemConfig | undefined {
	return typeof icon === 'undefined' ? undefined : typeof icon === 'object' ? { iconType: 'REQUIRE', iconValue: icon } : { type: 'IMAGE_SYSTEM', imageValue: { systemName: icon } };
}
export function base_menu_item<Keys extends string>(key: Keys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon) {
	return { actionKey: key, actionTitle: title, icon: resolve_icon(icon), menuAttributes: attributes?.() };
}
export function menu_folder(title: string, items: MenuElementConfig[], icon?: Icon, attributes?: UIMenuOptions[]): MenuConfig {
	return { menuTitle: title, icon: resolve_icon(icon), menuItems: items, menuOptions: attributes };
}
export function extract_menu_items<Keys extends string>(items: MenuElementConfig[], keys: Keys[]): MenuElementConfig[] {
	return keys.flatMap(key => items.filter(item => reinterpret_cast<{ actionKey: Keys }>(item).actionKey === key));
}
export function get_menu_item<Keys extends string>(items: MenuElementConfig[], key: Keys) {
	return items.find(item => reinterpret_cast<{ actionKey: Keys }>(item).actionKey === key)!;
}
const discord_app_icon = Image.resolveAssetSource(require('../assets/discord.png'));
export namespace TrackContextMenu {
	const track_menu_item = (key: ContextResolver.TrackContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon): MenuElementConfig => base_menu_item<ContextResolver.TrackContextKeys>(key, title, attributes, icon);

	const view_artist_element = (track: Track): MenuElementConfig =>
		track.artists.length <= 1
			? track_menu_item('track-view-artist', 'View Artist', () => (is_empty(track.artists?.[0]?.uri) ? ['hidden'] : undefined), 'music.mic')
			: menu_folder(
					'View Artists',
					track.artists.map((artist, i) => track_menu_item(`track-view-artist-${i}`, artist.name, () => (is_empty(track.artists[i]?.uri) ? ['hidden'] : undefined), 'music.mic')),
					'music.mic'
				);

	export const track_all_functions = (track: Track, write_playlist_uuid: string) => {
		const is_playlist_saved
			= ((track.downloading_data?.playlist_saved ?? false) && write_playlist_uuid !== Constants.library_write_playlist) || ((track.downloading_data?.saved ?? false) && write_playlist_uuid === Constants.library_write_playlist);
		const is_saved = is_playlist_saved || (track.downloading_data?.saved ?? false) || GLOBALS.global_var.sql_tracks.find(t => t.uid === track.uid);
		return [
			track_menu_item('track-station', 'Play Station', () => (is_empty(track.youtube_id) && is_empty(track.soundcloud_id)) ? ['hidden'] : undefined, 'waveform.circle'),
			track_menu_item('track-push-discord', 'Push Discord', () => (is_empty(Prefs.get_pref('discord_webhook_url')) || !is_empty(track.imported_id) ? ['hidden'] : undefined), discord_app_icon),
			view_artist_element(track),
			track_menu_item('track-view-album', 'View Album', () => (is_empty(track.album?.uri) ? ['hidden'] : undefined), 'list.bullet'),
			track_menu_item('track-view-info', 'View Track Info', () => (!is_saved ? ['hidden'] : undefined), 'plus.viewfinder'),
			track_menu_item('track-edit-info', 'Edit Track Info', () => (!is_saved ? ['hidden'] : undefined), 'pencil'),
			track_menu_item('track-trim-media', 'Trim Media', () => (is_empty(track.media_uri) ? ['hidden'] : undefined), 'timeline.selection'),
			track_menu_item('track-download-thumbnail', 'Download Thumbnail', () => (!is_empty(track.thumbnail_uri) || !is_saved || !is_empty(track.imported_id) ? ['hidden'] : undefined), 'arrow.down.circle'),
			track_menu_item('track-upload-artwork', 'Upload Artwork', () => (!is_saved ? ['hidden'] : undefined), 'photo.artframe'),
			track_menu_item('track-download-media', 'Download Media', () => (!is_empty(track.media_uri) || !is_saved ? ['hidden'] : undefined), 'arrow.down.circle'),
			track_menu_item('track-download-lyrics', 'Download Lyrics', () => (!is_empty(track.lyrics_uri) || !is_saved ? ['hidden'] : undefined), 'arrow.down.circle.dotted'),
			track_menu_item('track-remove-artwork', 'Remove Artwork', () => (is_empty(track.thumbnail_uri) || !is_saved ? ['hidden'] : ['destructive']), 'trash'),
			track_menu_item('track-delete-media', 'Delete Media', () => (is_empty(track.media_uri) || !is_empty(track.imported_id) || !is_saved ? ['hidden'] : ['destructive']), 'trash'),
			track_menu_item('track-delete-lyrics', 'Delete Lyrics', () => (is_empty(track.lyrics_uri) || !is_saved ? ['hidden'] : ['destructive']), 'trash'),
			track_menu_item('track-delete', 'Delete', () => (!is_saved ? ['hidden'] : ['destructive']), 'trash'),
			track_menu_item('track-delete-playlist', 'Delete From Playlist', () => (is_empty(write_playlist_uuid) || write_playlist_uuid === Constants.library_write_playlist || !is_playlist_saved ? ['hidden'] : ['destructive']), 'trash'),
			track_menu_item('track-share-illusi', 'Illusi Link', () => (ShareLinks.can_share_track(track) ? undefined : ['hidden']), 'link'),
			track_menu_item('track-share-original', 'Source Link', () => (ShareLinks.source(track) === null ? ['hidden'] : undefined), 'link.icloud.fill'),
			track_menu_item('track-share-downloaded', 'Downloaded File', () => (is_empty(track.media_uri) ? ['hidden'] : undefined), 'folder.circle'),
			track_menu_item('track-share-thumbnail', 'Thumbnail', () => (is_empty(track.thumbnail_uri) ? ['hidden'] : undefined), 'photo.artframe'),
			track_menu_item('track-enqueue', 'Enqueue Track', () => (!GLOBALS.global_var.is_playing ? ['hidden'] : undefined), 'text.append'),
			track_menu_item('track-play-next', 'Play Next', () => (!GLOBALS.global_var.is_playing ? ['hidden'] : undefined), 'text.insert'),
			track_menu_item('track-add-to-library', 'Save to Library', () => (is_saved ? ['hidden'] : undefined), 'plus.circle'),
			track_menu_item('track-add-to-playlist', 'Add to Playlist', undefined, 'text.badge.plus')
		];
	};
	export const track_extracted_attributes = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ['track-view-info', 'track-edit-info', 'track-trim-media']);
	export const track_attributes_folder = (track: Track, write_playlist_uuid: string) => menu_folder('Attributes', track_extracted_attributes(track, write_playlist_uuid), 'list.clipboard');

	export const track_extracted_offline = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), [
			'track-download-media',
			'track-upload-artwork',
			'track-download-thumbnail',
			'track-download-lyrics',
			'track-remove-artwork',
			'track-delete-media',
			'track-delete-lyrics'
		]);
	export const track_offline_folder = (track: Track, write_playlist_uuid: string) => menu_folder('Offline', track_extracted_offline(track, write_playlist_uuid), 'arrow.down.circle.dotted');

	export const track_extracted_share = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ['track-share-illusi', 'track-share-original', 'track-share-downloaded', 'track-share-thumbnail']);
	export const track_share_folder = (track: Track, write_playlist_uuid: string) => menu_folder('Share', track_extracted_share(track, write_playlist_uuid), 'square.and.arrow.up');

	export const track_extracted_destructive = (track: Track, write_playlist_uuid: string) => extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ['track-delete', 'track-delete-playlist']);
	export const track_destructive_folder = (track: Track, write_playlist_uuid: string) => menu_folder('Destructive', track_extracted_destructive(track, write_playlist_uuid), 'trash', ['destructive']);

	export const track_artwork_folder = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ['track-upload-artwork', 'track-download-thumbnail', 'track-remove-artwork']);

	export const track_component_inner_context_menu = (track: Track, write_playlist_uuid: string) => {
		const all_fns = track_all_functions(track, write_playlist_uuid);
		if (!GLOBALS.global_var.is_playing) {
			return [
				{ menuTitle: '', menuOptions: ['displayInline'] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-push-discord']) },
				...extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-station']),
				view_artist_element(track),
				...extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-view-album']),
				{ menuTitle: '', menuOptions: ['displayInline'] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-view-info', 'track-edit-info', 'track-trim-media']) },
				{ menuTitle: '', menuOptions: ['displayInline'] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-add-to-library', 'track-add-to-playlist']) },
				track_offline_folder(track, write_playlist_uuid),
				track_share_folder(track, write_playlist_uuid),
				track_destructive_folder(track, write_playlist_uuid)
			];
		}
		return [
			...extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-station']),
			view_artist_element(track),
			...extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-view-album']),
			{ menuTitle: '', menuOptions: ['displayInline'] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-view-info', 'track-edit-info', 'track-trim-media']) },
			{ menuTitle: '', menuOptions: ['displayInline'] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-add-to-library', 'track-add-to-playlist']) },
			track_offline_folder(track, write_playlist_uuid),
			track_share_folder(track, write_playlist_uuid),
			track_destructive_folder(track, write_playlist_uuid)
		];
	};

	const track_component_more_options_folder = (track: Track, write_playlist_uuid: string) => menu_folder('More Options', track_component_inner_context_menu(track, write_playlist_uuid), 'option');

	export const track_component_context_menu = (track: Track, write_playlist_uuid: string) => {
		const all_fns = track_all_functions(track, write_playlist_uuid);
		return menu_folder(
			'',
			GLOBALS.global_var.is_playing
				? [
						{
							menuTitle: '',
							menuOptions: ['displayInline'] as UIMenuOptions[],
							menuPreferredElementSize: 'small' as const,
							menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ['track-enqueue', 'track-play-next', 'track-push-discord'])
						},
						track_component_more_options_folder(track, write_playlist_uuid)
					]
				: track_component_inner_context_menu(track, write_playlist_uuid)
		);
	};

	// const menuconfig_more_options: MenuElementConfig = 						{
	//     menuTitle: "More Options",
	//     menuItems: menuconfig_more,
	//     icon: {
	//         type: 'IMAGE_SYSTEM',
	//         imageValue: {
	//             systemName: 'option',
	//         },
	//     }
	// };
}

export namespace PlaybackContextMenu {
	export type PlaybackContextKeys = 'playback-shuffle' | 'playback-repeat-off' | 'playback-repeat-queue' | 'playback-repeat-track';
	const playback_menu_item = (key: PlaybackContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon): MenuElementConfig => base_menu_item<PlaybackContextKeys>(key, title, attributes, icon);

	export const playback_modes_menu = (repeat_mode: RepeatMode): MenuConfig => ({
		menuTitle: 'Playback',
		menuItems: [
			{
				menuTitle: 'Shuffle',
				menuOptions: ['displayInline'],
				menuItems: [playback_menu_item('playback-shuffle', 'Shuffle Queue', undefined, 'shuffle')]
			},
			{
				menuTitle: 'Repeat',
				menuOptions: ['displayInline'],
				menuItems: [
					playback_menu_item('playback-repeat-off', 'Off', () => (repeat_mode === RepeatMode.Off ? ['disabled'] : undefined), 'minus.circle'),
					playback_menu_item('playback-repeat-queue', 'Repeat Queue', () => (repeat_mode === RepeatMode.Queue ? ['disabled'] : undefined), 'repeat'),
					playback_menu_item('playback-repeat-track', 'Repeat Track', () => (repeat_mode === RepeatMode.Track ? ['disabled'] : undefined), 'repeat.1')
				]
			}
		]
	});
}

const inline_section = (items: MenuElementConfig[]): MenuConfig => ({ menuTitle: '', menuOptions: ['displayInline'], menuItems: items });
const hidden_unless_playing = (): MenuAttribute[] | undefined => (!GLOBALS.global_var.is_playing ? ['hidden'] : undefined);
const can_push_discord = () => !is_empty(Prefs.get_pref('discord_webhook_url'));

namespace CollectionMenu {
	export function items<P extends string>(prefix: P, opts: { shuffle_title?: string; can_play?: boolean } = {}): MenuElementConfig[] {
		return [
			base_menu_item(`${prefix}-play`, 'Play', () => (opts.can_play === false ? ['hidden'] : undefined), 'play'),
			base_menu_item(`${prefix}-shuffle`, opts.shuffle_title ?? 'Shuffle', undefined, 'shuffle'),
			base_menu_item(`${prefix}-enqueue`, 'Enqueue All', hidden_unless_playing, 'text.append'),
			base_menu_item(`${prefix}-play-next`, 'Play Next', hidden_unless_playing, 'text.insert'),
			base_menu_item(`${prefix}-sprinkle-in-queue`, 'Sprinkle in Queue', hidden_unless_playing, 'square.3.layers.3d.middle.filled'),
			base_menu_item(`${prefix}-station`, 'Play Station', undefined, 'waveform.circle')
		];
	}
	/** Three small buttons on top (queueing while playing, playing otherwise, Discord last), then the rest inline */
	export function sections<P extends string>(prefix: P, all_fns: MenuElementConfig[], discord_key?: string, can_play = true): MenuElementConfig[] {
		const ordered = (GLOBALS.global_var.is_playing ? ['enqueue', 'sprinkle-in-queue', 'play-next', 'play', 'shuffle', 'station'] : ['play', 'shuffle', 'station'])
			.filter(action => can_play || action !== 'play')
			.map(action => `${prefix}-${action}`);
		const top = discord_key !== undefined ? [...ordered.slice(0, 2), discord_key] : ordered.slice(0, 3);
		const rest = discord_key !== undefined ? ordered.slice(2) : ordered.slice(3);
		return [
			{ ...inline_section(extract_menu_items(all_fns, top)), menuPreferredElementSize: 'small' as const },
			...(rest.length > 0 ? [inline_section(extract_menu_items(all_fns, rest))] : [])
		];
	}
	export function view_artists_element(prefix: string, artists: NamedUUID[]): MenuElementConfig {
		return artists.length <= 1
			? base_menu_item(`${prefix}-view-artist`, 'View Artist', () => (is_empty(artists[0]?.uri) ? ['hidden'] : undefined), 'music.mic')
			: menu_folder('View Artists', artists.map((artist, i) => base_menu_item(`${prefix}-view-artist-${i}`, remove_topic(artist.name), () => (is_empty(artist.uri) ? ['hidden'] : undefined), 'music.mic')), 'music.mic');
	}
}

export namespace PlaylistContextMenu {
	const playlist_menu_item = (key: ContextResolver.PlaylistContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon): MenuElementConfig => base_menu_item<ContextResolver.PlaylistContextKeys>(key, title, attributes, icon);

	export const playlist_all_functions = (playlist: Playlist) => [
		...CollectionMenu.items('playlist'),
		playlist_menu_item('playlist-push-discord', 'Push Discord', () => (!can_push_discord() || !(playlist.public ?? false) ? ['hidden'] : undefined), discord_app_icon),
		playlist_menu_item('playlist-share-illusi', 'Share', () => (!(playlist.public ?? false) ? ['hidden'] : undefined), 'square.and.arrow.up'),
		playlist_menu_item('playlist-duplicate', 'Duplicate', undefined, 'plus.square.on.square'),
		playlist_menu_item('playlist-pin', playlist.pinned ? 'Unpin' : 'Pin', undefined, playlist.pinned ? 'pin.slash' : 'pin'),
		playlist_menu_item('playlist-public', playlist.public ? 'Make Private' : 'Make Public', undefined, playlist.public ? 'person' : 'person.3.sequence'),
		playlist_menu_item('playlist-archive', playlist.archived ? 'Unarchive' : 'Archive', undefined, 'archivebox'),
		{
			...playlist_menu_item('playlist-delete', 'Delete', () => (playlist.pinned ? ['disabled', 'destructive'] : ['destructive']), 'trash'),
			actionSubtitle: playlist.pinned ? 'Unable to delete a pinned playlist' : undefined
		}
	];

	export const playlist_component_context_menu = (playlist: Playlist): MenuConfig => {
		const all_fns = playlist_all_functions(playlist);
		const discord = can_push_discord() && (playlist.public ?? false) ? 'playlist-push-discord' : undefined;
		return menu_folder(`Playlist - ${playlist.title}`, [
			...CollectionMenu.sections('playlist', all_fns, discord),
			inline_section(extract_menu_items<ContextResolver.PlaylistContextKeys>(all_fns, ['playlist-share-illusi', 'playlist-duplicate'])),
			inline_section(extract_menu_items<ContextResolver.PlaylistContextKeys>(all_fns, ['playlist-pin', 'playlist-public', 'playlist-archive'])),
			...extract_menu_items<ContextResolver.PlaylistContextKeys>(all_fns, ['playlist-delete'])
		]);
	};
}

export namespace ArtistContextMenu {
	export const artist_component_context_menu = (artist: CompactArtist): MenuConfig => {
		const all_fns = [
			...CollectionMenu.items('artist', { shuffle_title: 'Shuffle Play', can_play: false }),
			base_menu_item<ContextResolver.ArtistContextKeys>('artist-push-discord', 'Push Discord', () => (!can_push_discord() ? ['hidden'] : undefined), discord_app_icon),
			base_menu_item<ContextResolver.ArtistContextKeys>('artist-view', 'View Artist', undefined, 'music.mic')
		];
		return menu_folder(remove_topic(artist.name.name), [
			...CollectionMenu.sections('artist', all_fns, can_push_discord() ? 'artist-push-discord' : undefined, false),
			...extract_menu_items<ContextResolver.ArtistContextKeys>(all_fns, ['artist-view'])
		]);
	};
}

export namespace AlbumContextMenu {
	export const album_component_context_menu = (album: CompactPlaylist): MenuConfig => {
		const all_fns = [
			...CollectionMenu.items('album'),
			base_menu_item<ContextResolver.AlbumContextKeys>('album-push-discord', 'Push Discord', () => (!can_push_discord() ? ['hidden'] : undefined), discord_app_icon),
			base_menu_item<ContextResolver.AlbumContextKeys>('album-save-to-library', 'Save to Library', () => (ContextResolver.album_in_library(album) === true ? ['hidden'] : undefined), 'plus.circle'),
			base_menu_item<ContextResolver.AlbumContextKeys>('album-share', 'Share', undefined, 'square.and.arrow.up')
		];
		return menu_folder(album.title.name, [
			...CollectionMenu.sections('album', all_fns, can_push_discord() ? 'album-push-discord' : undefined),
			CollectionMenu.view_artists_element('album', album.artist),
			inline_section(extract_menu_items<ContextResolver.AlbumContextKeys>(all_fns, ['album-save-to-library', 'album-share']))
		]);
	};
	export const compact_playlist_context_menu = (album: CompactPlaylist): MenuConfig => {
		const song = ContextResolver.compact_playlist_song(album);
		return song !== undefined ? TrackContextMenu.track_component_context_menu(song, '') : album_component_context_menu(album);
	};
}

export namespace TracksListContextMenu {
	export const tracks_list_context_menu = (title: string): MenuConfig => menu_folder(title, CollectionMenu.sections('tracks', CollectionMenu.items('tracks')));
}

const shortcuts_app_icon = Image.resolveAssetSource(require('../assets/shortcut.png'));

export const playlist_push_discord_item = (discord_uri: string | undefined): MenuElementConfig =>
	base_menu_item('playlist-actions-push-discord', 'Push Discord', () => (!can_push_discord() || is_empty(discord_uri) ? ['hidden'] : undefined), discord_app_icon);

export const menuconfig_local_playlist = (edit_mode_state: EditMode, colors: Prefs.Theme['colors'], filtered_tracks: Track[], discord_uri?: string): MenuConfig => ({
	menuTitle: '',
	menuItems: [
		playlist_push_discord_item(discord_uri),
		{
			menuTitle: 'Quick Modes',
			menuOptions: ['displayInline'],
			menuItems: [
				{ actionKey: 'playlist-actions-default-mode', actionTitle: 'Default', menuAttributes: edit_mode_state === 'NONE' ? ['disabled'] : undefined, icon: { type: 'IMAGE_SYSTEM', imageValue: { systemName: 'scribble' } } },
				{
					actionKey: 'playlist-actions-download-mode',
					actionTitle: 'Download',
					menuAttributes: edit_mode_state === 'DOWNLOAD' ? ['disabled'] : undefined,
					icon: { type: 'IMAGE_SYSTEM', imageOptions: { tint: colors.primary, renderingMode: 'alwaysOriginal' }, imageValue: { systemName: 'square.and.arrow.down' } }
				},
				{
					actionKey: 'playlist-actions-delete-mode',
					actionTitle: 'Delete',
					menuAttributes: edit_mode_state === 'DELETE' ? ['disabled'] : ['destructive'],
					icon: { type: 'IMAGE_SYSTEM', imageOptions: { tint: colors.red, renderingMode: 'alwaysOriginal' }, imageValue: { systemName: 'trash' } }
				}
			],
			icon: { type: 'IMAGE_SYSTEM', imageValue: { systemName: 'folder' } }
		},
		{
			menuTitle: 'Batch Download',
			menuItems: [
				{
					actionKey: 'playlist-actions-batch-download-media',
					actionTitle: 'Download Media',
					menuAttributes: filtered_tracks.every(track => !is_empty(track.media_uri)) ? ['disabled'] : undefined,
					icon: { type: 'IMAGE_SYSTEM', imageOptions: { tint: colors.secondary, renderingMode: 'alwaysOriginal' }, imageValue: { systemName: 'music.note' } }
				},
				{
					actionKey: 'playlist-actions-batch-download-thumbnails',
					actionTitle: 'Download Thumbnails',
					menuAttributes: filtered_tracks.every(track => !is_empty(track.thumbnail_uri)) ? ['disabled'] : undefined,
					icon: { type: 'IMAGE_SYSTEM', imageOptions: { tint: colors.secondary, renderingMode: 'alwaysOriginal' }, imageValue: { systemName: 'photo.artframe' } }
				},
				{
					actionKey: 'playlist-actions-batch-download-lyrics',
					actionTitle: 'Download Lyrics',
					menuAttributes: filtered_tracks.every(track => !is_empty(track.lyrics_uri)) ? ['disabled'] : undefined,
					icon: { type: 'IMAGE_SYSTEM', imageOptions: { tint: colors.secondary, renderingMode: 'alwaysOriginal' }, imageValue: { systemName: 'mic.fill' } }
				}
			],
			icon: { type: 'IMAGE_SYSTEM', imageOptions: { tint: colors.secondary, renderingMode: 'alwaysOriginal' }, imageValue: { systemName: 'square.and.arrow.down' } }
		},
		{ actionKey: 'playlist-actions-shortcut', actionTitle: 'Make Shortcut', icon: { iconType: 'REQUIRE', iconValue: shortcuts_app_icon } }
	]
});
