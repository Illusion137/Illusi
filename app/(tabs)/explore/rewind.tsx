import { days_of, hours_of, is_empty, minutes_of, round_decimal_place, seconds_of } from "@common/utils/util";
import HorizontalRowArtists from "@components/HorizontalRowArtists";
import IImage from "@components/IImage";
import { AntDesignTouchableOpacity } from "@components/TouchableIconOpacity";
import TrackComponent from "@components/TrackComponent";
import TrackHorizontalScrolls from "@components/TrackHorizontalScrolls";
import usePTheme from "@hooks/usePTheme";
import { Constants } from "@illusive/constants";
import { GLOBALS } from "@illusive/globals";
import { ExampleObj } from "@illusive/example_objs";
import { get_unique_artists, sum } from "@illusive/illusive_utils";
import { SQLArtists } from "@illusive/sql/sql_artists";
import type { Track } from "@illusive/types";
import { get_common_styles } from "@utils/common_styles";
import { router } from "expo-router";
import { useRef } from "react";
import { Text, View } from "react-native";
import Swiper from "react-native-swiper";
import { SQLPlaylists } from "@illusive/sql/sql_playlists";

function played_this_year(track: Track){
    const this_year = new Date().getFullYear();
    return (track.meta?.plays ?? 0) > 0 && this_year == new Date(track.meta?.last_played_date ?? 0).getFullYear();
}
function get_tracks_played_this_year(){
    return GLOBALS.global_var.sql_tracks.filter(played_this_year);
}

function RewindTrack(props: {track: Track}){
    return <TrackComponent track_data={props.track}/>
    return (<></>);
}
function RewindLargeTrack(props: {track: Track}){
    return <TrackComponent track_data={props.track}/>
}
function TrackList(props: {tracks: Track[]}){
    return <TrackHorizontalScrolls tracks={props.tracks} height={100} title="10"/>
}
function ArtistList(props: {tracks: Track[]}){
    return (<></>);
}
function AlbumList(props: {tracks: Track[]}){
    return (<></>);
}

function RewindPage(props: {children?: React.ReactNode}){
    return (
        <View style={{width: '100%', height: '100%', padding: 50}}>
            {props.children}
        </View>
    );
}

const one_day_seconds = seconds_of({days: 1});
function RewindMinutesPlayedPage(props: {tracks: Track[]}){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    const seconds_played = sum(props.tracks.map(track => track.duration * (track.meta?.plays ?? 0)));
    const minutes_played = Math.ceil(minutes_of({seconds: seconds_played}));
    const hours_played = Math.ceil(hours_of({seconds: seconds_played}));
    const days_played = round_decimal_place(days_of({seconds: seconds_played}), 2);

    const track_seconds_played = Math.max(...props.tracks.map(track => track.duration * (track.meta?.plays ?? 0)));
    const track_minutes_played = Math.ceil(minutes_of({seconds: track_seconds_played}));

    return (
        <RewindPage>
            <Text style={{...common_styles.text}}>You listened to {minutes_played} minutes of music this year!</Text>
            <Text style={{...common_styles.text}}>That is {hours_played} hours straight of music.</Text>
            <Text style={{...common_styles.text}}>That is {days_played} days straight of music.</Text>
            <Text style={{...common_styles.text}}>The track you listened to for the longest time was for {track_minutes_played} minutes.</Text>
        </RewindPage>
    );
}
function RewindMinutesPlayedSingleTrackPage(props: {tracks: Track[]}){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    const track_seconds_played = Math.max(...props.tracks.map(track => track.duration * (track.meta?.plays ?? 0)));
    const longest_played_track = props.tracks.find(track => track.duration * (track.meta?.plays ?? 0) == track_seconds_played);
    const track_minutes_played = Math.ceil(minutes_of({seconds: track_seconds_played}));

    return (
        <RewindPage>
            <Text style={{...common_styles.text}}>The track that you listened to for {track_minutes_played} minutes was...</Text>
            <RewindLargeTrack track={longest_played_track ?? ExampleObj.track_example0}/>
        </RewindPage>
    );
}
function RewindLongestPlayedTracksPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    const tracks = useRef(get_tracks_played_this_year());
    const sorted_tracks = useRef(SQLPlaylists.sort_playlist_tracks("LONGEST_PLAYED_HILOW", tracks.current));
    return (
        <RewindPage>
            <Text style={{...common_styles.text}}></Text>
            <TrackList tracks={tracks.current}/>
        </RewindPage>
    );
}
function RewindMostPlayedTracksPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    const tracks = useRef(get_tracks_played_this_year());
    const sorted_tracks = useRef(SQLPlaylists.sort_playlist_tracks("PLAYS_HILOW", tracks.current));
    return (
        <RewindPage>
            <TrackList tracks={tracks.current}/>
        </RewindPage>
    );
}
function RewindMostPlayedImportedTracksPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    const imported_tracks = useRef(get_tracks_played_this_year().filter(track => !is_empty(track.imported_id)));
    const sorted_imported_tracks = useRef(SQLPlaylists.sort_playlist_tracks("PLAYS_HILOW", imported_tracks.current));
    return (
        <RewindPage>
            <TrackList tracks={sorted_imported_tracks.current}/>
        </RewindPage>
    );
}
function RewindMostPlayedArtistsPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);
    const artists = useRef(SQLArtists.sort_compact_artists_by_most_played(get_unique_artists(get_tracks_played_this_year()), get_tracks_played_this_year()));

    return (
        <RewindPage>
            <HorizontalRowArtists size={80} artists={artists.current}/>
        </RewindPage>
    );
}
function RewindMostPlayedAlbumsPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    return (
        <RewindPage>

        </RewindPage>
    );
}
function RewindFirstLastTrackPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    return (
        <RewindPage>

        </RewindPage>
    );
}
function RewindRecapPage(){
    const { colors } = usePTheme();
    const common_styles = get_common_styles(colors);

    return (
        <RewindPage>

        </RewindPage>
    );
}

export default function RewindScreen(){
    const { colors } = usePTheme();

    function close(){
        if(!router.canGoBack()) return;
        router.back();
    }

    const imported_tracks_length = get_tracks_played_this_year().filter(track => !is_empty(track.imported_id)).length;
    const tracks = useRef(get_tracks_played_this_year());

    return (
        <View style={{flex: 1}}>
            <View style={{height: 80}}/>
            <View style={{position: 'absolute', flexDirection: 'row', width: '100%', top: 80, paddingHorizontal: 20, justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, zIndex: 10}}>
                <AntDesignTouchableOpacity on_press={close} style={{}} icon_name='left' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
                <IImage source={Constants.icon_transparent_index} style={{width: 30, height: 30, left: 50}}/>
                <Text style={{color: colors.text, fontWeight: 'bold', right: 15}}>Illusi Rewind {new Date().getFullYear()}</Text>
            </View>
            <Swiper horizontal={false} showsButtons={false} showsPagination={true} loop={false} dotStyle={{backgroundColor: colors.text}} activeDotStyle={{backgroundColor: colors.primary}}>
                <RewindMinutesPlayedPage tracks={tracks.current}/>
                <RewindMinutesPlayedSingleTrackPage tracks={tracks.current}/>
                {/* <RewindLongestPlayedTracksPage/>
                <RewindMostPlayedTracksPage/>
                {imported_tracks_length >= 6 ? <RewindMostPlayedImportedTracksPage/> : null}
                <RewindMostPlayedArtistsPage/>
                <RewindMostPlayedAlbumsPage/>
                <RewindFirstLastTrackPage/> */}
                <RewindRecapPage/>
            </Swiper>
        </View>
    );
}