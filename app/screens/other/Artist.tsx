import React,  { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Image, FlatList, ActionSheetIOS, Text, TouchableOpacity, Linking, Alert } from "react-native";
import { AntDesign, Ionicons, MaterialCommunityIcons,FontAwesome } from "@expo/vector-icons";
import { NavigationProp, useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackComponent from '../../components/TrackComponent';
import BigList from "react-native-big-list";
import { useIsFocused } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import { EditMode, NamedUri, Route, Track } from '../../../lib-origin/Illusive/src/types';
import * as Types from '../../../lib-origin/Illusive/src/types';

import FourTrackArtwork from '../../components/FourTrackArtwork';
import { default_playlists } from '../../../lib-origin/Illusive/src/illusi/src/default_playlists';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { cycle, music_service_uri_to_music_service, playlist_duration_to_string, split_uri } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { ExampleObj } from '../../../lib-origin/Illusive/src/illusi/src/example_objs';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';

export default function Artist(props: {}){
    const ts_route = params.route as Route<{uid: string}|{uri: string}|{default_playlist_title: string}|{write_uid: string, from_uid: string}>

    const navigation: NavigationProp<any, any> = useNavigation();
    const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    const [playlist_data, set_playlist_data] = useState<Types.Playlist & {creator?: NamedUri[]}>();
    const [tracks, set_tracks] = useState<Track[]>([]);
    const [continuation, set_continuation] = useState<unknown>();

    const is_focused = useIsFocused();
    useEffect( () => {
        initial_data();
    }, []);
    useEffect( () => {
        if(is_focused){
            refresh_data();
        }
	}, [is_focused]);

    async function initial_data(){
        if("default_playlist_title" in ts_route.params) set_playlist_data( Object.assign({...ExampleObj.playlist_example0}, {title: ts_route.params.default_playlist_title}) );
        else if("uid" in ts_route.params) set_playlist_data(await SQLActions.playlist_data(ts_route.params.uid));
        else if("uri" in ts_route.params) {
            const split = split_uri(ts_route.params.uri);
            const playlist = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(split[2]);
            set_continuation(playlist.playlist_continuation);
            set_playlist_data( Object.assign({...ExampleObj.playlist_example0}, {title: playlist.title, description: playlist.description ?? "", thumbnail_uri: playlist.thumbnail_uri, creator: playlist.creator, date: new Date(`${playlist.year}-01-01T00:00:00.000Z`)}) );
            set_tracks( await SQLActions.add_playback_saved_data_to_tracks(playlist.tracks) );
        }
    }

    async function refresh_data(){
        let playlist_tracks = [] as Track[];
        if("default_playlist_title" in ts_route.params){
            const title = ts_route.params.default_playlist_title;
            const default_playlist = default_playlists.find(playlist => playlist.name === title)!;
            playlist_tracks = await default_playlist.track_function();
        }
        else if("uid" in ts_route.params){
            playlist_tracks = await SQLActions.playlist_tracks(ts_route.params.uid);
        }
        set_tracks(playlist_tracks);
    }

	const render_track = (item: {item: Track}) => (
		<TrackComponent playlist_uid={(ts_route.params as {uid: string}).uid} track_data={item.item} from={playlist_data?.title} edit_mode={edit_mode_state} playlist_from={playlist_data?.title} refresh_data={refresh_data}/>
	);
	const header_component = () => (
		<View style={styles.playlistListHeader}>
            <Text style={{color: '#808080', fontSize: 14, marginBottom: 20}}>{playlist_data?.creator?.map(item => item.name).join(', ') ?? "Sudo"} • {playlist_data?.date.getFullYear()}</Text>
            <FourTrackArtwork thumbnail_uri={playlist_data?.thumbnail_uri} four_track={tracks} size={75}/>
            <View style={{top: 15, alignItems: 'center'}}>
                <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{playlist_data?.title}</Text>
                <Text style={{color: '#FFFFFF', fontSize: 20}}>{playlist_data?.description}</Text>
                <Text style={{color: '#808080', fontSize: 12}}>{tracks.length} tracks • {playlist_duration_to_string(tracks.map(({duration}) => duration).reduce(function(prev, cur) { return prev + cur; }, 0))}</Text>
            </View>
            <View style={styles.playlistButtonsContainer}>
                {"uid" in ts_route.params && <TouchableOpacity style={styles.playlistButton} onPress={() => {
                    navigation.navigate('Add To Playlist', {write_playlist_uid: (ts_route.params as {uid: string}).uid })
                }}>
                    <Ionicons name="add" size={35} color={colors.primary} style={{left:1}}/>
                </TouchableOpacity>}
                {true && <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                    <MaterialCommunityIcons name="pencil" size={25} color={colors.primary}/>
                </TouchableOpacity>}
                {true && <TouchableOpacity style={styles.playlistButton} onPress={() => {}}>
                    <FontAwesome name="share" size={25} color={colors.primary}/>
                </TouchableOpacity>}
            </View>
            <TouchableOpacity onPress={async() => {
                play_shuffle(tracks);
            }} style={{backgroundColor: colors.primary, width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', bottom: 20}}><Ionicons name="shuffle" size={25} color='#000000' style={{}}/>
            <Text style={{fontWeight: '500', fontSize: 15}}>Shuffle Play</Text></TouchableOpacity>
        </View>	
    );
    const footer_component = () => (
        <View style={{height:100}}></View>
    );

    return(
        <View style={styles.topContainer}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <AntDesign name="left" size={30} color={colors.primary}/>
                </TouchableOpacity>
                <TouchableOpacity onPress={actions} hitSlop={30}>
                    <Ionicons name="ellipsis-horizontal-outline" size={40} color={colors.primary}/>
                </TouchableOpacity>
            </View>
            <View style={{height: '94%'}}>                
                <BigList style={{backgroundColor: colors.background}} 
                    headerHeight={450} 
                    itemHeight={61} 
                    footerHeight={50}
                    renderHeader={header_component} 
                    renderItem={render_track}
                    renderFooter={footer_component}
                    data={tracks}
                    onEndReached={try_continuation}/>
            </View>
        </View>
    );
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    topContainer:{
        flex: 1,
        backgroundColor: colors.background
    },
    header:{
        top: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        zIndex: 1
    },
    playlistListHeader:{
        top: 50,
        alignItems: 'center'
    },
    infoText:{
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold'
    },
    playlistButtonsContainer:{
        flexDirection: 'row',
        top: 30,
        marginBottom: 100
    },
    playlistButton:{
        borderRadius: 20, 
        backgroundColor: '#1a184f',
        marginHorizontal: 10,
        width: 40, height: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    }
});