import { reinterpret_cast } from "@common/cast";
import { encodeLocalSearchParams } from "@hooks/useParsedLocalSearchParams";
import { GLOBALS } from "@illusive/globals";
import type { CompactPlaylist, SerializedCompactPlaylistData, Track } from "@illusive/types";
import type { PlaylistType } from "@screens/playlist/PlaylistBase";
import { router } from "expo-router";

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
            params: { uri, type, force_order: opts.force_order ?? "0" }
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

}