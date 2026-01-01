import { reinterpret_cast } from "@common/cast";
import { encodeLocalSearchParams } from "@hooks/useParsedLocalSearchParams";
import { GLOBALS } from "@illusive/globals";
import type { CompactArtist, CompactPlaylist, SerializedCompactPlaylistData, Track } from "@illusive/types";
import type { PlaylistType } from "@screens/PlaylistBase";
import { router } from "expo-router";
import { shared_values } from "./shared_values";

export namespace SharedRouter {
    let current_route_path = "";
    export function set_current_route_path(path: string){
        current_route_path = path;
    }
    export function get_current_route_path(){
        return current_route_path;
    }

    function get_initial_route(){
        const split_paths = current_route_path.split('/').filter(path => path);
        if(split_paths.length === 0) return;
        const initial_route = split_paths[0];
        return initial_route;
    }
    type GoodRoute = "/(tabs)"

    export function goto_shared_add_to_playlists(track: Track){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/add-to-playlists/[track]`), 
            params: encodeLocalSearchParams({ _track: track })
        });
    }
    export function goto_shared_artist(uri: string){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/artist/[uri]`), 
            params: { uri }
        });
    }
    export function goto_shared_playlist(uri: string, type: PlaylistType, opts: {
        force_order?: "1"|"0";
        serialized_playlist_data?: SerializedCompactPlaylistData;
        compact_playlist?: CompactPlaylist;
        fs_cache_playlist_as_album?: "1"|"0";
    }){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        if(opts.compact_playlist){
            GLOBALS.global_var.compact_playlist_cache.update(uri, opts.compact_playlist)
        }
        if(opts.serialized_playlist_data){
            GLOBALS.global_var.serialized_playlist_cache.update(uri, opts.serialized_playlist_data);
        }
        if(type === "WRITE_PLAYLIST" && opts.serialized_playlist_data === undefined){
            console.error("NO SERIALIZED_PLAYLIST_DATA FOR WRITE_PLAYLIST");
            return;
        }
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/playlist/[uri]`), 
            params: { uri, type, force_order: opts.force_order ?? "0", fs_cache_playlist_as_album: opts.fs_cache_playlist_as_album ?? "0" }
        });
    }
    export function goto_shared_track_edit(uid: string){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/track-edit/[uid]`), 
            params: { uid }
        });
    }
    export function goto_shared_track_info(uid: string){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/track-info/[uid]`), 
            params: { uid }
        });
    }
    export function goto_shared_track_trim(uid: string){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/track-trim/[uid]`), 
            params: { uid }
        });
    }

    export function goto_shared_player_equalizer_selector(){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/player/equalizer-selector`), 
            params: undefined
        });
    }

    export function goto_shared_player_lyrics_share(){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/player/lyrics-share`), 
            params: undefined
        });
    }

    export function goto_shared_player_lyrics(lyrics_uri: string){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/player/lyrics`), 
            params: { lyrics_uri }
        });
    }

    export function goto_shared_player_queue(){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/player/queue`), 
            params: undefined
        });
    }

    export function goto_shared_player_settings(){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/player/settings`), 
            params: undefined
        });
    }

    export function goto_shared_player_visualizer(){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/player/visualizer`), 
            params: undefined
        });
    }

    export function goto_shared_track_list(title: string, tracks: Track[]){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        const type: PlaylistType = "TRACKS_LIST";
        shared_values.tracks_list = tracks;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/playlist/[uri]`), 
            params: { title: title, type, force_order: "1" }
        });
    }

    export function goto_shared_artist_grid(title: string, artists: CompactArtist[]){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        shared_values.artist_grid = artists;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/artist_grid`), 
            params: { title }
        });
    }

    export function goto_shared_album_grid(title: string, albums: CompactPlaylist[]){
        const initial_route = get_initial_route();
        if(!initial_route) return;
        shared_values.album_grid = albums;
        router.push({
            pathname: reinterpret_cast<GoodRoute>(`/(tabs)/${initial_route}/(shared)/album_grid`), 
            params: { title }
        });
    }
}