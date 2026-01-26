import type { IllusiveURI, MusicServiceArtist, Track } from "@illusive/types";
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import AlbumList from "@components/AlbumList";
import TrackHorizontalScrolls from "@components/TrackHorizontalScrolls";
import LatestRelease from "@components/LatestRelease";
import { useEffect, useState } from "react";
import { best_thumbnail, music_service_uri_to_music_service, split_uri, tracks_with_artist } from "@illusive/illusive_utils";
import { GLOBALS } from '@illusive/globals';
import { Illusive } from "@illusive/illusive";
import { is_empty, json_catch } from "@common/utils/util";
import { alert_error } from "@illusive/illusi/src/alert";
import HeaderWith from "@components/HeaderWith";
import HorizontalRowArtists from "@components/HorizontalRowArtists";
import { SQLTracks } from '@illusive/sql/sql_tracks';
import { AntDesignTouchableOpacity, IoniconsTouchableOpacity } from "@components/TouchableIconOpacity";
import IImage from "@components/IImage";
import usePTheme from "@hooks/usePTheme";
import type { ResponseError } from "@common/types";
import { router, useLocalSearchParams } from "expo-router";
import { remove_topic } from "@common/utils/clean_util";
import { SQLArtists } from "@illusive/sql/sql_artists";
import { reinterpret_cast } from "@common/cast";
import { Constants } from "@illusive/constants";

