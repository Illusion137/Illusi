import * as SQLTracks from '@illusive/illusi/src/sql/sql_tracks'
import * as Origin from "@origin/index";
import { FlatList, Image, ImageBackground, ScrollView, Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import ExtrasSectionButton from "@components/ExtrasSectionButton";
import { musi_parse_explore } from "@illusive/gen/musi_parser";
import { useEffect, useState } from "react";
import type { Prefs } from "@illusive/prefs";
import type { NavigationProp} from "@react-navigation/native";
import { useNavigation, useTheme } from "@react-navigation/native";
import type { Musi } from '../../../lib-origin/origin/src';
import { create_uri } from '@illusive/illusive_utils';
import type { CompactPlaylist } from '@illusive/types';
import { IoniconsTouchableOpacity } from '@components/TouchableIconOpacity';
import { clean_youtube_title } from '@illusive/gen/youtube_parser';
import TrackHorizontalScrolls from '@components/TrackHorizontalScrolls';
import usePTheme from '@hooks/usePTheme';

type MusiExplore = ReturnType<typeof musi_parse_explore>;
let musi_explore_data: MusiExplore;
export default function MusiExplore(){
    const { colors } = usePTheme();
    const styles = theme_styles(colors);

    const navigation: NavigationProp<any, any> & {push: (route: string, params: any) => void} = useNavigation();

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

    const render_top_playlist = (placement: {item: Musi.MusiExplore['success']['modules'][0]['placements'][0]}) => (
        <View style={{flexDirection: 'column'}}>
            <TouchableOpacity 
                style={{width: 110, height: 110, backgroundColor: colors.card, marginVertical: 10, marginHorizontal: 7, borderRadius: 10}}
                onPress={() => {
                    if(placement.item.playlist === undefined) return;
                    const uri = placement.item.playlist.youtube_playlist_id !== undefined ? 
                        create_uri('youtube', placement.item.playlist.youtube_playlist_id) :
                        create_uri('musi', placement.item.playlist.musi_playlist_id!);
                    const compact_playlist: CompactPlaylist = {
                        title: {name: placement.item.playlist.name, uri: null},
                        artist: [{name: 'Musi', uri: null}],
                        artwork_url: placement.item.icon_image_url
                    }
                    navigation.navigate("Playlist", {"uri": uri, compact_playlist});
                }}
            >
                <Image key={placement.item.title} source={{'uri': placement.item.icon_image_url}} style={{width: '100%', height: '100%'}}/>
            </TouchableOpacity>
            <Text style={{left: 5, color: colors.text, fontSize: 15, fontWeight: '600'}}>{placement.item.title}</Text>
        </View>
    );

    return (
        <ScrollView>
            {musi_explore === undefined ? 
                <View style={{height: 300}} pointerEvents="none"/>
                : <ImageBackground imageStyle={{opacity:0.08}} style={{height: 300, justifyContent: 'flex-end'}} source={{uri: musi_explore.modules[0].placements[0].icon_image_url}}>
                    <IoniconsTouchableOpacity style={{left: '70%', top: 15}} icon_name='play-circle-sharp' icon_color={colors.primary} icon_size={90} icon_style={{}} on_press={() => {}}/>
                    <Text numberOfLines={1} style={{color: colors.subtext, fontSize: 18, fontWeight: '300', marginHorizontal: 15}}>{musi_explore.modules[0].placements[0].track?.user}</Text>
                    <Text numberOfLines={1} style={{color: colors.text, fontSize: 30, fontWeight: 'bold', marginLeft: 10, marginRight: 50}}>{clean_youtube_title(musi_explore.modules[0].placements[0].track?.title ?? "")}</Text>
                </ImageBackground>
            }
            <FlatList 
                style={{flex: 1}}
                horizontal={true}
                data={musi_explore === undefined ? [] : musi_explore.modules
                    .filter(module => module.type === "scroller" && module.placements.length > 0)[0].placements}
                renderItem={render_top_playlist}/>
            <View style={{height: 22}}/>
            {
                musi_explore !== undefined ? 
                musi_explore.modules
                    .filter(module => module.type === "scroller" && module.placements.length > 0).slice(1).map((module, index) => (
                        <ExtrasSectionButton key={(module.title ?? "") + index} text={module.title ?? ""} transparent={true} show_arrow={true} icon="NONE" onPress={() => {module.placements}}/>
                    ))
                : null
            }
            {
                musi_explore !== undefined ?
                (
                    <>
                        <View style={styles.line_long}/>
                        <Text style={{color: colors.text, fontSize: 30, fontWeight: 'bold', marginLeft: 10, marginTop: 20, marginBottom: 10}}>Top Tracks</Text>
                        <View style={styles.line_long}/>
                        <TrackHorizontalScrolls tracks={musi_explore.top_tracks.slice(0,20)} height={5}/>
                    </>
                ) 
                : null
            }
            <View style={{height: 100}}/>
        </ScrollView>
    );
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