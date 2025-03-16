import { Image, ImageBackground, ScrollView, Text, View } from "react-native";
import { CompactArtist, CompactPlaylist } from "../../../lib-origin/Illusive/src/types";
import AlbumList from "../../components/AlbumList";
import TrackHorizontalScrolls from "../../components/TrackHorizontalScrolls";
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import { useTheme } from "@react-navigation/native";
import { Prefs } from "../../../lib-origin/Illusive/src/prefs";
import { track_query_filter } from "../../../lib-origin/Illusive/src/illusive_utilts";
import LatestRelease from "../../components/LatestRelease";
import HorizontalRowArtists from "../../components/HorizontalRowArtists";
import HeaderWith from "../../components/HeaderWith";

export default function ExtraDevTestScreen(){
    const { colors } = useTheme() as Prefs.Theme;

    const background_image = 'https://lh3.googleusercontent.com/a-/ALV-UjWQPURQa0lD4ZbqM-8dyFSkea1xJDEU9Q5jVRoVsMTECGtrO6ug=w816-h340-l90-rj-dcqXSOji0H';

    const artist_data: CompactArtist = {
        name: {name: "Stanwill", uri: null},
        profile_artwork_url: 'https://yt3.ggpht.com/lANvJH6juiLx7WH2mpPkoZqNGQ6OO_gzEVNp7VLh8J3dOdzB7dxzuogt8bo4Q0hN2fhbmY5yZQ=s176-c-k-c0x00ffffff-no-rj',
        is_official_artist_channel: true
    }

    const album_data: CompactPlaylist = {
        title: {name: "4Ever $hittin", uri: null},
        artist: [{name: 'Stanwill', uri: null}],
        artwork_url: 'https://lh3.googleusercontent.com/EcFK7bVUGwfAy4S1tNlP9Rv2npWPWzK5fNTBNfns9IzyqQqpeEdvF3OCLPo_0OjkYHD1saxm2XiN26wgng=w544-h544-l90-rj',
        explicit: 'EXPLICIT'
    }

    const songs = track_query_filter(GLOBALS.global_var.sql_tracks, "@dl");

    return (
        <ScrollView>
            <ImageBackground blurRadius={10} source={{uri: background_image, scale: 0.3}} style={{height: 170, flexDirection: 'row', alignItems: 'flex-end'}}>
                <Image source={{uri: artist_data.profile_artwork_url}} style={{borderRadius: 100, width: 80, height: 80, bottom: 20, left: 30}}/>
                <Text style={{color: colors.text, fontSize: 40, fontWeight: '500', bottom: 30, paddingLeft: 50, textShadowColor: 'rgb(0, 0, 0)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 3}}>{artist_data.name.name}</Text>
            </ImageBackground>
            <View style={{paddingTop: 40}}/>
            <LatestRelease album_data={album_data}/>
            <View style={{paddingVertical: 20}}/>
            <Text style={{color: colors.text, fontSize: 25, fontWeight: 'bold'}}>Top Songs</Text>
            <View style={{paddingVertical: 5}}/>
            <TrackHorizontalScrolls height={4} tracks={songs}/>
            <View style={{paddingTop: 5}}/>
            <AlbumList else_type="ALBUM" title="Albums" albums={[album_data, album_data, album_data, album_data, album_data]}/>
            <AlbumList else_type="ALBUM" title="Singles & EPs" albums={[album_data, album_data, album_data, album_data, album_data]}/>
            <View style={{paddingTop: 20}}/>
            <HeaderWith title={"From Your Library"}>
                <TrackHorizontalScrolls height={4} tracks={songs}/>
            </HeaderWith>
            <View style={{paddingVertical: 10}}/>
            <HeaderWith title={"Similar Artists"}>
                <HorizontalRowArtists artists={[artist_data, artist_data, artist_data, artist_data]}/>
            </HeaderWith>
            <View style={{paddingVertical: 100}}/>
        </ScrollView>
    );
}