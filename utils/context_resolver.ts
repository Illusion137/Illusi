import { is_empty } from "@common/utils/util";
import { Constants } from "@illusive/constants";
import { encode_track, play_track_discord_send } from "@illusive/discord";
import { upload_track_thumbnail } from "@illusive/document_picker";
import { download_track, undownload_track } from "@illusive/downloader";
import { GLOBALS } from "@illusive/globals";
import { delete_track } from "@illusive/illusi/src/components/track";
import { if_confirm, share_item } from "@illusive/illusi/src/illusi_utils";
import { play, play_track_next, push_track_to_playing_queue } from "@illusive/illusi/src/play";
import { Prefs } from "@illusive/prefs";
import { SQLfs } from "@illusive/sql/sql_fs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import { SQLAudiobook } from "@illusive/sql/sql_audiobook";
import type { AudiobookTableItem } from "@illusive/db/schema";
import type { Track } from "@illusive/types";
import { SharedRouter } from './shared_routes';
import { alert_error } from "@illusive/illusi/src/alert";
import { Illusive } from "@illusive/illusive";
import { error_undefined } from '../lib-origin/common/utils/util';

export namespace ContextResolver {
    export type TrackContextKeys =
        "track-station"
        | "track-push-discord"
        | "track-enqueue"
        | "track-play-next"
        | "track-trim-media"
        | "track-view-info"
        | "track-edit-info"
        | "track-view-artist"
        | `track-view-artist-${string}`
        | "track-view-album"
        | "track-share-illusi"
        | "track-share-original"
        | "track-share-downloaded"
        | "track-share-thumbnail"
        | "track-download-media"
        | "track-delete-media"
        | "track-download-lyrics"
        | "track-delete-lyrics"
        | "track-download-thumbnail"
        | "track-upload-artwork"
        | "track-remove-artwork"
        | "track-delete"
        | "track-delete-playlist"
        | "track-add-to-library"
        | "track-add-to-playlist";
    export async function resolve_track_context(track: Track | undefined, write_playlist_uuid: string | undefined, action_key: TrackContextKeys) {
        if (track === undefined) return;
        if (action_key.includes('track-view-artist-')) {
            const index = parseInt(action_key.replace('track-view-artist-', ''));
            SharedRouter.goto_shared_artist(track.artists[index].uri ?? "");
        }
        switch (action_key) {
            case "track-station": {
                const station_tracks = error_undefined(await Illusive.get_station_tracks(track)) ?? [];
                play(track, "Station", () => SQLTracks.add_playback_saved_data_to_tracks(station_tracks));
                break;
            }
            case "track-push-discord":
                play_track_discord_send(Prefs.get_pref('discord_webhook_url'), track, (e) => alert_error(e));
                break;
            case "track-enqueue":
                push_track_to_playing_queue(track);
                break;
            case "track-play-next":
                play_track_next(track);
                break;

            case "track-trim-media":
                SharedRouter.goto_shared_track_trim(track.uid);
                break;
            case "track-view-info":
                SharedRouter.goto_shared_track_info(track.uid);
                break;
            case "track-edit-info":
                SharedRouter.goto_shared_track_edit(track.uid);
                break;

            case "track-view-artist":
                SharedRouter.goto_shared_artist(track.artists[0].uri ?? "");
                break;
            case "track-view-album":
                SharedRouter.goto_shared_playlist(track.album?.uri ?? "", "URI", { fs_cache_playlist_as_album: "1" });
                break;

            case "track-share-original":
                if (!is_empty(track.youtube_id))
                    await share_item({ link: `https://www.youtube.com/watch?v=${track.youtube_id}` });
                else if (!is_empty(track.soundcloud_permalink))
                    await share_item({ link: track.soundcloud_permalink! });
                break;
            case "track-share-downloaded":
                if (is_empty(track.media_uri)) break;
                await share_item({ uri: SQLfs.media_directory(track.media_uri!) });
                break;
            case "track-share-illusi":
                await share_item({ link: `${Constants.illusi_url_base}/track/${encode_track(track)}` });
                break;

            case "track-download-media":
                await download_track(track, false);
                break;
            case "track-delete-media":
                await undownload_track(track);
                break;
            case "track-download-lyrics":
                {
                    const lyrics_result = await GLOBALS.global_var.download_track_lyrics(track);
                    if (typeof lyrics_result === "string") break;
                    if ("error" in lyrics_result)
                        GLOBALS.global_var.bottom_alert?.("Failed to Download Track Lyrics", "WARN");
                    else {
                        GLOBALS.global_var.bottom_alert?.("Downloaded Track Lyrics" + (lyrics_result.synced ? " (+Synced)" : ""), "GOOD");
                    }
                    break;
                }
            case "track-delete-lyrics":
                {
                    await SQLTracks.undownload_track_lyrics(track);
                    GLOBALS.global_var.bottom_alert?.("Removed Track Lyrics", "INFO");
                    break;
                }
            case "track-download-thumbnail":
                {
                    const downloaded_thumbnail_uri = await SQLTracks.download_thumbnail(track);
                    if (downloaded_thumbnail_uri === undefined) {
                        GLOBALS.global_var.bottom_alert?.("Failed to Downloaded Track Artwork", "WARN");
                        return
                    }
                    GLOBALS.global_var.bottom_alert?.("Downloaded Track Artwork", "INFO");
                    break;
                }
            case "track-upload-artwork":
                // TODO come back to this
                await upload_track_thumbnail(track, async () => {
                    GLOBALS.global_var.bottom_alert?.("Updated Track Artwork", "INFO");
                });
                break;
            case "track-remove-artwork":
                await SQLTracks.update_track(track.uid, { ...track, thumbnail_uri: '' });
                GLOBALS.global_var.bottom_alert?.("Removed Track Artwork", "INFO");
                break;

            case "track-delete":
                if_confirm(`Delete:\n ${track.title}?`, "This action can't be undone.", async () => delete_track(track, write_playlist_uuid));
                break;
            case "track-add-to-library":
                await SQLTracks.insert_track(track);
                break;
            case "track-add-to-playlist":
                SharedRouter.goto_shared_add_to_playlists(track);
                break;
            case "track-delete-playlist":
                // TODO await SQLPlaylists.delete_track_playlist({track_uid: track.uid, uuid: });
                break;
            case "track-share-thumbnail":
                if (track.thumbnail_uri) {
                    if (track.thumbnail_uri.includes(track.uid)) {
                        await share_item({ uri: SQLfs.thumbnail_directory(track.thumbnail_uri) });
                    }
                    else await share_item({ uri: SQLfs.custom_thumbnail_directory(track.thumbnail_uri) });
                }
                break;
        }
    }

