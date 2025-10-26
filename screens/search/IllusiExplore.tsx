import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { CompactPlaylist } from "@illusive/types";
import AlbumList from "@components/AlbumList";
import { GLOBALS } from '@illusive/globals'
import * as Origin from "@origin/index";
import { Prefs } from "@illusive/prefs";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import TrackHorizontalScrolls from "@components/TrackHorizontalScrolls";
import HorizontalRowArtists from '@components/HorizontalRowArtists';
import { Illusive } from '@illusive/illusive';
import { get_most_played_artists, get_unique_artists, should_automatic_refresh } from '@illusive/illusive_utils';
import { push_abortion } from '@origin/utils/orifetch';
import usePTheme from '@hooks/usePTheme';
import { musi_parse_explore } from '@illusive/parsers/musi_parser';
import type { ResponseError } from '@common/types';
import { artist_watch } from '@illusive/artist_watch';
import { json_catch } from '@common/utils/util';
import { call_wtimeout } from '@common/utils/timed_util';
import { SQLNewReleases } from '@illusive/sql/sql_new_releases';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { router } from 'expo-router';
import { shared_values } from '@utils/shared_values';
import HeaderWith from '@components/HeaderWith';
import { SQLArtists } from '@illusive/sql/sql_artists';

type MusiExplore = ReturnType<typeof musi_parse_explore>;
let musi_explore_data: MusiExplore;
export default function IllusiExplore(){
    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    const [new_releases, set_new_releases] = useState<CompactPlaylist[]>(shared_values.cached_new_releases);
    const [is_loading_new_releases, set_is_loading_new_releases] = useState<boolean>(shared_values.cached_new_releases.length === 0);

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
        if(shared_values.cached_new_releases.length !== 0 && refreshed !== true) return [];
        const not_seen_new_releases = await SQLNewReleases.get_not_seen_new_releases();
        shared_values.cached_new_releases = not_seen_new_releases;
        set_new_releases(not_seen_new_releases);
        return not_seen_new_releases;
    }

    useEffect(() => {
        (async() => {
            const yt_music = Illusive.music_service.get('YouTube Music')!;
            if(shared_values.cached_new_releases.length === 0){
                if(yt_music.has_credentials() && should_automatic_refresh(Prefs.get_pref('automatic_new_releases_last_refreshed')) ){
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
            <TouchableOpacity style={{alignSelf: 'flex-end', height: 30}} onPress={() => router.push("/explore/new_releases_grid")}>
                {new_releases.length !== 0 ? <Text style={{color: colors.text, right: 15, fontSize: 20, fontWeight: '800'}}>View All {'->'}</Text> : null}
            </TouchableOpacity>
            <View style={{height: 10}}/>
            <View style={{height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center'}}/>
            <View style={{height: 10}}/>
            {/* <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{"Your Artists"}</Text> */}
            <HeaderWith title='Your Artists' fullpage={() => router.push("/explore/artists_grid")}>
                <HorizontalRowArtists size={80} artists={SQLArtists.sort_compact_artists_by_most_played(get_unique_artists(GLOBALS.global_var.sql_tracks), GLOBALS.global_var.sql_tracks)}/>
            </HeaderWith>
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