export default function Artist(){
    const { uri } = useLocalSearchParams<{uri: IllusiveURI}>();
    const { colors } = usePTheme();
    
    const [artist_data, set_artist_data] = useState<MusicServiceArtist>({
        name: SQLArtists.artists_memo[uri]?.name ?? "",
        albums: [],
        singles_eps: [],
        playlists: [],
        similar_artists: [],
        tracks: [],
        background_artwork_url: '',
        profile_artwork_url: SQLArtists.artists_memo[uri]?.artwork_url ?? "",
        latest_release: undefined
    });
    const [watch, set_watch] = useState<boolean>(false);

    useEffect(() => {
        initial_data();
    }, []);

    function close(){
        router.back();
    }

    async function load_extra_data(){
        
    }

    async function initial_data(){
        const cached = GLOBALS.global_var.artist_cache.get(uri);
        const cached_hit = cached !== undefined;
        if(cached_hit){
            set_artist_data(cached.artist_data);
            return;
        }
        const split = split_uri(uri);
        if(Illusive.music_service.get( music_service_uri_to_music_service(split[0]))?.get_artist === undefined ) {
            GLOBALS.global_var.bottom_alert(`Service Artist doesn't support: ${split[0]}`, "WARN");
            close();
            return;
        }
        const artist: MusicServiceArtist|ResponseError = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_artist!(split[1]).catch(json_catch);
        if("error" in artist) {
            alert_error(reinterpret_cast<ResponseError>(artist));
            close();
            return;
        }
        artist.tracks = SQLTracks.add_playback_saved_data_to_tracks(artist.tracks);

        set_artist_data(artist);
        GLOBALS.global_var.artist_cache.add(uri, {artist_data: artist});
    }

    async function on_watch_unwatch(){

    }

    async function play_artist(){
        const play_tracks = artist_data.tracks;
        const cloned_tracks = Illusive.shuffle_tracks("SHUFFLE", [...play_tracks]);
        GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, artist_data.name);
    }

    const shared_tracks: Track[] = tracks_with_artist(GLOBALS.global_var.sql_tracks, artist_data.name)
        .map(track => ({
            ...track, downloading_data: {...track.downloading_data!, saved: true}  
        }));

    const popular_tracks = uri.includes(Constants.import_uri_id) ? 
        artist_data.tracks
            .filter(track => track.meta?.plays)
            .sort((a, b) => (b.meta?.plays ?? 0) - (a.meta?.plays ?? 0))
    : artist_data.tracks
        .filter(track => track.plays)
        .sort((a, b) => (b.plays ?? 0) - (a.plays ?? 0));

    const background_image_url_possibilities = [
        artist_data.profile_artwork_url,
        artist_data.background_artwork_url,
        artist_data.albums?.[0]?.artwork_url,
        artist_data.singles_eps?.[0]?.artwork_url,
        best_thumbnail(artist_data.albums?.[0]?.artwork_thumbnails)?.url,
        best_thumbnail(artist_data.singles_eps?.[0]?.artwork_thumbnails)?.url,
        artist_data.tracks?.[0]?.artwork_url
    ];

    const background_image_url = background_image_url_possibilities.find(url => !is_empty(url))

    return (
        <>
            <View style={{position: 'absolute', top: 60, marginHorizontal: 20, zIndex: 2, flexDirection: 'row', justifyContent: 'space-between'}} pointerEvents='box-none'>
                <AntDesignTouchableOpacity on_press={close} style={{}} icon_name='left' icon_size={30} icon_color={colors.primary} icon_style={{}}/>
            </View>
            <ScrollView bounces={false}>
                <View style={{width: '100%', height: 300}}>
                    <IImage fade={{percent: '20%'}} source={background_image_url} height={300} style={{height: 300, resizeMode: 'cover', width: '100%'}}/>
                    <Text style={{position: 'absolute', bottom: 0, fontSize: 40, fontWeight: 'bold', paddingLeft: 20, color: colors.text}}>{remove_topic(artist_data.name)}</Text>
                    <Text style={{position: 'absolute', bottom: -13, fontSize: 15, fontWeight: 'light', paddingLeft: 20, color: colors.subtext}}>{artist_data.tracks.length === 100 ? "100+": artist_data.tracks.length} Tracks • {artist_data.albums.length} Albums • {artist_data.singles_eps.length} Singles/EPs</Text>
                </View>
                <View style={{paddingTop: split_uri(uri)[0] !== "illusi" ? 30 : 0}}/>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20}}>
                    {split_uri(uri)[0] !== "illusi" ?  <TouchableOpacity onPress={on_watch_unwatch} style={{borderRadius: 40, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center', padding: 10, paddingHorizontal: 18}}>
                        <Text style={{color: colors.background, fontSize: 15, fontWeight: '500'}}>
                            {watch ? "Unwatch" : "Watch"}
                        </Text>
                    </TouchableOpacity> : <View/>}
                    <IoniconsTouchableOpacity icon_name="play-circle-sharp"
                        icon_color={colors.primary}
                        icon_size={60}
                        on_press={play_artist}/>
                </View>
                {artist_data?.latest_release ? 
                    <>
                        <View style={{height: 15}}/>
                        <LatestRelease album_data={artist_data?.latest_release}/>
                        <View style={{paddingVertical: 5}}/>
                    </>
                : null }
                <TrackHorizontalScrolls title="Popular Tracks" height={4} tracks={popular_tracks} replace_album_with="plays"/>
                <TrackHorizontalScrolls title="Tracks" height={4} tracks={artist_data.tracks}/>
                <View style={{paddingTop: 5}}/>
                { 
                    artist_data.albums.length > 0 ? 
                    <AlbumList title="Albums" else_type={"ALBUM"} albums={artist_data.albums}/> : null
                }
                <View style={{paddingTop: 5}}/>
                {
                    artist_data.singles_eps.length > 0 ? 
                    <AlbumList title="Singles & EPs" else_type={"SINGLE"} albums={artist_data.singles_eps}/> : null
                }
                {
                    artist_data.appears_on !== undefined && artist_data.appears_on.length > 0 ? 
                    <AlbumList title="Appears On" else_type={"SINGLE"} albums={artist_data.appears_on}/> : null
                }
                {
                    artist_data.playlists.length > 0 ? 
                    <AlbumList title="Playlists" else_type={"SINGLE"} albums={artist_data.playlists}/> : null
                }
                <View style={{paddingTop: 20}}/>
                <TrackHorizontalScrolls title="From Your Library" height={5} tracks={shared_tracks}/>
                <View style={{paddingVertical: 10}}/>
                {
                    artist_data.similar_artists.length > 0 ? 
                    <HeaderWith title={"Similar Artists"}>
                        <HorizontalRowArtists artists={artist_data.similar_artists}/>
                    </HeaderWith>
                    : null
                }
                <View style={{paddingVertical: 30}}/>
            </ScrollView>
        </>
    )
}