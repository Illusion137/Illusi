import type { IconConfig, UIMenuOptions } from "react-native-ios-context-menu";
import type { MenuConfig, MenuElementConfig, MenuAttribute } from "@components/ContextMenu/types";
import type { ContextResolver } from "./context_resolver";
import type { ImageItemConfig, ImageResolvedAssetSource } from "react-native-ios-utilities";
import { Image } from "react-native";
import { is_empty } from "@common/utils/util";
import { Prefs } from "@illusive/prefs";
import type { EditMode, Track } from "@illusive/types";
import type { AudiobookTableItem } from "@illusive/db/schema";
import { reinterpret_cast } from "../lib-origin/common/cast";
import { GLOBALS } from "@illusive/globals";
import { Constants } from "@illusive/constants";
import { RepeatMode } from "react-native-track-player";

// TODO add support for discord without play mode
type Icon = ImageResolvedAssetSource | string;
export function resolve_icon(icon?: Icon): IconConfig | ImageItemConfig | undefined {
	return typeof icon === "undefined" ? undefined : typeof icon === "object" ? { iconType: "REQUIRE", iconValue: icon } : { type: "IMAGE_SYSTEM", imageValue: { systemName: icon } };
}
export function base_menu_item<Keys extends string>(key: Keys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon) {
	return { actionKey: key, actionTitle: title, icon: resolve_icon(icon), menuAttributes: attributes?.() };
}
export function menu_folder(title: string, items: MenuElementConfig[], icon?: Icon, attributes?: UIMenuOptions[]): MenuConfig {
	return { menuTitle: title, icon: resolve_icon(icon), menuItems: items, menuOptions: attributes };
}
export function extract_menu_items<Keys extends string>(items: MenuElementConfig[], keys: Keys[]): MenuElementConfig[] {
	return keys.flatMap((key) => items.filter((item) => reinterpret_cast<{ actionKey: Keys }>(item).actionKey === key));
}
export function get_menu_item<Keys extends string>(items: MenuElementConfig[], key: Keys) {
	return items.find((item) => reinterpret_cast<{ actionKey: Keys }>(item).actionKey === key)!;
}
export namespace TrackContextMenu {
	const track_menu_item = (key: ContextResolver.TrackContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon): MenuElementConfig => base_menu_item<ContextResolver.TrackContextKeys>(key, title, attributes, icon);

	const view_artist_element = (track: Track): MenuElementConfig =>
		track.artists.length <= 1
			? track_menu_item("track-view-artist", "View Artist", () => (is_empty(track.artists?.[0]?.uri) ? ["hidden"] : undefined), "music.mic")
			: menu_folder(
				"View Artists",
				track.artists.map((artist, i) => track_menu_item(`track-view-artist-${i}`, artist.name, () => (is_empty(track.artists[i]?.uri) ? ["hidden"] : undefined), "music.mic")),
				"music.mic"
			);

