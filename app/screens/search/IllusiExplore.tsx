import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { CompactPlaylist } from "../../../lib-origin/Illusive/src/types";
import AlbumList from "../../components/AlbumList";
import { artist_watch } from "../../../lib-origin/Illusive/src/illusi/src/artist_watch";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals'
import * as SQLNewReleases from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_new_releases'
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks'
import * as Origin from "../../../lib-origin/origin/src/index";
import { call_wtimeout, json_catch, milliseconds_of } from "../../../lib-origin/origin/src/utils/util";
import { ResponseError } from "../../../lib-origin/origin/src/utils/types";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { NavigationProp, useIsFocused, useNavigation, useTheme } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { musi_parse_explore } from "../../../lib-origin/Illusive/src/gen/musi_parser";
import TrackHorizontalScrolls from "../../components/TrackHorizontalScrolls";
import HorizontalRowArtists from '../../components/HorizontalRowArtists';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { get_most_played_artists, sort_compact_artists_by_most_played, get_unique_artists } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { push_abortion } from '../../../lib-origin/origin/src/utils/orifetch';

type MusiExplore = ReturnType<typeof musi_parse_explore>;
let cached_new_releases: CompactPlaylist[] = [];
let musi_explore_data: MusiExplore;
export default function IllusiExplore(){
    const { colors } = useTheme() as Prefs.Theme;
    const styles = theme_styles(colors);

    const navigation: NavigationProp<any, any> = useNavigation();

    const [new_releases, set_new_releases] = useState<CompactPlaylist[]>(cached_new_releases);
    const [is_loading_new_releases, set_is_loading_new_releases] = useState<boolean>(cached_new_releases.length === 0);

    const unique_artists = get_unique_artists(GLOBALS.global_var.sql_tracks);
    const is_focused = useIsFocused();

    const [musi_explore, set_musi_explore] = useState<MusiExplore>();

    useEffect(() => {
        (async function() {
            if(musi_explore_data) {
                set_musi_explore(musi_explore_data);
                return;
            }
            const explore = await Origin.Musi.explore();
            if("error" in explore) return;
            musi_explore_data = musi_parse_explore(explore);
            musi_explore_data.top_tracks = await SQLTracks.add_playback_saved_data_to_tracks(musi_explore_data.top_tracks);
            set_musi_explore(musi_explore_data);
        })()
    },[]);

    async function refresh_new_releases(): Promise<(CompactPlaylist|ResponseError)[]|ResponseError|ResponseError>{
        const most_played_artists = get_most_played_artists(GLOBALS.global_var.sql_tracks);
        const new_releases_length = await SQLNewReleases.new_releases_count();
        const new_releases: (CompactPlaylist[]|ResponseError)[]|ResponseError = await artist_watch(most_played_artists).catch(json_catch);
        if("error" in new_releases) return new_releases;
        const filtered_new_releases = (new_releases.filter(r => !("error" in r)) as CompactPlaylist[][]).flat();
        await SQLNewReleases.refresh_new_releases(filtered_new_releases);
        const updated_new_releases_length = await SQLNewReleases.new_releases_count();
        if(updated_new_releases_length - new_releases_length !== 0)
            GLOBALS.global_var.bottom_alert(`Refreshed New Releases (${updated_new_releases_length - new_releases_length})`, "INFO");
        return get_persistant_new_releases(true);
    }

    async function get_persistant_new_releases(refreshed?: boolean){
        if(cached_new_releases.length !== 0 && refreshed !== true) return [];
        const not_seen_new_releases = await SQLNewReleases.get_not_seen_new_releases();
        cached_new_releases = not_seen_new_releases;
        set_new_releases(not_seen_new_releases);
        return not_seen_new_releases;
    }

    useEffect(() => {
        (async() => {
            const yt_music = Illusive.music_service.get('YouTube Music')!;
            if(cached_new_releases.length === 0){
                if(yt_music.has_credentials() &&
                    new Date().getTime() - Prefs.get_pref('automatic_new_releases_last_refreshed').getTime() >= milliseconds_of({days: 1}) 
                    || (new Date().getMinutes() <= 10 && new Date().getTime() - Prefs.get_pref('automatic_new_releases_last_refreshed').getTime() >= milliseconds_of({minutes: 1}))  ){
                        push_abortion(10 * 1000, 1);
                        call_wtimeout(
                            (async() => {
                                const external_new_releases = await yt_music.get_new_releases!();
                                const new_releases_length = await SQLNewReleases.new_releases_count();
                                await SQLNewReleases.insert_all_into_new_releases(external_new_releases);
                                const updated_new_releases_length = await SQLNewReleases.new_releases_count();
                                await Prefs.save_pref('automatic_new_releases_last_refreshed', new Date());
                                if(updated_new_releases_length - new_releases_length !== 0)
                                    GLOBALS.global_var.bottom_alert(`Refreshed New Releases from YTMusic (${updated_new_releases_length - new_releases_length})`, "INFO");
                                await get_persistant_new_releases(true);
                                set_is_loading_new_releases(false);
                            }), 8 * 1000);
                    }
                await get_persistant_new_releases();
                set_is_loading_new_releases(false);
            }
        })();
    }, [is_focused]);

    return (
        <ScrollView>
            <View style={{height: 100}}/>
            <AlbumList second_line_type="ARTIST" is_loading={is_loading_new_releases} refresh={{last_refresh: Prefs.get_pref('new_releases_last_refreshed'), refresh_data: refresh_new_releases}} title="New Releases" else_type="ALBUM" albums={new_releases}/>
            <TouchableOpacity style={{alignSelf: 'flex-end', height: 30}} onPress={() => navigation.navigate("AlbumGridRenderer", {album_data: new_releases})}>
                {new_releases.length !== 0 ? <Text style={{color: colors.text, right: 15, fontSize: 20, fontWeight: '800'}}>View All {'->'}</Text> : null}
            </TouchableOpacity>
            <View style={{height: 10}}/>
            <View style={{height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center'}}/>
            <View style={{height: 10}}/>
            <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{"Your Artists"}</Text>
            <HorizontalRowArtists artists={sort_compact_artists_by_most_played(get_unique_artists(GLOBALS.global_var.sql_tracks), GLOBALS.global_var.sql_tracks)}/>
            <TouchableOpacity style={{alignSelf: 'flex-end', height: 30}} onPress={() => navigation.navigate("ArtistGridRenderer", {artist_data: unique_artists})}>
                {unique_artists.length !== 0 ? <Text style={{color: colors.text, right: 15, fontSize: 20, fontWeight: '800'}}>View All {'->'}</Text> : null}
            </TouchableOpacity>
            <View style={{height: 10}}/>
            <View style={{height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center'}}/>
            <View style={{height: 10}}/>
            {
                musi_explore !== undefined ?
                (
                    <>
                        <Text style={{color: colors.text, fontSize: 30, fontWeight: 'bold', marginLeft: 10, marginTop: 20, marginBottom: 10}}>Top Tracks</Text>
                        <View style={styles.line_long}/>
                        <TrackHorizontalScrolls tracks={musi_explore.top_tracks.slice(0,20)} height={5}/>
                    </>
                ) 
                : null
            }
            <View style={{height: 100}}/>
        </ScrollView>
    )
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    topContainer:{
        flex: 1,
        backgroundColor: colors.background
    },
    line_long:{
        width: "100%",
        height: 0.8,
        opacity: 0.1,
        backgroundColor: colors.text,
    },
    wrapper:{
        alignItems: 'center',
        zIndex: 100
    },
    searchinput:{
        color: '#F0F0F0',
        backgroundColor: colors.searchInput,
        padding: 15,
        top: 70,
        borderRadius: 30,
        width: '90%',
    },
    headerText:{
        color: colors.text,
        fontSize: 24,
        fontWeight: 'bold'
    },
    genres:{
        backgroundColor: colors.subtext,
        width: '100%',
        height: 50,
        justifyContent: 'center',
    }
});