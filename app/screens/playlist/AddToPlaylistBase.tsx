import * as GLOBALS from "../../../lib-origin/Illusive/src/illusi/src/globals";
import * as SQLActions from "../../../lib-origin/Illusive/src/illusi/src/sql_actions";
import { useTheme } from "@react-navigation/native";
import { CompactPlaylistData } from "../../../../lib-origin/Illusive/src/types";
import { Prefs } from "../../../../lib-origin/Illusive/src/prefs";
import { StyleSheet } from "react-native";
import BigList from "react-native-big-list";
import CompactPlaylistComponent from "../../components/CompactPlaylistComponent";
import { useEffect, useState } from "react";
import { default_playlists } from "../../../lib-origin/Illusive/src/illusi/src/default_playlists";
import { Route } from "../../../lib-origin/Illusive/src/types";

export default function AddToPlaylistBase(params: {route:  Route<unknown>}){
    const ts_route = params.route as Route<{write_playlist_uuid: string}>;
	// const { colors } = useTheme() as typeof Prefs.dark_theme;
	// const styles = theme_styles(colors);

    const [playlists_data, set_playlists_data] = useState<CompactPlaylistData[]>([]);

    useEffect(() => {
        (async() => {
            await SQLActions.fetch_track_data();
            const playlists: CompactPlaylistData[] = [];
            const library_four_track = GLOBALS.global_var.sql_tracks.slice(0,4);
            playlists.push({
                "title": "My Library",
                "four_track": library_four_track,
                "track_count": GLOBALS.global_var.sql_tracks.length,
                "track_callback": async() => { return GLOBALS.global_var.sql_tracks; } 
            })
            for(const default_playlist of default_playlists){
                const tracks = await default_playlist.track_function();
                playlists.push({
                    "title": default_playlist.name,
                    "four_track": tracks.slice(0, 4),
                    "track_count": tracks.length,
                    "track_callback": default_playlist.track_function
                })
            }
            for(const playlist of await SQLActions.all_playlists_data()){
                playlists.push({
                    "title": playlist.title,
                    "four_track": playlist.visual_data!.four_track!,
                    "track_count": playlist.visual_data!.track_count!,
                    "track_callback": async() => { return await SQLActions.playlist_tracks(playlist.uuid) }
                })
            }
            set_playlists_data(playlists);
        })()
    }, []);

    const compact_playlist_component = (item: {item: CompactPlaylistData}) => (
        <CompactPlaylistComponent playlist_data={item.item} on_press={() => {}}/>
    );

    return (
        <BigList 
            style={{height: '71%'}}
            data={playlists_data}
            renderItem={compact_playlist_component}
            renderFooter={null}
            renderHeader={null}
            keyExtractor={(item, _) => item.title}
            sectionHeaderHeight={30}
            itemHeight={61}
            stickySectionHeadersEnabled={false}
        />
    )
}

const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
    add_all_tracks_button: {
        backgroundColor: colors.primary, 
        width: '100%', 
        height: 40, 
        justifyContent: 'center', 
        alignItems: 'center', 
        flexDirection: 'row', 
        bottom: 20, 
        marginTop: 40
    },
    add_all_tracks_text: {
        fontWeight: '500', 
        fontSize: 18
    }
});