	const discord_app_icon = Image.resolveAssetSource(require("../assets/discord.png"));
	export const track_all_functions = (track: Track, write_playlist_uuid: string) => {
		const is_playlist_saved =
			((track.downloading_data?.playlist_saved ?? false) && write_playlist_uuid !== Constants.library_write_playlist) || ((track.downloading_data?.saved ?? false) && write_playlist_uuid === Constants.library_write_playlist);
		const is_saved = is_playlist_saved || (track.downloading_data?.saved ?? false) || GLOBALS.global_var.sql_tracks.find((t) => t.uid === track.uid);
		return [
			track_menu_item("track-station", "Play Station", () => (is_empty(track.youtube_id) && is_empty(track.soundcloud_id)) ? ["hidden"] : undefined, "waveform.circle"),
			track_menu_item("track-push-discord", "Push Discord", () => (is_empty(Prefs.get_pref("discord_webhook_url")) || !is_empty(track.imported_id) ? ["hidden"] : undefined), discord_app_icon),
			view_artist_element(track),
			track_menu_item("track-view-album", "View Album", () => (is_empty(track.album?.uri) ? ["hidden"] : undefined), "list.bullet"),
			track_menu_item("track-view-info", "View Track Info", () => (!is_saved ? ["hidden"] : undefined), "plus.viewfinder"),
			track_menu_item("track-edit-info", "Edit Track Info", () => (!is_saved ? ["hidden"] : undefined), "pencil"),
			track_menu_item("track-trim-media", "Trim Media", () => (is_empty(track.media_uri) ? ["hidden"] : undefined), "timeline.selection"),
			track_menu_item("track-download-thumbnail", "Download Thumbnail", () => (!is_empty(track.thumbnail_uri) || !is_saved || !is_empty(track.imported_id) ? ["hidden"] : undefined), "arrow.down.circle"),
			track_menu_item("track-upload-artwork", "Upload Artwork", () => (!is_saved ? ["hidden"] : undefined), "photo.artframe"),
			track_menu_item("track-download-media", "Download Media", () => (!is_empty(track.media_uri) || !is_saved ? ["hidden"] : undefined), "arrow.down.circle"),
			track_menu_item("track-download-lyrics", "Download Lyrics", () => (!is_empty(track.lyrics_uri) || !is_saved ? ["hidden"] : undefined), "arrow.down.circle.dotted"),
			track_menu_item("track-remove-artwork", "Remove Artwork", () => (is_empty(track.thumbnail_uri) || !is_saved ? ["hidden"] : ["destructive"]), "trash"),
			track_menu_item("track-delete-media", "Delete Media", () => (is_empty(track.media_uri) || !is_saved ? ["hidden"] : ["destructive"]), "trash"),
			track_menu_item("track-delete-lyrics", "Delete Lyrics", () => (is_empty(track.lyrics_uri) || !is_saved ? ["hidden"] : ["destructive"]), "trash"),
			track_menu_item("track-delete", "Delete", () => (!is_saved ? ["hidden"] : ["destructive"]), "trash"),
			track_menu_item("track-delete-playlist", "Delete From Playlist", () => (is_empty(write_playlist_uuid) || write_playlist_uuid === Constants.library_write_playlist || !is_playlist_saved ? ["hidden"] : ["destructive"]), "trash"),
			track_menu_item("track-share-illusi", "Illusi Link", () => (!is_empty(track.imported_id) ? ["hidden"] : undefined), "link"),
			track_menu_item("track-share-original", "Source Link", () => (!is_empty(track.imported_id) ? ["hidden"] : undefined), "link.icloud.fill"),
			track_menu_item("track-share-downloaded", "Downloaded File", () => (is_empty(track.media_uri) ? ["hidden"] : undefined), "folder.circle"),
			track_menu_item("track-share-thumbnail", "Thumbnail", () => (is_empty(track.thumbnail_uri) ? ["hidden"] : undefined), "photo.artframe"),
			track_menu_item("track-enqueue", "Enqueue Track", () => (!GLOBALS.global_var.is_playing ? ["hidden"] : undefined), "text.append"),
			track_menu_item("track-play-next", "Play Next", () => (!GLOBALS.global_var.is_playing ? ["hidden"] : undefined), "text.insert"),
			track_menu_item("track-add-to-library", "Save to Library", () => (is_saved ? ["hidden"] : undefined), "plus.circle"),
			track_menu_item("track-add-to-playlist", "Add to Playlist", undefined, "text.badge.plus")
		];
	};
	export const track_extracted_attributes = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ["track-view-info", "track-edit-info", "track-trim-media"]);
	export const track_attributes_folder = (track: Track, write_playlist_uuid: string) => menu_folder("Attributes", track_extracted_attributes(track, write_playlist_uuid), "list.clipboard");

	export const track_extracted_offline = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), [
			"track-download-media",
			"track-upload-artwork",
			"track-download-thumbnail",
			"track-download-lyrics",
			"track-remove-artwork",
			"track-delete-media",
			"track-delete-lyrics"
		]);
	export const track_offline_folder = (track: Track, write_playlist_uuid: string) => menu_folder("Offline", track_extracted_offline(track, write_playlist_uuid), "arrow.down.circle.dotted");

	export const track_extracted_share = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ["track-share-illusi", "track-share-original", "track-share-downloaded", "track-share-thumbnail"]);
	export const track_share_folder = (track: Track, write_playlist_uuid: string) => menu_folder("Share", track_extracted_share(track, write_playlist_uuid), "square.and.arrow.up");

	export const track_extracted_destructive = (track: Track, write_playlist_uuid: string) => extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ["track-delete", "track-delete-playlist"]);
	export const track_destructive_folder = (track: Track, write_playlist_uuid: string) => menu_folder("Destructive", track_extracted_destructive(track, write_playlist_uuid), "trash", ["destructive"]);

	export const track_artwork_folder = (track: Track, write_playlist_uuid: string) =>
		extract_menu_items<ContextResolver.TrackContextKeys>(track_all_functions(track, write_playlist_uuid), ["track-upload-artwork", "track-download-thumbnail", "track-remove-artwork"]);

	export const track_component_inner_context_menu = (track: Track, write_playlist_uuid: string) => {
		const all_fns = track_all_functions(track, write_playlist_uuid);
		return [
			...extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ["track-station"]),
			view_artist_element(track),
			...extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ["track-view-album"]),
			{ menuTitle: "", menuOptions: ["displayInline"] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ["track-view-info", "track-edit-info", "track-trim-media"]) },
			{ menuTitle: "", menuOptions: ["displayInline"] as UIMenuOptions[], menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ["track-add-to-library", "track-add-to-playlist"]) },
			track_offline_folder(track, write_playlist_uuid),
			track_share_folder(track, write_playlist_uuid),
			track_destructive_folder(track, write_playlist_uuid)
		];
	};

	const track_component_more_options_folder = (track: Track, write_playlist_uuid: string) => menu_folder("More Options", track_component_inner_context_menu(track, write_playlist_uuid), "option");

	export const track_component_context_menu = (track: Track, write_playlist_uuid: string) => {
		const all_fns = track_all_functions(track, write_playlist_uuid);
		return menu_folder(
			"",
			GLOBALS.global_var.is_playing
				? [
					{
						menuTitle: "",
						menuOptions: ["displayInline"] as UIMenuOptions[],
						menuPreferredElementSize: "small" as const,
						menuItems: extract_menu_items<ContextResolver.TrackContextKeys>(all_fns, ["track-enqueue", "track-play-next", "track-push-discord"])
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

export namespace AudiobookContextMenu {
	const audiobook_menu_item = (key: ContextResolver.AudiobookContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: string): MenuElementConfig =>
		base_menu_item<ContextResolver.AudiobookContextKeys>(key, title, attributes, icon);

	export const audiobook_all_functions = (novel: AudiobookTableItem): MenuElementConfig[] => {
		const percent = novel.total_duration_ms > 0 ? novel.total_listened_ms / novel.total_duration_ms : 0;
		const finished = percent >= 0.999;
		const started = percent > 0 && !finished;
		const in_series = (novel.series_name?.trim() ?? "").length > 0;
		return [
			audiobook_menu_item("audiobook-resume", started ? "Resume" : "Play", undefined, "play.fill"),
			audiobook_menu_item("audiobook-restart", "Start Over", () => (started || finished ? undefined : ["hidden"]), "arrow.counterclockwise"),
			audiobook_menu_item("audiobook-view-details", "View Details", undefined, "info.circle"),
			audiobook_menu_item("audiobook-mark-finished", finished ? "Mark Unfinished" : "Mark Finished", undefined, "checkmark.circle"),
			audiobook_menu_item("audiobook-remove-from-series", "Remove From Series", () => (in_series ? undefined : ["hidden"]), "rectangle.stack.badge.minus"),
			audiobook_menu_item("audiobook-delete", "Delete", () => ["destructive"], "trash")
		];
	};

	export const audiobook_component_context_menu = (novel: AudiobookTableItem): MenuConfig => ({
		menuTitle: novel.title || "Untitled",
		menuSubtitle: novel.author || undefined,
		menuItems: audiobook_all_functions(novel)
	});
}

export namespace SeriesContextMenu {
	const series_menu_item = (key: ContextResolver.SeriesContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: string): MenuElementConfig =>
		base_menu_item<ContextResolver.SeriesContextKeys>(key, title, attributes, icon);

	export const series_all_functions = (novels: AudiobookTableItem[], expanded?: boolean): MenuElementConfig[] => [
		series_menu_item("series-open", "Open Series", undefined, "rectangle.stack"),
		series_menu_item("series-resume", "Resume", () => (novels.some((n) => n.total_listened_ms > 0) ? undefined : ["hidden"]), "play.fill"),
		series_menu_item("series-toggle-expand", expanded ? "Collapse" : "Expand", () => (expanded === undefined ? ["hidden"] : undefined), expanded ? "chevron.up" : "chevron.down"),
		series_menu_item("series-ungroup", "Ungroup Series", () => ["destructive"], "rectangle.stack.badge.minus")
	];

	export const series_component_context_menu = (series_name: string, novels: AudiobookTableItem[], expanded?: boolean): MenuConfig => ({
		menuTitle: series_name,
		menuSubtitle: `${novels.length} books`,
		menuItems: series_all_functions(novels, expanded)
	});
}

export namespace PlaybackContextMenu {
	export type PlaybackContextKeys = "playback-shuffle" | "playback-repeat-off" | "playback-repeat-queue" | "playback-repeat-track";
	const playback_menu_item = (key: PlaybackContextKeys, title: string, attributes?: () => MenuAttribute[] | undefined, icon?: Icon): MenuElementConfig => base_menu_item<PlaybackContextKeys>(key, title, attributes, icon);

	export const playback_modes_menu = (repeat_mode: RepeatMode): MenuConfig => ({
		menuTitle: "Playback",
		menuItems: [
			{
				menuTitle: "Shuffle",
				menuOptions: ["displayInline"],
				menuItems: [playback_menu_item("playback-shuffle", "Shuffle Queue", undefined, "shuffle")]
			},
			{
				menuTitle: "Repeat",
				menuOptions: ["displayInline"],
				menuItems: [
					playback_menu_item("playback-repeat-off", "Off", () => (repeat_mode === RepeatMode.Off ? ["disabled"] : undefined), "minus.circle"),
					playback_menu_item("playback-repeat-queue", "Repeat Queue", () => (repeat_mode === RepeatMode.Queue ? ["disabled"] : undefined), "repeat"),
					playback_menu_item("playback-repeat-track", "Repeat Track", () => (repeat_mode === RepeatMode.Track ? ["disabled"] : undefined), "repeat.1")
				]
			}
		]
	});
}

const shortcuts_app_icon = Image.resolveAssetSource(require("../assets/shortcut.png"));

export const menuconfig_local_playlist = (edit_mode_state: EditMode, colors: Prefs.Theme["colors"], filtered_tracks: Track[]): MenuConfig => ({
	menuTitle: "",
	menuItems: [
		{
			menuTitle: "Quick Modes",
			menuOptions: ["displayInline"],
			menuItems: [
				{ actionKey: "playlist-actions-default-mode", actionTitle: "Default", menuAttributes: edit_mode_state === "NONE" ? ["disabled"] : undefined, icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "scribble" } } },
				{
					actionKey: "playlist-actions-download-mode",
					actionTitle: "Download",
					menuAttributes: edit_mode_state === "DOWNLOAD" ? ["disabled"] : undefined,
					icon: { type: "IMAGE_SYSTEM", imageOptions: { tint: colors.primary, renderingMode: "alwaysOriginal" }, imageValue: { systemName: "square.and.arrow.down" } }
				},
				{
					actionKey: "playlist-actions-delete-mode",
					actionTitle: "Delete",
					menuAttributes: edit_mode_state === "DELETE" ? ["disabled"] : ["destructive"],
					icon: { type: "IMAGE_SYSTEM", imageOptions: { tint: colors.red, renderingMode: "alwaysOriginal" }, imageValue: { systemName: "trash" } }
				}
			],
			icon: { type: "IMAGE_SYSTEM", imageValue: { systemName: "folder" } }
		},
		{
			menuTitle: "Batch Download",
			menuItems: [
				{
					actionKey: "playlist-actions-batch-download-media",
					actionTitle: "Download Media",
					menuAttributes: filtered_tracks.every((track) => !is_empty(track.media_uri)) ? ["disabled"] : undefined,
					icon: { type: "IMAGE_SYSTEM", imageOptions: { tint: colors.secondary, renderingMode: "alwaysOriginal" }, imageValue: { systemName: "music.note" } }
				},
				{
					actionKey: "playlist-actions-batch-download-thumbnails",
					actionTitle: "Download Thumbnails",
					menuAttributes: filtered_tracks.every((track) => !is_empty(track.thumbnail_uri)) ? ["disabled"] : undefined,
					icon: { type: "IMAGE_SYSTEM", imageOptions: { tint: colors.secondary, renderingMode: "alwaysOriginal" }, imageValue: { systemName: "photo.artframe" } }
				},
				{
					actionKey: "playlist-actions-batch-download-lyrics",
					actionTitle: "Download Lyrics",
					menuAttributes: filtered_tracks.every((track) => !is_empty(track.lyrics_uri)) ? ["disabled"] : undefined,
					icon: { type: "IMAGE_SYSTEM", imageOptions: { tint: colors.secondary, renderingMode: "alwaysOriginal" }, imageValue: { systemName: "mic.fill" } }
				}
			],
			icon: { type: "IMAGE_SYSTEM", imageOptions: { tint: colors.secondary, renderingMode: "alwaysOriginal" }, imageValue: { systemName: "square.and.arrow.down" } }
		},
		{ actionKey: "playlist-actions-shortcut", actionTitle: "Make Shortcut", icon: { iconType: "REQUIRE", iconValue: shortcuts_app_icon } }
	]
});
