import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { CompactPlaylist, IllusiveURI } from "../../../lib-origin/Illusive/src/types";
import AlbumList from "../../components/AlbumList";
import { artist_watch } from "../../../lib-origin/Illusive/src/illusi/src/artist_watch";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals'
import * as SQLNewReleases from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_new_releases'
import { is_empty, json_catch } from "../../../lib-origin/origin/src/utils/util";
import { ResponseError } from "../../../lib-origin/origin/src/utils/types";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { NavigationProp, useIsFocused, useNavigation, useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";

let cached_new_releases: CompactPlaylist[] = [];
export default function IllusiExplore(){
    const { colors } = useTheme() as Prefs.Theme;

    const navigation: NavigationProp<any, any> = useNavigation();

    const [new_releases, set_new_releases] = useState<CompactPlaylist[]>(cached_new_releases);

    const is_focused = useIsFocused();

    async function refresh_new_releases(): Promise<(CompactPlaylist|ResponseError)[]|ResponseError|ResponseError>{
        const seen_artists = new Set<IllusiveURI>();
        const most_played_artists = GLOBALS.global_var.sql_tracks
            .filter(track => !is_empty(track.artists[0].uri))
            .sort((a, b) => b.meta!.plays - a.meta!.plays)
            .filter(track => {
                if(seen_artists.has(track.artists[0].uri!)) return false;
                seen_artists.add(track.artists[0].uri!)
                return true;
            })
            .map(track => track.artists[0])
            .slice(0, Prefs.get_pref('new_releases_amount'));
        const new_releases: (CompactPlaylist[]|ResponseError)[]|ResponseError = await artist_watch(most_played_artists).catch(json_catch);
        if("error" in new_releases) return new_releases;
        const filtered_new_releases = (new_releases.filter(r => !("error" in r)) as CompactPlaylist[][]).flat();
        await SQLNewReleases.refresh_new_releases(filtered_new_releases);
        return get_persistant_new_releases();
    }

    async function get_persistant_new_releases(){
        const not_seen_new_releases = await SQLNewReleases.get_not_seen_new_releases(
            Prefs.get_pref('new_releases_days_before_seen') * 1000 * 60 * 60 * 24);
        cached_new_releases = not_seen_new_releases;
        set_new_releases(not_seen_new_releases);
        return not_seen_new_releases;
    }

    useEffect(() => {
        get_persistant_new_releases();
    }, [is_focused]);

    return (
        <ScrollView>
            <View style={{height: 100}}/>
            <AlbumList second_line_type="ARTIST" refresh={{last_refresh: Prefs.get_pref('new_releases_last_refreshed'), refresh_data: refresh_new_releases}} title="New Releases" else_type="ALBUM" albums={new_releases}/>
            <TouchableOpacity style={{alignSelf: 'flex-end'}} onPress={() => navigation.navigate("AlbumGridRenderer", {album_data: new_releases})}>
                <Text style={{color: colors.text, right: 15, fontSize: 20, fontWeight: '800'}}>View All {'->'}</Text>
            </TouchableOpacity>
            <View style={{height: 100}}/>
        </ScrollView>
    )
}