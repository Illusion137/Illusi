import { is_empty } from "@common/utils/util";
import { Constants } from "@illusive/constants";
import { encode_track, play_track_discord_send } from "@illusive/discord";
import { upload_track_thumbnail } from "@illusive/document_picker";
import { download_track, undownload_track } from "@illusive/downloader";
import { GLOBALS } from "@illusive/globals";
import { delete_track } from "@illusive/illusi/src/components/track";
import { if_confirm, share_item } from "@illusive/illusi/src/illusi_utils";
import { play_track_next, push_track_to_playing_queue } from "@illusive/illusi/src/play";
import { track_to_illusive_uri } from "@illusive/illusive_utils";
import { Prefs } from "@illusive/prefs";
import { SQLfs } from "@illusive/sql/sql_fs";
import { SQLTracks } from "@illusive/sql/sql_tracks";
import type { Track } from "@illusive/types";
import { SharedRouter } from './shared_routes';
import { alert_error } from "@illusive/illusi/src/alert";

export namespace ContextResolver{
    export type TrackContextKeys = 
        "track-push-discord"
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
    export async function resolve_track_context(track: Track|undefined, write_playlist_uuid: string|undefined, action_key: TrackContextKeys){
        if(track === undefined) return;
        if(action_key.includes('track-view-artist-')){
            const index = parseInt(action_key.replace('track-view-artist-', ''));
            SharedRouter.goto_shared_artist( track.artists[index].uri ?? "" );
        }
        switch(action_key){
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
                SharedRouter.goto_shared_playlist(track.album?.uri ?? "", "URI", {fs_cache_playlist_as_album: "1"});
                break;

            case "track-share-original": 
                if (!is_empty(track.youtube_id))
                    await share_item({link: `https://www.youtube.com/watch?v=${track.youtube_id}`});
                else if (!is_empty(track.soundcloud_permalink))
                    await share_item({link: track.soundcloud_permalink!});
                break;
            case "track-share-downloaded":
                if(is_empty(track.media_uri)) break;
                await share_item({uri: SQLfs.media_directory(track.media_uri!)});
                break;
            case "track-share-illusi":
                await share_item({link: `${Constants.illusi_url_base}/track/${encode_track(track)}`});
                break;

            case "track-download-media": 
                await download_track(track, false);
                break;
            case "track-delete-media":
                await undownload_track(track);
                // set_is_downloaded(false);
                break;
            case "track-download-lyrics":
                const lyrics_result = await GLOBALS.global_var.download_track_lyrics(track);
                // set_is_lyrics_downloaded(lyrics_result === "ok");
                GLOBALS.global_var.bottom_alert?.(typeof lyrics_result === "string" && lyrics_result !== "EXISTS" ? "Downloaded Track Lyrics" : "Failed to Download Track Lyrics",lyrics_result === "ok" ? "GOOD" : "WARN");
                break;
            case "track-delete-lyrics": 
                await SQLTracks.undownload_track_lyrics(track);
                GLOBALS.global_var.bottom_alert?.("Removed Track Lyrics", "INFO");
                // set_is_lyrics_downloaded(false);
                break;
            
            case "track-download-thumbnail":
                const downloaded_thumbnail_uri = await SQLTracks.download_thumbnail(track);
                if(downloaded_thumbnail_uri === undefined) {
                    GLOBALS.global_var.bottom_alert?.("Failed to Downloaded Track Artwork", "WARN");
                    return
                }
                // set_artwork(Illusive.get_track_artwork(SQLfs.document_directory(""), {...track, thumbnail_uri: downloaded_thumbnail_uri ?? ''}));
                // set_is_thumbnail_downloaded(downloaded_thumbnail_uri !== undefined);
                GLOBALS.global_var.bottom_alert?.("Downloaded Track Artwork", "INFO");
                break;
            case "track-upload-artwork": 
                await upload_track_thumbnail(track, async() => {
                    // set_artwork(Illusive.get_track_artwork(SQLfs.document_directory(""), updated_track));
                    // set_is_thumbnail_downloaded(true);
                    GLOBALS.global_var.bottom_alert?.("Updated Track Artwork", "INFO");
                } ); 
                break;
            case "track-remove-artwork": 
                await SQLTracks.update_track(track.uid, {...track, thumbnail_uri: ''}); 
                // set_artwork(Illusive.get_track_artwork(SQLfs.document_directory(""), {...track, thumbnail_uri: ''}));
                // set_is_thumbnail_downloaded(false);
                GLOBALS.global_var.bottom_alert?.("Removed Track Artwork", "INFO");
                break;
            
            case "track-delete":
                if_confirm(`Delete:\n ${track.title}?`, "This action can't be undone.", async () => delete_track(track, write_playlist_uuid));
                break;
        }
    }


}