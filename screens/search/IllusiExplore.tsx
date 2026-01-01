import { ScrollView, View } from 'react-native';
import type { CompactPlaylist, Track } from "@illusive/types";
import AlbumList from "@components/AlbumList";
import { GLOBALS } from '@illusive/globals'
import { Prefs } from "@illusive/prefs";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import TrackHorizontalScrolls from "@components/TrackHorizontalScrolls";
import HorizontalRowArtists from '@components/HorizontalRowArtists';
import { Illusive } from '@illusive/illusive';
import { get_most_played_artists, get_unique_artists, should_automatic_refresh } from '@illusive/illusive_utils';
import usePTheme from '@hooks/usePTheme';
import type { ResponseError } from '@common/types';
import { artist_watch } from '@illusive/artist_watch';
import { json_catch, milliseconds_of } from '@common/utils/util';
import { call_wtimeout } from '@common/utils/timed_util';
import { SQLNewReleases } from '@illusive/sql/sql_new_releases';
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { shared_values } from '@utils/shared_values';
import HeaderWith from '@components/HeaderWith';
import { SQLArtists } from '@illusive/sql/sql_artists';
import IllusiRewindComponent from '@components/IllusiRewindComponent';
import { FutsalShuffle } from '@illusive/futsal_shuffle';
import { SQLfs } from '@illusive/sql/sql_fs';
import { reinterpret_cast } from '@common/cast';
import { SharedRouter } from '@utils/shared_routes';
import { ExploreLocalData } from '@illusive/explore_local_data';

const youtube_music_top_tracks_playlist_url = "PL4fGSI1pDJn6O1LS0XSdF3RyO0Rq_LDeI";
const top_tracks_slice = 50;
const forgotten_favorites_slice = 50;
const top_tracks_cache: Track[]|undefined = undefined;

