import { IllusiveURI, MusicServiceArtist, Route, Track } from "../../../lib-origin/Illusive/src/types";
import { Image, ImageBackground, ScrollView, Text, View } from "react-native";
import AlbumList from "../../components/AlbumList";
import TrackHorizontalScrolls from "../../components/TrackHorizontalScrolls";
import { NavigationProp, useNavigation, useTheme } from "@react-navigation/native";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import LatestRelease from "../../components/LatestRelease";
import { useEffect, useState } from "react";
import { music_service_uri_to_music_service, split_uri, tracks_with_artist } from "../../../lib-origin/Illusive/src/illusive_utilts";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { ResponseError } from "../../../lib-origin/origin/src/utils/types";
import { Illusive } from "../../../lib-origin/Illusive/src/illusive";
import { is_empty, json_catch, remove_topic } from "../../../lib-origin/origin/src/utils/util";
import { alert_error } from "../../../lib-origin/Illusive/src/illusi/src/alert";
import HeaderWith from "../../components/HeaderWith";
import HorizontalRowArtists from "../../components/HorizontalRowArtists";
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import { AntDesignTouchableOpacity } from "../../components/TouchableIconOpacity";

export default function Artist(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{uri: IllusiveURI}>;

    const { colors } = useTheme() as Prefs.Theme;
    
    const navigation: NavigationProp<any, any> = useNavigation();

    const [artist_data, set_artist_data] = useState<MusicServiceArtist>({
        name: '',
        albums: [],
        singles_eps: [],
        playlists: [],
        similar_artists: [],
        tracks: [],
        background_artwork_url: '',
        profile_artwork_url: '',
        latest_release: undefined
    });

    useEffect(() => {
        initial_data();
    }, []);

    async function initial_data(){
        const cached = GLOBALS.global_var.artist_cache.get(ts_route.params.uri);
        const cached_hit = cached !== undefined;
        if(cached_hit){
            set_artist_data(cached!.artist_data);
            return;
        }
        const split = split_uri(ts_route.params.uri);
        if(Illusive.music_service.get( music_service_uri_to_music_service(split[0]))?.get_artist === undefined ) {
            GLOBALS.global_var.bottom_alert(`Service Artist doesn't support: ${split[0]}`, "WARN");
            navigation.goBack();
            return;
        }
        const artist: MusicServiceArtist|ResponseError = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_artist!(split[1]).catch(json_catch);
        if("error" in artist!) {
            alert_error(artist as any , true);
            return;
        }
        artist.tracks = await SQLTracks.add_playback_saved_data_to_tracks(artist.tracks);

        set_artist_data(artist);
        GLOBALS.global_var.artist_cache.add(ts_route.params.uri, {artist_data: artist});
    }

    const shared_tracks: Track[] = tracks_with_artist(GLOBALS.global_var.sql_tracks, artist_data.name)
        .map(track => ({
            ...track, downloading_data: {...track.downloading_data!, saved: true}  
        }));

    return (
        <>
            <View style={{position: 'absolute', top: 60, marginHorizontal: 20, zIndex: 2, flexDirection: 'row', justifyContent: 'space-between'}} pointerEvents='box-none'>
                <AntDesignTouchableOpacity on_press={() => navigation.goBack()} style={{}} icon_name='left' icon_size={30} icon_color={colors.primary} icon_style={{}}/>
            </View>
            <ScrollView>
                { !is_empty(artist_data.background_artwork_url) ? 
                <ImageBackground blurRadius={10} source={{uri: artist_data.background_artwork_url, scale: 0.3}} style={{height: 170, flexDirection: 'row', alignItems: 'flex-end'}}>
                    {!is_empty(artist_data.profile_artwork_url) ? <Image source={{uri: artist_data.profile_artwork_url}} style={{borderRadius: 100, width: 80, height: 80, bottom: 20, left: 30}}/> : null}
                    <Text style={{color: colors.text, fontSize: 40, fontWeight: '500', bottom: 30, paddingLeft: 50, textShadowColor: 'rgb(0, 0, 0)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 3}}>{remove_topic(artist_data.name)}</Text>
                </ImageBackground> : 
                <View style={{height: 170, top: 40, flexDirection: 'row', alignItems: 'flex-end'}}>
                    {!is_empty(artist_data.profile_artwork_url) ? <Image source={{uri: artist_data.profile_artwork_url}} style={{borderRadius: 100, width: 80, height: 80, bottom: 20, left: 30}}/> : null}
                    <Text style={{color: colors.text, fontSize: 40, fontWeight: '500', bottom: 30, paddingLeft: 50, textShadowColor: 'rgb(0, 0, 0)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 3}}>{remove_topic(artist_data.name)}</Text>
                </View>
                }
                <View style={{paddingTop: 40}}/>
                {artist_data?.latest_release ? <LatestRelease album_data={artist_data?.latest_release}/> : null }
                <View style={{paddingVertical: 10}}/>
                {
                    artist_data.tracks.length > 0 ? 
                    <HeaderWith title={"Tracks"}>        
                        <TrackHorizontalScrolls height={4} tracks={artist_data.tracks}/>
                    </HeaderWith> : null
                }
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
                {
                    shared_tracks.length > 0 ? 
                        <HeaderWith title={"From Your Library"}>
                            <TrackHorizontalScrolls height={4} tracks={shared_tracks}/>
                        </HeaderWith>
                    : null
                }
                <View style={{paddingVertical: 10}}/>
                {
                    artist_data.similar_artists.length > 0 ? 
                    <HeaderWith title={"Similar Artists"}>
                        <HorizontalRowArtists artists={artist_data.similar_artists}/>
                    </HeaderWith>
                    : null
                }
                <View style={{paddingVertical: 100}}/>
            </ScrollView>
        </>
    )
}