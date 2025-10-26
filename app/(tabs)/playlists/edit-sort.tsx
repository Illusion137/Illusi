import { reinterpret_cast } from "@common/cast";
import { playlist_sort_modes } from "@illusive/playlist_utils";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import type { SortType } from "@illusive/types";
import MultiOption from "@screens/MultiOption";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export interface PlaylistEditSortParams extends Record<string, string> {
    uuid: string;
}

const sort_modes = reinterpret_cast<SortType[]>(Object.keys(playlist_sort_modes));
export default function PlaylistEditSort(){
    const { uuid } = useLocalSearchParams<PlaylistEditSortParams>();
    
    const [current_sort_mode, set_current_sort_mode] = useState<SortType>("OLDEST");

    useEffect(() => {
        (async() => {
            const playlist_data = await SQLPlaylists.playlist_data(uuid, "IGNORE");
            set_current_sort_mode(playlist_data?.sort ?? "OLDEST")
        })()
    }, []);

    function update_sort_mode(mode: SortType){
        if(!sort_modes.includes(mode)) return;
        SQLPlaylists.update_playlist_sort_mode(uuid, mode);
        set_current_sort_mode(mode);
    }

    return (
        <MultiOption
            current_value={current_sort_mode}
            options={sort_modes}
            on_press={(mode) => update_sort_mode(reinterpret_cast<SortType>(mode))}/>
        );
}