    export type AudiobookContextKeys =
        | "audiobook-resume"
        | "audiobook-restart"
        | "audiobook-view-details"
        | "audiobook-mark-finished"
        | "audiobook-remove-from-series"
        | "audiobook-delete";

    export interface AudiobookContextHandlers {
        on_play?: (novel: AudiobookTableItem) => void;
        on_restart?: (novel: AudiobookTableItem) => void;
        on_view_details?: (novel: AudiobookTableItem) => void;
        on_refresh?: () => void | Promise<void>;
    }

    export async function resolve_audiobook_context(novel: AudiobookTableItem, action_key: AudiobookContextKeys, handlers: AudiobookContextHandlers = {}) {
        const percent = novel.total_duration_ms > 0 ? novel.total_listened_ms / novel.total_duration_ms : 0;
        const finished = percent >= 0.999;
        switch (action_key) {
            case "audiobook-resume":
                handlers.on_play?.(novel);
                break;
            case "audiobook-restart":
                handlers.on_restart?.(novel);
                break;
            case "audiobook-view-details":
                handlers.on_view_details?.(novel);
                break;
            case "audiobook-mark-finished":
                await SQLAudiobook.update_audiobook(novel.uuid, {
                    total_listened_ms: finished ? 0 : novel.total_duration_ms,
                    last_read_date: new Date().toISOString()
                });
                await handlers.on_refresh?.();
                break;
            case "audiobook-remove-from-series":
                await SQLAudiobook.update_audiobook(novel.uuid, { series_name: "", series_no: 0 });
                await handlers.on_refresh?.();
                break;
            case "audiobook-delete":
                if_confirm(`Delete:\n ${novel.title || "Untitled"}?`, "This action can't be undone.", async () => {
                    await SQLAudiobook.delete_audiobook(novel.uuid);
                    await handlers.on_refresh?.();
                });
                break;
        }
    }

    export type SeriesContextKeys =
        | "series-open"
        | "series-resume"
        | "series-toggle-expand"
        | "series-ungroup";

    export interface SeriesContextHandlers {
        on_open?: (series_name: string, novels: AudiobookTableItem[]) => void;
        on_resume?: (series_name: string, novels: AudiobookTableItem[]) => void;
        on_toggle_expand?: () => void;
        on_refresh?: () => void | Promise<void>;
    }

    export async function resolve_series_context(series_name: string, novels: AudiobookTableItem[], action_key: SeriesContextKeys, handlers: SeriesContextHandlers = {}) {
        switch (action_key) {
            case "series-open":
                handlers.on_open?.(series_name, novels);
                break;
            case "series-resume":
                handlers.on_resume?.(series_name, novels);
                break;
            case "series-toggle-expand":
                handlers.on_toggle_expand?.();
                break;
            case "series-ungroup":
                if_confirm(`Ungroup "${series_name}"?`, "Each book will be removed from the series.", async () => {
                    for (const novel of novels) {
                        await SQLAudiobook.update_audiobook(novel.uuid, { series_name: "", series_no: 0 });
                    }
                    await handlers.on_refresh?.();
                });
                break;
        }
    }
}