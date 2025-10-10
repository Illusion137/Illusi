import { GLOBALS } from "@illusive/globals";
import PlaylistBase, { type PlaylistType } from "@screens/playlist/PlaylistBase";
import { useLocalSearchParams } from "expo-router";

export interface PlaylistParams extends Record<string, string> { 
    uri: string;
    type: PlaylistType;
    force_order: "1"|"0";
}

export default function Playlist(){
    const { uri, force_order, type } = useLocalSearchParams<PlaylistParams>();
    const serialized_playlist_data = GLOBALS.global_var.serialized_playlist_cache.get(uri)!;
    const compact_playlist = GLOBALS.global_var.compact_playlist_cache.get(uri);

    switch(type){
        case "DEFAULT_PLAYLIST":
            return <PlaylistBase type={type} default_playlist_title={uri} force_order={Boolean(Number(force_order))}/>
        case "URI":
            return <PlaylistBase type={type} uri={uri} compact_playlist={compact_playlist}/>
        case "UUID":
            return <PlaylistBase type={type} uuid={uri}/>
        case "WRITE_PLAYLIST":
            return <PlaylistBase type={type} write_playlist_uuid={uri} serialized_playlist_data={serialized_playlist_data}/>
        default:
            return <PlaylistBase type={type} uri={uri}/>
    }
}