const rewind_date = new Date();
rewind_date.setMonth(10);
rewind_date.setDate(28);
const rewind_date_ms = rewind_date.getTime();
const time_till_rewind_time = Date.now() - rewind_date_ms;
const should_show_rewind =  time_till_rewind_time > 0 && Date.now() <= rewind_date_ms + milliseconds_of({months: 1});
export default function IllusiExplore(){
    const { colors } = usePTheme();

    const [new_releases, set_new_releases] = useState<CompactPlaylist[]>(shared_values.cached_new_releases);
    const [is_loading_new_releases, set_is_loading_new_releases] = useState<boolean>(shared_values.cached_new_releases.length === 0);

    const is_focused = useIsFocused();
    
    const your_artists_ref = useRef(SQLArtists.sort_compact_artists_by_most_played(get_unique_artists(GLOBALS.global_var.sql_tracks), GLOBALS.global_var.sql_tracks));
    const [forgotten_favorites, set_forgotten_favorites] = useState<CompactPlaylist[]>([]);
    const [top_tracks, set_top_tracks] = useState<Track[]>([]);

    function get_forgotten_favorites(): CompactPlaylist[]{
        const max_plays = GLOBALS.global_var.sql_tracks.filter(track => (track.meta?.plays ?? 0) > 0).map(track => track.meta?.plays ?? 0).sort((a, b) => b - a)?.[0] ?? 0;
        const okay_amount_of_plays = max_plays * 0.15;
        if(okay_amount_of_plays === 0) return [];
        const potential_tracks = GLOBALS.global_var.sql_tracks.filter(track => {
            if((track.meta?.plays ?? 0) < okay_amount_of_plays) return false;
            const last_played = new Date(track.meta?.last_played_date ?? 0).getTime();
            if(last_played === 0) return false;
            return Date.now() - last_played >= milliseconds_of({months: 1});
        });
        if(potential_tracks.length === 0) return [];
        const potential_weighted_tracks = potential_tracks.map(track => ({weight: track.meta?.plays ?? 0, value: track})).slice(0, forgotten_favorites_slice * 3);
        const shuffle_weighted_tracks = FutsalShuffle.shuffle_weighted(potential_weighted_tracks);
        return shuffle_weighted_tracks.slice(0, forgotten_favorites_slice).map(track => ({
            title: {name: track.title, uri: null},
            artist: track.artists,
            album_type: "SONG",
            artwork_url: reinterpret_cast<string>(Illusive.get_track_artwork(SQLfs.document_directory(), track)),
            explicit: track.explicit,
            song_track: track,
            type: "ALBUM",
        }));
    }

    useEffect(() => {
        (async function() {
            set_forgotten_favorites(get_forgotten_favorites());
            if(top_tracks.length > 0) return;
            if(top_tracks_cache && top_tracks_cache.length > 0){
                set_top_tracks(top_tracks_cache);
                return;
            }
            else if(top_tracks_cache){
                return;
            }
            try {
                const playlist = await Illusive.music_service.get("YouTube Music")!.get_playlist(youtube_music_top_tracks_playlist_url, {
                    cache_opts: {
                        cache_ms: milliseconds_of({days: 1}),
                        cache_on: "url",
                        cache_mode: "file",
                        cache_ms_fail: 0
                    }
                });
                if("error" in playlist) return;
                playlist.tracks = SQLTracks.add_playback_saved_data_to_tracks(playlist.tracks);
                set_top_tracks(playlist.tracks);
            } catch (error) {
                console.warn(error);
            }
        })()
    },[]);

    function alert_new_releases(new_releases_length: number, updated_new_releases_length: number, old_persistant: CompactPlaylist[], new_persistant: CompactPlaylist[]){
        if(updated_new_releases_length - new_releases_length !== 0){
            const total_added = updated_new_releases_length - new_releases_length;
            const total_new = new_persistant.length - old_persistant.length;
            const hidden = total_added - total_new;
            GLOBALS.global_var.bottom_alert(`Refreshed New Releases From YTMusic`, "INFO", `${total_new} Added, ${hidden} Hidden`);
        }
    }

    async function refresh_new_releases(): Promise<(CompactPlaylist|ResponseError)[]|ResponseError>{
        const most_played_artists = get_most_played_artists(GLOBALS.global_var.sql_tracks);
        const new_releases_length = await SQLNewReleases.new_releases_count();
        const old_persistant = await get_persistant_new_releases(true);
        const artist_watch_new_releases: (CompactPlaylist[]|ResponseError)[]|ResponseError = await artist_watch(most_played_artists).catch(json_catch);
        if("error" in artist_watch_new_releases) return artist_watch_new_releases;
        const filtered_new_releases = (artist_watch_new_releases.filter(r => !("error" in r)) as CompactPlaylist[][]).flat();
        await SQLNewReleases.refresh_new_releases(filtered_new_releases);
        const updated_new_releases_length = await SQLNewReleases.new_releases_count();
        const persistant = await get_persistant_new_releases(true);
        alert_new_releases(new_releases_length, updated_new_releases_length, old_persistant, persistant);
        return persistant;
    }

    async function get_persistant_new_releases(refreshed?: boolean){
        if(shared_values.cached_new_releases.length !== 0 && refreshed !== true) return [];
        const not_seen_new_releases = await SQLNewReleases.get_not_seen_new_releases();
        shared_values.cached_new_releases = not_seen_new_releases;
        set_new_releases(not_seen_new_releases);
        return not_seen_new_releases;
    }

    async function refresh_ytmusic_new_releases(){
        const yt_music = Illusive.music_service.get('YouTube Music')!;
        const old_persistant = await get_persistant_new_releases(true);
        const external_new_releases = await yt_music.get_new_releases!();
        const new_releases_length = await SQLNewReleases.new_releases_count();
        await SQLNewReleases.insert_all_into_new_releases(external_new_releases);
        const updated_new_releases_length = await SQLNewReleases.new_releases_count();
        await Prefs.save_pref('automatic_new_releases_last_refreshed', new Date());
        const persistant = await get_persistant_new_releases(true);
        alert_new_releases(new_releases_length, updated_new_releases_length, old_persistant, persistant);
        set_is_loading_new_releases(false);
    }

    useEffect(() => {
        (async() => {
            const yt_music = Illusive.music_service.get('YouTube Music')!;
            if(shared_values.cached_new_releases.length !== 0) return;
            const should_refresh_ytmusic_new_releases = yt_music.has_credentials() && should_automatic_refresh(Prefs.get_pref('automatic_new_releases_last_refreshed')) ;
            if(should_refresh_ytmusic_new_releases){
                // TODO < fix this abortion with rozfetch > ??
                // push_abortion(milliseconds_of({seconds: 10}), 1);
                call_wtimeout(refresh_ytmusic_new_releases, milliseconds_of({seconds: 8}));
            }
            await get_persistant_new_releases();
            set_is_loading_new_releases(false);
        })();
    }, [is_focused]);

    return (
        <ScrollView>
            <View style={{height: 100}}/>
            <AlbumList second_line_type="ARTIST" is_loading={is_loading_new_releases} refresh={{last_refresh: Prefs.get_pref('new_releases_last_refreshed'), refresh_data: refresh_new_releases}} title="New Releases" else_type="ALBUM" albums={new_releases}/>
            <View style={{height: 10}}/>
            <View style={{height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center'}}/>
            {should_show_rewind ? <IllusiRewindComponent/> : null}
            <View style={{height: 10}}/>
            {/* <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold', left: 15}}>{"Your Artists"}</Text> */}
            <HeaderWith title='Your Artists' fullpage={() => SharedRouter.goto_shared_artist_grid('Your Artists', your_artists_ref.current)}>
                <HorizontalRowArtists size={80} artists={your_artists_ref.current}/>
            </HeaderWith>
            <View style={{height: 10}}/>
            <View style={{height: 1, width: '95%', backgroundColor: colors.line, alignSelf: 'center'}}/>
            {
                top_tracks.length > 0 ?
                <>
                    <TrackHorizontalScrolls title={`Top ${Math.min(top_tracks.length, top_tracks_slice)} Tracks`} tracks={top_tracks.slice(0,top_tracks_slice)} height={5}/>
                </>
                : null
            }
            <AlbumList title='Illusi Playlists' second_line_type='ARTIST' else_type='ALBUM' albums={[ExploreLocalData.christmas_playlist]}/>
            {
                forgotten_favorites.length > 0 ?
                <>
                    <AlbumList title='Forgotten Favorites' second_line_type='ARTIST' else_type='SINGLE' albums={forgotten_favorites}/>
                </>
                : null
            }
            <View style={{height: 100}}/>
        </ScrollView>
    )
}