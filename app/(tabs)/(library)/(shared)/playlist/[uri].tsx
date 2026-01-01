import { GLOBALS } from "@illusive/globals";
import PlaylistBase, { type PlaylistType } from "@screens/PlaylistBase";
import { shared_values } from "@utils/shared_values";
import { useLocalSearchParams } from "expo-router";

export interface PlaylistParams extends Record<string, string> { 
    uri: string;
    type: PlaylistType;
    force_order: "1"|"0";
}

export default function Playlist(){
    const { uri, force_order, type, fs_cache_playlist_as_album, title } = useLocalSearchParams<PlaylistParams>();
    const serialized_playlist_data = GLOBALS.global_var.serialized_playlist_cache.get(uri)!;
    const compact_playlist = GLOBALS.global_var.compact_playlist_cache.get(uri);
    const bool_force_order = Boolean(Number(force_order));
    const bool_fs_cache_playlist_as_album = Boolean(Number(fs_cache_playlist_as_album));
    const tracks = shared_values.tracks_list;

    switch(type){
        case "DEFAULT_PLAYLIST":
            return <PlaylistBase type={type} default_playlist_title={uri} force_order={bool_force_order}/>
        case "URI":
            return <PlaylistBase cache_as_album={bool_fs_cache_playlist_as_album} type={type} uri={uri} compact_playlist={compact_playlist}/>
        case "UUID":
            return <PlaylistBase type={type} uuid={uri}/>
        case "WRITE_PLAYLIST":
            return <PlaylistBase type={type} write_playlist_uuid={uri} serialized_playlist_data={serialized_playlist_data}/>
        case "TRACKS_LIST":
            return <PlaylistBase type={type} title={title} tracks={tracks}/>
        default: return (<></>);
    }
}