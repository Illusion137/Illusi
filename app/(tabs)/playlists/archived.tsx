import { Button, Text, View } from "react-native";
import usePTheme from "@hooks/usePTheme";
import BigList from "react-native-big-list";
import type { Playlist } from "@illusive/types";
import { Prefs } from "@illusive/prefs";
import PlaylistComponent from "@components/PlaylistComponent";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { sort_playlists } from "@illusive/playlist_utils";
import { playlist_query_filter } from "@illusive/illusive_utils";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";
import { useIsFocused } from "@react-navigation/native";

let last_playlists_count = 0;
export default function ArchivedPlaylists(){
    const { query } = useLocalSearchParams<{query: string}>();
    const { colors } = usePTheme();

    const is_focused = useIsFocused();
    
    const [playlists_state, set_playlists] = useState<Playlist[]>([]);

    const sorted_queried_playlists = sort_playlists(
        playlist_query_filter(
            playlists_state.filter((playlist) => playlist.archived),
            query
        )
    );

    useEffect(() => {
        refresh_data(undefined, is_focused);
    }, [is_focused]);

    async function refresh_data(update_with?: Playlist, force_update?: boolean) {
        try {
            if (update_with) {
                const new_playlist_state = [...playlists_state];
                const update_index = playlists_state.findIndex((playlist) => update_with.uuid === playlist.uuid);
                new_playlist_state[update_index] = update_with;
                set_playlists(new_playlist_state);
            }
            const new_last_playlists_count = await SQLPlaylists.playlists_count();
            if (last_playlists_count !== new_last_playlists_count || force_update) {
                last_playlists_count = new_last_playlists_count;
                SQLPlaylists.all_playlists_data().then((playlists) => set_playlists(playlists));
            }
        } catch (error) {}
    }

    const render_item = (item: {item: Playlist}) => (
        <PlaylistComponent refresh_data={() => {}} playlist_data={item.item} compact={Prefs.get_pref('compact_playlists')}/>
    );

    const render_footer = () => (
        <View style={{padding: 10}}>
            <Text style={{color: colors.subtext}}>Note: Archived-Playlists don't have "Playlists Inheritance Preview" to help speed up Illusi.</Text>
            <View style={{height: 200}}/>
        </View>
    )

    function hide(){
        if(!router.canDismiss()) return;
        router.dismiss();
    }

    return (
        <View style={{flex: 1, backgroundColor: colors.background}}>
            <View style={{flexDirection: 'row', alignItems: 'center', height: 55, width: '100%', backgroundColor: colors.shelf, borderTopLeftRadius: 15, borderTopRightRadius: 15, borderColor: colors.deeptext, borderWidth: 1}}>
                <View style={{marginLeft:10}}></View>
                    <Button title='Hide' color={colors.primary} onPress={hide}></Button>
                <View style={{marginRight:60}}></View>
                <Text style={{color: colors.text, fontWeight:'500', fontSize: 18, alignSelf: 'center'}}>Archived Playlists</Text>
            </View>
            <View style={{height: 0.6, backgroundColor: colors.line}}/>
            <BigList style={{height: '70%'}} data={sorted_queried_playlists} keyExtractor={(item, _) => String(item.uuid)} itemHeight={Prefs.get_pref('compact_playlists') ? 56 : 81} headerHeight={0} footerHeight={500} renderItem={render_item} renderHeader={() => (<></>)} renderFooter={render_footer}/>
        </View>
    )
}