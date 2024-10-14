import React,  { useState, useEffect } from 'react';
import { View, StyleSheet, ActionSheetIOS, Text, TextInput } from "react-native";
import { NavigationProp, useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import TrackComponent from '../../components/TrackComponent';
import BigList from "react-native-big-list";
import { useIsFocused } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import { EditMode, NamedUUID, Route, Track } from '../../../lib-origin/Illusive/src/types';
import * as Types from '../../../lib-origin/Illusive/src/types';

import FourTrackArtwork from '../../components/FourTrackArtwork';
import { default_playlists } from '../../../lib-origin/Illusive/src/illusi/src/default_playlists';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { best_thumbnail, make_https, music_service_uri_to_music_service, playlist_duration_to_string, split_uri } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { ExampleObj } from '../../../lib-origin/Illusive/src/illusi/src/example_objs';
import { is_empty } from '../../../lib-origin/origin/src/utils/util';
import { Constants } from '../../../lib-origin/Illusive/src/constants';
import ShufflePlayButton from '../../components/ShufflePlayButton';
import { AntDesignTouchableOpacity, FontAwesomeTouchableOpacity, IoniconsTouchableOpacity, MaterialCommunityIconsTouchableOpacity } from '../../components/TouchableIconOpacity';
import { deserialize_track } from '../../../lib-origin/Illusive/src/track_parser';
import LibraryTrackList from '../../components/LibraryTrackList';

export default function Playlist(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{uuid: string}|{uri: string, compact_playlist?: Types.CompactPlaylist}|{default_playlist_title: string}|{write_playlist_uuid: string, serialized_playlist_data: Types.SerializedCompactPlaylistData}>

    const navigation: NavigationProp<any, any> = useNavigation();
    const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

    const [playlist_data, set_playlist_data] = useState<Types.Playlist & {creator?: NamedUUID[]}>();
    const [tracks, set_tracks] = useState<Track[]>([]);
    const [edit_mode_state, set_edit_mode_state] = useState<EditMode>("NONE");
    const [continuation, set_continuation] = useState<unknown>();
    const actions = () => {
        if("uuid" in ts_route.params || "default_playlist_title" in ts_route.params){
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ["Cancel", "Default Mode", "Download Mode", "Delete Mode"],
                    destructiveButtonIndex: 3,
                    cancelButtonIndex: 0,
                    userInterfaceStyle: 'dark'
                }, (i) => {
                    if (i === 0) {} 
                    else if (i === 1) { set_edit_mode_state("NONE"); }
                    else if (i === 2) { set_edit_mode_state("DOWNLOAD"); }
                    else if (i === 3) { set_edit_mode_state("DELETE"); }
                }
            );
        }
        else if("uri" in ts_route.params) {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ["Cancel", "Save Playlist", "Add Tracks To Library"],
                    destructiveButtonIndex: 2,
                    cancelButtonIndex: 0,
                    userInterfaceStyle: 'dark'
                }, async(i) => {
                    if (i === 0) {} 
                    else if (i === 1) { await save_to_playlist(tracks, playlist_data?.title!); }
                    else if (i === 2) { await add_tracks_to_library(tracks); }
                }
            );
        }
        else return;
    }

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
        else if("uuid" in ts_route.params) set_playlist_data(await SQLActions.playlist_data(ts_route.params.uuid));
        else if("uri" in ts_route.params) {
            const cached = GLOBALS.global_var.playlist_cache.get(ts_route.params.uri);
            const cached_hit = cached !== undefined;
            if(cached_hit){
                set_continuation(cached!.continuation);
                set_playlist_data(cached!.playlist_data);
                set_tracks( await SQLActions.add_playback_saved_data_to_tracks(cached!.tracks) );
                return;
            }
            if(ts_route.params.compact_playlist !== undefined) {
                const thumbnail_url = ts_route.params.compact_playlist.artwork_thumbnails !== undefined ? best_thumbnail(ts_route.params.compact_playlist.artwork_thumbnails!)?.url : ts_route.params.compact_playlist.thumbnail_uri;
                set_playlist_data({title: ts_route.params.compact_playlist.title.name, creator: ts_route.params.compact_playlist.artist, thumbnail_uri: thumbnail_url, date: ts_route.params.compact_playlist.date, uuid: ""});
            }
            const split = split_uri(ts_route.params.uri);
            let playlist: Types.MusicServicePlaylist;
            switch(split[0]){
                case "musi": {
                    playlist = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(make_https(split[1]));
                    break;
                }
                case "youtube": {
                    playlist = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(make_https("www." + split[1]));
                    break;
                }
                case "youtubemusic": {
                    playlist = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(make_https(split[1]));
                    break;
                }
                case "soundcloud": {
                    playlist = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(make_https(split[1]));
                    break;
                }
                case "spotify": {
                    playlist = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(make_https(split[1]));
                    break;
                }
            }
            const id_continuation = playlist!.playlist_continuation;
            const id_playlist_data = Object.assign({...ExampleObj.playlist_example0}, {title: playlist!.title, description: playlist!.description ?? "", thumbnail_uri: playlist!.thumbnail_uri, creator: playlist!.creator, date: playlist!.date });
            const id_tracks = await SQLActions.add_playback_saved_data_to_tracks(playlist!.tracks);
            set_continuation(id_continuation);
            set_playlist_data(id_playlist_data);
            set_tracks(id_tracks);
            if("error" in playlist! && !is_empty(playlist.error)) return;
            GLOBALS.global_var.playlist_cache.add(ts_route.params.uri, {tracks: id_tracks, playlist_data: id_playlist_data, continuation: id_continuation});
        }
        else if("write_playlist_uuid" in ts_route.params){
            set_playlist_data({title: ts_route.params.serialized_playlist_data.title, uuid: "", date: new Date()})
        }
    }

    async function refresh_data(){
        let playlist_tracks = [] as Track[];
        if("default_playlist_title" in ts_route.params){
            const title = ts_route.params.default_playlist_title;
            const default_playlist = default_playlists.find(playlist => playlist.name === title)!;
            playlist_tracks = await default_playlist.track_function();
        }
        else if("uuid" in ts_route.params){
            playlist_tracks = await SQLActions.playlist_tracks(ts_route.params.uuid);
        }
        else if("write_playlist_uuid" in ts_route.params){
            playlist_tracks = await SQLActions.add_saved_data_to_write_playlist_tracks(ts_route.params.write_playlist_uuid, ts_route.params.serialized_playlist_data.tracks.map(deserialize_track));
        }
        set_tracks(playlist_tracks);
    }
    async function try_continuation(){
        if(!is_empty(continuation) && "uri" in ts_route.params){
            const split = split_uri(ts_route.params.uri);
            const playlist_continuation = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist_continuation!(continuation);
            const o_playlist_data = playlist_data!;
            const n_tracks = tracks.concat( await SQLActions.add_playback_saved_data_to_tracks(playlist_continuation.tracks) );
            const n_continuation = playlist_continuation.playlist_continuation;
            set_tracks(n_tracks);
            set_continuation(n_continuation);
            GLOBALS.global_var.playlist_cache.update(ts_route.params.uri, {tracks: n_tracks, playlist_data: o_playlist_data, continuation: n_continuation})
        }
    }

    async function add_tracks_to_library(tracks: Track[]){
        const promised_tracks: Types.Promises = [];
        for(const track of tracks)
            promised_tracks.push( SQLActions.insert_track(track) );
        await Promise.all(promised_tracks);
        navigation.goBack();
    }

    async function save_to_playlist(tracks: Track[], new_playlist_title: string){
        await add_tracks_to_library(tracks);
        const playlist_uuid = await SQLActions.create_playlist(new_playlist_title);
        const promised_playlist_tracks: Types.Promises = [];
        for(const track of tracks){
            const track_uid = await SQLActions.track_from_service_id(track);
            if(track_uid === null) continue;
            promised_playlist_tracks.push( SQLActions.insert_track_playlist(playlist_uuid, track_uid.uid) );	
        }
        await Promise.all(promised_playlist_tracks);
        navigation.goBack();
    } 

    function play_shuffle(play_tracks: Track[]){
        const cloned_tracks = Illusive.shuffle_tracks("SHUFFLE", [...play_tracks]);
        GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, playlist_data!.title);
	}

	const render_track = (item: {item: Track}) => (
		<TrackComponent playlist_uuid={(ts_route.params as {uuid?: string}).uuid} 
                        track_callback={() => [...tracks]} 
                        track_data={item.item} 
                        from={playlist_data?.title} 
                        edit_mode={edit_mode_state} 
                        write_playlist_uuid={"uri" in ts_route.params ? Constants.library_write_playlist : "write_playlist_uuid" in ts_route.params ? ts_route.params.write_playlist_uuid : undefined} 
                        refresh_data={refresh_data}/>
	);
	const header_component = () => (
		<View style={styles.playlist_list_header}>
            <Text style={{color: '#808080', fontSize: 14, marginBottom: 20}}>{[playlist_data?.creator?.map(item => item.name).join(', ') ?? "Sudo", playlist_data?.date?.getFullYear()].filter(item => typeof item === "string" || (item !== undefined && !isNaN(item))).join(" • ")}</Text>
            <FourTrackArtwork thumbnail_uri={playlist_data?.thumbnail_uri} four_track={tracks} size={75}/>
            <View style={{top: 15, alignItems: 'center'}}>
                <Text style={{color: '#FFFFFF', fontSize: 20, fontWeight: 'bold'}}>{playlist_data?.title}</Text>
                <Text style={{color: '#FFFFFF', fontSize: 20}}>{playlist_data?.description}</Text>
                <Text style={{color: '#808080', fontSize: 12, top: -8}}>{tracks.length} tracks • {playlist_duration_to_string(tracks.map(({duration}) => duration).reduce(function(prev, cur) { return prev + cur; }, 0))}</Text>
            </View>
            <View style={styles.playlist_buttons_container}>
                {"uuid" in ts_route.params ?
                    <>
                        <IoniconsTouchableOpacity on_press={() => { 
                            navigation.navigate('AddToPlaylistBase', {write_playlist_uuid: (ts_route.params as {uuid: string}).uuid }); }} 
                                style={styles.playlist_button} icon_name='add' icon_size={35} icon_color={colors.primary} icon_style={{left:1}}/>
                        <MaterialCommunityIconsTouchableOpacity on_press={() => {}} style={styles.playlist_button} icon_name='pencil' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
                        <FontAwesomeTouchableOpacity on_press={() => {}} style={styles.playlist_button} icon_name='share' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
                    </> 
                : null}
            </View>
            {!("write_playlist_uuid" in ts_route.params) ? <ShufflePlayButton on_press={() => play_shuffle(tracks)} top={-40}/> : null}
        </View>	
    );
    const footer_component = () => (
        <View style={{height:100}}></View>
    );

    return(
        <View style={styles.top_container}>
            <TextInput/>
            <View style={styles.header}>
                <AntDesignTouchableOpacity on_press={() => navigation.goBack()} style={{}} icon_name='left' icon_size={30} icon_color={colors.primary} icon_style={{}}/>
                {!("write_playlist_uuid" in ts_route.params) ? <IoniconsTouchableOpacity on_press={actions} style={{}} icon_name='ellipsis-horizontal-outline' icon_size={40} icon_color={colors.primary} icon_style={{}} hitslop={40}/> : null }
            </View>
            <View style={{height: '94%'}}>
                {"write_playlist_uuid" in ts_route.params && ts_route.params.serialized_playlist_data.type === Constants.library_write_playlist ? 
                    <LibraryTrackList 
                        edit_mode='NONE' 
                        write_playlist_uuid={ts_route.params.write_playlist_uuid}
                        header_height={"uuid" in ts_route.params ? 425 : "write_playlist_uuid" in ts_route.params ? 320 : 385}
                        header_item={header_component}
                        adjusted_alphabet_scroll={-35}/>
                    : <BigList style={{backgroundColor: colors.background}} 
                        headerHeight={"uuid" in ts_route.params ? 425 : "write_playlist_uuid" in ts_route.params ? 320 : 385} 
                        itemHeight={61} 
                        footerHeight={50}
                        renderHeader={header_component} 
                        renderItem={render_track}
                        renderFooter={footer_component}
                        data={tracks}
                        onEndReached={try_continuation}/>
                }
                </View>
        </View>
    );
}

const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
    top_container:{
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
    playlist_list_header:{
        top: 50,
        alignItems: 'center'
    },
    info_text:{
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold'
    },
    playlist_buttons_container:{
        flexDirection: 'row',
        top: 28,
        marginBottom: 95
    },
    playlist_button:{
        borderRadius: 20, 
        backgroundColor: colors.primary_dark,
        marginHorizontal: 10,
        width: 40, height: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    }
});