import React,  { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Image, Dimensions, TouchableOpacity } from "react-native";
import { NavigationProp, useTheme } from '@react-navigation/native';
import { useNavigation } from "@react-navigation/native";
import TrackComponent from '../../components/TrackComponent';
import BigList from "react-native-big-list";
import { useIsFocused } from '@react-navigation/native';
import { Prefs } from '../../../lib-origin/Illusive/src/prefs';
import * as GLOBALS from '../../../lib-origin/Illusive/src/illusi/src/globals';
import * as SQLUtils from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_utils';
import * as SQLTracks from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_tracks';
import * as SQLPlaylists from '../../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import { EditMode, NamedUUID, Route, Track } from '../../../lib-origin/Illusive/src/types';
import * as Types from '../../../lib-origin/Illusive/src/types';
import { BlurView } from 'expo-blur';
import FourTrackArtwork from '../../components/FourTrackArtwork';
import ShufflePlayButton from '../../components/ShufflePlayButton';
import { default_playlists } from '../../../lib-origin/Illusive/src/illusi/src/default_playlists';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { best_thumbnail, make_https, music_service_uri_to_music_service, split_uri, track_query_filter, tracks_duration_string } from '../../../lib-origin/Illusive/src/illusive_utilts';
import { ExampleObj } from '../../../lib-origin/Illusive/src/illusi/src/example_objs';
import { empty_join_dot, is_empty, json_catch } from '../../../lib-origin/origin/src/utils/util';
import { Constants } from '../../../lib-origin/Illusive/src/constants';
import { AntDesignTouchableOpacity, FontAwesomeTouchableOpacity, IoniconsTouchableOpacity, MaterialCommunityIconsTouchableOpacity } from '../../components/TouchableIconOpacity';
import { alert_error } from '../../../lib-origin/Illusive/src/illusi/src/alert';
import { presentShortcut, ShortcutOptions } from 'react-native-siri-shortcut';
import { resolved_artwork, share_item } from '../../../lib-origin/Illusive/src/illusi/src/illusi_utils';
import { ResponseError } from '../../../lib-origin/origin/src/utils/types';
import { Ionicons } from '@expo/vector-icons';
import { ContextMenuButton, MenuConfig } from 'react-native-ios-context-menu';
import LibraryTrackList from '../../components/LibraryTrackList';
import TrimTrackModal from '../other/TrimTrackModal';
import SearchBarV1 from '../../components/SearchBarV1';
import { TRACK_QUERY_FLAGS } from '../../../lib-origin/Illusive/src/query_flags';
import { download_track_list } from '../../../lib-origin/Illusive/src/illusi/src/downloader';
import { batch_download_track_lyrics } from '../../../lib-origin/Illusive/src/illusi/src/lyrics';
import TrackInfoModal from '../other/TrackInfoModal';
import { debounce } from 'lodash';

let search_query = "";
let tracks_ref: Track[] = [];
const shortcuts_app_icon = Image.resolveAssetSource(
    require('../../../assets/shortcut.png')
);

export default function Playlist(params: {route: Route<unknown>}){
    const ts_route = params.route as Route<{uuid: string}|{uri: string, compact_playlist?: Types.CompactPlaylist}|{default_playlist_title: string, force_order?: boolean}|{write_playlist_uuid: string, serialized_playlist_data: Types.SerializedCompactPlaylistData}>;

    const force_order = "force_order" in ts_route.params && (ts_route.params.force_order ?? false);
    const force_hide_audioplayer = "write_playlist_uuid" in ts_route.params && ts_route.params.write_playlist_uuid !== Constants.library_write_playlist;
    const pre_always_shuffle = Prefs.get_pref('always_shuffle');
    const pre_hide_audioplayer = Prefs.get_pref('play_without_popup');

    const writing_from_library: boolean = "write_playlist_uuid" in ts_route.params && ts_route.params.serialized_playlist_data.type === Constants.library_write_playlist;

    const navigation: NavigationProp<any, any> = useNavigation();
    const { colors, dark } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	const library_ref = useRef<typeof LibraryTrackList>();

    const [playlist_data, set_playlist_data] = useState<Types.Playlist & {creator?: NamedUUID[]}>();
    const [initial_tracks, set_initial_tracks] = useState<Track[]>([]);
    const [tracks, set_tracks] = useState<Track[]>([]);
    const [edit_mode_state, set_edit_mode_state] = useState<EditMode>("NONE");
    const [continuation, set_continuation] = useState<unknown>();
    const [search_query_state, set_search_query_state] = useState<string>("");
    const [trim_track_state, set_trim_track_state] = useState({show: false, track_data: null as Track|null}); 
    const [track_info_state, set_track_info_state] = useState({show: false, track_data: null as Track|null});   
    const filtered_tracks = track_query_filter(tracks, search_query_state);

    function getShortcut(): ShortcutOptions{
        const key = "uuid" in ts_route.params ? ts_route.params.uuid : ("default_playlist_title" in ts_route.params) ? ts_route.params.default_playlist_title : "";
        return {
            activityType: 'com.illusion137.Illusi.ShuffleMusic',
            persistentIdentifier: 'com.illusion137.Illusi.ShuffleMusic',
            title: "Shuffle Shortcut " + playlist_data?.title, 
            isEligibleForHandoff: true,
            isEligibleForPrediction: true,
            isEligibleForPublicIndexing: true,
            isEligibleForSearch: true,
            keywords: ["Shuffle", "Music", 'Illusi'],
            requiredUserInfoKeys: [key],
            userInfo: {uuid: key},
            description: 'Shuffles Playlist',
        }
    }

    const menuconfig_local_playlist: MenuConfig = {
        menuTitle: '',
        menuItems: [
            {
                menuTitle: "Quick Modes",
                menuOptions: ['displayInline'],
                menuItems: [
                    {
                        actionKey  : 'playlist-actions-default-mode',
                        actionTitle: 'Default',
                        menuAttributes: edit_mode_state === "NONE" ? ['disabled'] : undefined,
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageValue: {
                                systemName: 'scribble',
                            },
                        },
                    }, 
                    {
                        actionKey  : 'playlist-actions-download-mode',
                        actionTitle: 'Download',
                        menuAttributes: edit_mode_state === "DOWNLOAD" ? ['disabled'] : undefined,
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageOptions: {
                                tint: colors.primary,
                                renderingMode: 'alwaysOriginal',
                            },
                            imageValue: {
                                systemName: 'square.and.arrow.down',
                            },
                        },
                    }, 
                    {
                        actionKey  : 'playlist-actions-delete-mode',
                        actionTitle: 'Delete',
                        menuAttributes: edit_mode_state === "DELETE" ? ['disabled'] : ['destructive'],
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageOptions: {
                                tint: colors.red,
                                renderingMode: 'alwaysOriginal',
                            },
                            imageValue: {
                                systemName: 'trash',
                            },
                        },
                    },
                ],
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: 'folder',
                    },
                },
            },
            {
                menuTitle: "Batch Download",
                menuItems: [
                    {
                        actionKey  : 'playlist-actions-batch-download-media',
                        actionTitle: 'Download Media',
                        menuAttributes: filtered_tracks.every(track => !is_empty(track.media_uri)) ? ['disabled'] : undefined,
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageOptions: {
                                tint: colors.secondary,
                                renderingMode: 'alwaysOriginal',
                            },
                            imageValue: {
                                systemName: 'music.note',
                            },
                        },
                    }, 
                    {
                        actionKey  : 'playlist-actions-batch-download-thumbnails',
                        actionTitle: 'Download Thumbnails',
                        menuAttributes: filtered_tracks.every(track => !is_empty(track.thumbnail_uri)) ? ['disabled'] : undefined,
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageOptions: {
                                tint: colors.secondary,
                                renderingMode: 'alwaysOriginal',
                            },
                            imageValue: {
                                systemName: 'photo.artframe',
                            },
                        },
                    }, 
                    {
                        actionKey  : 'playlist-actions-batch-download-lyrics',
                        actionTitle: 'Download Lyrics',
                        menuAttributes: filtered_tracks.every(track => !is_empty(track.lyrics_uri)) ? ['disabled'] : undefined,
                        icon: {
                            type: 'IMAGE_SYSTEM',
                            imageOptions: {
                                tint: colors.secondary,
                                renderingMode: 'alwaysOriginal',
                            },
                            imageValue: {
                                systemName: 'mic.fill',
                            },
                        },
                    },
                ],
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageOptions: {
                        tint: colors.secondary,
                        renderingMode: 'alwaysOriginal',
                    },
                    imageValue: {
                        systemName: 'square.and.arrow.down',
                    },
                },
            },
            {
                actionKey  : 'playlist-actions-shortcut',
                actionTitle: 'Make Shortcut',
                icon: {
                    iconType: 'REQUIRE',
                    iconValue: shortcuts_app_icon,
                }
            }
        ],
    };
    const menuconfig_external_playlist: MenuConfig = {
        menuTitle: '',
        menuItems: [
            {
                actionKey: 'playlist-actions-save-to-playlist',
                actionTitle: 'Save Playlist',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: 'list.bullet',
                    },
                },
            },
            {
                actionKey: 'playlist-actions-add-tracks-to-library',
                actionTitle: 'Add Tracks To Library',
                icon: {
                    type: 'IMAGE_SYSTEM',
                    imageValue: {
                        systemName: 'books.vertical',
                    },
                },
            }
        ]
    }

    const is_focused = useIsFocused();
    useEffect( () => {
        search_query = "";
        if(force_order) Prefs.prefs.always_shuffle.current_value = false;
        if(force_hide_audioplayer) Prefs.prefs.play_without_popup.current_value = true;
        initial_data();
        return () => exit_handler();
    }, []);
    useEffect( () => {
        if(is_focused){
            search_query = "";
            SQLUtils.set_global_sql_tracks_update_callback(refresh_data);
            refresh_data();
        }
	}, [is_focused]);

    const on_debounce_uri_refresh = debounce(() => {
        (async() => {
            set_tracks((tracks) => SQLTracks.add_playback_saved_data_to_tracks(tracks))
        })()
    }, 1000);

    function exit_handler(){
        if(force_order) Prefs.prefs.always_shuffle.current_value = pre_always_shuffle;
        if(force_hide_audioplayer) Prefs.prefs.play_without_popup.current_value = pre_hide_audioplayer;
        search_query = "";
    }

    async function initial_data(){
        tracks_ref = [];
        if("default_playlist_title" in ts_route.params) set_playlist_data( Object.assign({...ExampleObj.playlist_example0}, {title: ts_route.params.default_playlist_title}) );
        else if("uuid" in ts_route.params) set_playlist_data(await SQLPlaylists.playlist_data(ts_route.params.uuid, "IGNORE"));
        else if("uri" in ts_route.params) {
            const cached = GLOBALS.global_var.playlist_cache.get(ts_route.params.uri);
            const cached_hit = cached !== undefined;
            let thumbnail_url;
            if(ts_route.params.compact_playlist !== undefined) {
                thumbnail_url = await Illusive.get_highest_quality_service_thumbnail_uri( (!is_empty(ts_route.params.compact_playlist.artwork_thumbnails) ? best_thumbnail(ts_route.params.compact_playlist.artwork_thumbnails!)?.url : ts_route.params.compact_playlist.artwork_url) ?? "");
                set_playlist_data({title: ts_route.params.compact_playlist.title.name, creator: ts_route.params.compact_playlist.artist, thumbnail_uri: thumbnail_url, date: ts_route.params.compact_playlist.date, uuid: ""});
            }
            else thumbnail_url = undefined;
            if(cached_hit){
                set_continuation(cached!.continuation);
                set_playlist_data(cached!.playlist_data);
                const cached_tracks = await SQLTracks.add_playback_saved_data_to_tracks(cached!.tracks);
                tracks_ref = cached_tracks;
                set_initial_tracks(cached_tracks);
                set_tracks( cached_tracks );
                return;
            }
            const split = split_uri(ts_route.params.uri);
            const playlist: Types.MusicServicePlaylist|ResponseError = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist(make_https(split[1])).catch(json_catch);

            if("error" in playlist!) {
                alert_error(playlist.error as any);
                return;
            }
            const id_continuation = playlist!.continuation;
            const id_playlist_data = Object.assign({...ExampleObj.playlist_example0}, {...playlist_data, title: playlist!.title, description: playlist!.description ?? "", thumbnail_uri: await Illusive.get_highest_quality_service_thumbnail_uri(thumbnail_url ?? playlist!.artwork_url ?? ""), creator: playlist!.creator, date: playlist!.date });
            const id_tracks = await SQLTracks.add_playback_saved_data_to_tracks(playlist!.tracks);
            const first_album_uri = id_tracks?.[0]?.album?.uri;
            if(id_tracks.every(track => track.album?.uri && first_album_uri && track.album.name === id_playlist_data.title && track.album.uri === first_album_uri)){
                for(const track of id_tracks){
                    if(!track.playback) continue;
                    track.playback.artwork = resolved_artwork(id_playlist_data.thumbnail_uri);
                }
            }
            set_continuation(id_continuation);
            set_playlist_data(id_playlist_data);
            tracks_ref = id_tracks;
            set_initial_tracks(id_tracks);
            set_tracks(id_tracks);
            GLOBALS.global_var.playlist_cache.add(ts_route.params.uri, {tracks: id_tracks, playlist_data: id_playlist_data, continuation: id_continuation});
        }
        else if("write_playlist_uuid" in ts_route.params){
            set_playlist_data({title: ts_route.params.serialized_playlist_data.title, uuid: "", date: new Date().toISOString()})
        }
    }

    async function refresh_data(query?: string){
        if(writing_from_library) return;

        search_query = query ?? (search_query ?? "");
        set_search_query_state(search_query);

        if("uri" in ts_route.params) {
            on_debounce_uri_refresh();
            return;
        }
        if(tracks.length === 0 && !("write_playlist_uuid" in ts_route.params) || "uuid" in ts_route.params){
            let playlist_tracks = initial_tracks;
            if("default_playlist_title" in ts_route.params){
                const title = ts_route.params.default_playlist_title;
                const default_playlist = default_playlists.find(playlist => playlist.name === title)!;
                playlist_tracks = await default_playlist.track_function();
            }
            else if("uuid" in ts_route.params){
                playlist_tracks = await SQLPlaylists.playlist_tracks(ts_route.params.uuid);
            }
            tracks_ref = playlist_tracks;
            set_tracks(playlist_tracks);
        }
        if("write_playlist_uuid" in ts_route.params){
            await SQLPlaylists.add_saved_data_to_write_playlist_tracks(ts_route.params.write_playlist_uuid, ts_route.params.serialized_playlist_data.tracks);
            set_tracks(ts_route.params.serialized_playlist_data.tracks);
        }
        else if("default_playlist_title" in ts_route.params){
            const title = ts_route.params.default_playlist_title;
            const default_playlist = default_playlists.find(playlist => playlist.name === title)!;
            set_tracks(await default_playlist.track_function())
        }
    }
    async function try_continuation(){
        if(!is_empty(continuation) && "uri" in ts_route.params){
            const split = split_uri(ts_route.params.uri);
            const playlist_continuation: Types.MusicServicePlaylistContinuation|ResponseError = await Illusive.music_service.get( music_service_uri_to_music_service(split[0]) )!.get_playlist_continuation!(continuation).catch(json_catch);
            if("error" in playlist_continuation) {
                alert_error(playlist_continuation as ResponseError);
                return false;
            }
            const o_playlist_data = playlist_data!;
            const n_tracks = initial_tracks.concat( await SQLTracks.add_playback_saved_data_to_tracks(playlist_continuation.tracks) );
            const n_continuation = playlist_continuation.continuation;
            tracks_ref = n_tracks;
            set_initial_tracks(n_tracks);
            set_tracks(n_tracks);
            set_continuation(n_continuation);
            GLOBALS.global_var.playlist_cache.update(ts_route.params.uri, {tracks: n_tracks, playlist_data: o_playlist_data, continuation: n_continuation});
            return n_continuation !== null;
        }
        return false;
    }
    async function full_continue(){
        if(!is_empty(continuation) && "uri" in ts_route.params){
            const split = split_uri(ts_route.params.uri);
            const data = await Illusive.music_service.get(music_service_uri_to_music_service(split[0]))!.get_rest_of_playlist(continuation);
            tracks_ref = tracks_ref.concat(await SQLTracks.add_playback_saved_data_to_tracks(data));
            set_initial_tracks(tracks_ref);
            set_tracks(tracks_ref);
            set_continuation(null);
            GLOBALS.global_var.playlist_cache.update(ts_route.params.uri, {tracks: tracks_ref, playlist_data: playlist_data!, continuation: null});
        }
        return tracks_ref;
    }

    async function add_tracks_to_library(){
        await SQLTracks.insert_all_tracks(await full_continue());
        navigation.goBack();
    }

    async function save_to_playlist(new_playlist_title: string){
        await add_tracks_to_library();
        const playlist_uuid = await SQLPlaylists.create_playlist(new_playlist_title);
        const promised_playlist_tracks: Types.Promises = [];
        for(const track of tracks_ref){
            const track_uid = await SQLTracks.track_from_service_id(track);
            if(track_uid === null) continue;
            if(!("uid" in track_uid)) continue;
            promised_playlist_tracks.push( SQLPlaylists.insert_track_playlist(playlist_uuid, track_uid.uid) );	
        }
        await Promise.all(promised_playlist_tracks);
        navigation.goBack();
    } 
    async function play_order(play_tracks: Track[]){
        const prev_always_shuffle = Prefs.prefs.always_shuffle.current_value;
        Prefs.prefs.always_shuffle.current_value = false;
        const cloned_tracks = [...play_tracks].slice(GLOBALS.global_var.past_track_index);
        await GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, playlist_data!.title);
        Prefs.prefs.always_shuffle.current_value = prev_always_shuffle;
    }
    function play_shuffle(play_tracks: Track[]){
        const cloned_tracks = Illusive.shuffle_tracks("SHUFFLE", [...play_tracks]);
        GLOBALS.global_var.play_tracks(cloned_tracks[0], cloned_tracks, playlist_data!.title);
	}

    async function on_edit_text(q: string){
        (library_ref?.current as any)?.refresh_data(q);
        refresh_data(q);
    }

	const render_track = (item: {item: Track}) => (
		<TrackComponent playlist_uuid={(ts_route.params as {uuid?: string}).uuid} 
                        track_callback={() => [...tracks]} 
                        track_data={item.item} 
                        from={playlist_data?.title}
                        display_plays={"default_playlist_title" in ts_route.params && ts_route.params.default_playlist_title === "Most Played"}
                        edit_mode={edit_mode_state} 
                        trim_track={(show: boolean, track_data: Track|null) => set_trim_track_state({show: show, track_data: track_data})}
                        view_info={(show: boolean, track_data: Track|null) => set_track_info_state({show: show, track_data: track_data})}
                        write_playlist_uuid={"uri" in ts_route.params ? Constants.library_write_playlist : "write_playlist_uuid" in ts_route.params ? ts_route.params.write_playlist_uuid : undefined} 
                        refresh_data={refresh_data}/>
	);
	const header_component = () => (
		<View style={styles.playlist_list_header}>
            <FourTrackArtwork background={true} thumbnail_uri={playlist_data?.thumbnail_uri} four_track={!writing_from_library ? tracks : GLOBALS.global_var.sql_tracks} size={Dimensions.get('screen').width / 2} base_view_style={{top: -Dimensions.get('screen').height / 6}}/>
            <BlurView intensity={50} tint={dark ? 'prominent' : 'extraLight'} style={{width: Dimensions.get('screen').width, height: 800, bottom: 150 - (("write_playlist_uuid" in ts_route.params) ? 80 : 0), justifyContent: 'center', alignItems: 'center', position: 'absolute'}}>
                <FourTrackArtwork thumbnail_uri={playlist_data?.thumbnail_uri} four_track={!writing_from_library ? tracks : GLOBALS.global_var.sql_tracks} size={75} base_view_style={{top: 260}}/>
            </BlurView>
            <View style={{alignItems: 'center', width: '75%', top: 60, height: 40, zIndex: 2}}>
                <View style={{right: 10, zIndex: 3}}>
                    <SearchBarV1 placeholder='Search Playlist' background_color={colors.primary_dark} query_flags={TRACK_QUERY_FLAGS} onChangeText={on_edit_text}/>
                </View>
                <Text style={{color: colors.subtext, fontSize: 14, marginBottom: 20, top: 5}}>{empty_join_dot([playlist_data?.creator?.map(item => item.name).join(', ') ?? "Sudo", new Date(playlist_data?.date!)?.getFullYear()])}</Text>
            </View>
            <View style={{height: 220}}/>
            <View style={{top: 40, alignItems: 'center'}}>
                <Text numberOfLines={1} style={{color: colors.text, fontSize: 20, fontWeight: 'bold'}}>{playlist_data?.title}</Text>
                <Text numberOfLines={1} style={{color: colors.text, fontSize: 20}}>{playlist_data?.description}</Text>
                <Text numberOfLines={1} style={{color: colors.subtext, fontSize: 12, top: -8}}>{empty_join_dot([`${tracks.length} tracks`, tracks_duration_string(tracks)])}</Text>
            </View>
            <View style={{height: 5}}/>
            <View style={{flexDirection: 'row', top: 10, width: '100%'}}>
                <View style={styles.playlist_buttons_container}>
                    {!("write_playlist_uuid" in ts_route.params) ? <IoniconsTouchableOpacity on_press={() => { play_order(tracks); }} 
                        style={styles.playlist_button} icon_name='play-sharp' icon_size={25} icon_color={colors.primary} icon_style={{left:3}}/> : null}
                    {"uuid" in ts_route.params ?
                        <>
                            <IoniconsTouchableOpacity on_press={() => { 
                                navigation.navigate('AddToPlaylistBase', {write_playlist_uuid: (ts_route.params as {uuid: string}).uuid }); }} 
                                    style={styles.playlist_button} icon_name='add' icon_size={35} icon_color={colors.primary} icon_style={{left:1}}/>
                            <MaterialCommunityIconsTouchableOpacity on_press={() => {
                                navigation.navigate('Edit Playlist', {uuid: (ts_route.params as {uuid: string}).uuid });
                            }} style={styles.playlist_button} icon_name='pencil' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
                            <FontAwesomeTouchableOpacity disabled={!(playlist_data?.public ?? false)} on_press={() => share_item({link: `https://illusi.dev/playlist/${playlist_data?.public_uuid}`})} style={!(playlist_data?.public ?? false) ? {...styles.playlist_button, opacity: 0.4} : styles.playlist_button} icon_name='share' icon_size={25} icon_color={colors.primary} icon_style={{}}/>
                        </>
                    : null}
                </View>
            </View>
            {!("write_playlist_uuid" in ts_route.params) ? 
                <ShufflePlayButton text={force_order ? "Continue Listening" : is_empty(search_query) ? undefined : "Shuffle Searched"} on_press={() => {force_order ? play_order(tracks): play_shuffle(track_query_filter(tracks, search_query_state))}} top={-50}/>
            : null}
        </View>	
    );
    const footer_component = () => (
        <View style={{height:100}}></View>
    );
    
    return(
        <View style={styles.top_container}>
            <View style={styles.header} pointerEvents='box-none'>
                <AntDesignTouchableOpacity on_press={() => navigation.goBack()} style={{}} icon_name='left' icon_size={30} icon_color={colors.primary} icon_style={{}}/>
                {!("write_playlist_uuid" in ts_route.params) ? 
                    <TouchableOpacity>
                        <ContextMenuButton
                            menuConfig={"uuid" in ts_route.params || "default_playlist_title" in ts_route.params ? 
                                menuconfig_local_playlist : "uri" in ts_route.params ? 
                                    menuconfig_external_playlist : undefined}
                            onPressMenuItem={async({nativeEvent}) => {
                                switch(nativeEvent.actionKey){
                                    case "playlist-actions-default-mode":
                                        set_edit_mode_state("NONE");
                                        break;
                                    case "playlist-actions-download-mode":
                                        set_edit_mode_state("DOWNLOAD");
                                        break;
                                    case "playlist-actions-delete-mode":
                                        set_edit_mode_state("DELETE");
                                        break;
                                    case "playlist-actions-batch-download-media":
                                        await download_track_list(filtered_tracks);
                                        refresh_data();
                                        break;
                                    case "playlist-actions-batch-download-thumbnails":
                                        await SQLTracks.restore_thumbnail_cache(filtered_tracks);
                                        GLOBALS.global_var.bottom_alert("Downloaded all available thumbnails", "INFO");
                                        break;
                                    case "playlist-actions-batch-download-lyrics":
                                        await batch_download_track_lyrics(filtered_tracks);
                                        GLOBALS.global_var.bottom_alert("Downloaded all available lyrics", "INFO");
                                        break;
                                    case "playlist-actions-shortcut":
                                        presentShortcut(getShortcut(), (data) => data);
                                        break;
                                    case "playlist-actions-save-to-playlist":
                                        await save_to_playlist(playlist_data?.title!);
                                        break;
                                    case "playlist-actions-add-tracks-to-library":
                                        await add_tracks_to_library();
                                        break;
                                }
                            }}
                        >
                            <Ionicons name='ellipsis-horizontal' size={40} color={colors.primary}/>
                        </ContextMenuButton> 
                    </TouchableOpacity>
                    : null }
            </View>
            <View style={{height: '100%', bottom: 40}}>
                {"write_playlist_uuid" in ts_route.params && ts_route.params.serialized_playlist_data.type === Constants.library_write_playlist ? 
                    <LibraryTrackList
                        is_focused={is_focused}
                        refresh_query_on_focus={true}
                        edit_mode='NONE'
                        ref={library_ref}
                        write_playlist_uuid={ts_route.params.write_playlist_uuid}
                        header_height={"write_playlist_uuid" in ts_route.params ? 360 : 450}
                        header_item={header_component}
                        adjusted_alphabet_scroll={-35}
                        />
                    : <BigList style={{backgroundColor: colors.background}} 
                        headerHeight={"write_playlist_uuid" in ts_route.params ? 360 : 450} 
                        itemHeight={61} 
                        footerHeight={50}
                        renderHeader={header_component} 
                        renderItem={render_track}
                        renderFooter={footer_component}
                        data={filtered_tracks}
                        onEndReached={try_continuation}
                        onEndReachedThreshold={0.3}
                        />
                }
            </View>
            <TrimTrackModal modal_data={trim_track_state} set_modal_data={set_trim_track_state} callback={() => {}}/>
            <TrackInfoModal modal_data={track_info_state} set_modal_data={set_track_info_state} callback={() => {}}/>
        </View>
    );
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
    top_container:{
        flex: 1,
        // backgroundColor: "blue",
        backgroundColor: colors.background,
    },
    header:{
        top: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 10,
        zIndex: 1
    },
    playlist_list_header:{
        top: 0,
        alignItems: 'center',
        zIndex: 2
    },
    info_text:{
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold'
    },
    playlist_buttons_container:{
        flex: 1,
        flexDirection: 'row',
        top: 28,
        marginBottom: 100,
        justifyContent: 'center',
        alignItems: 'center',
        right: 10
    },
    playlist_button:{
        borderRadius: 20, 
        backgroundColor: colors.primary_dark,
        marginHorizontal: 10,
        width: 40, height: 40, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    search_input:{
		backgroundColor: colors.primary_dark,
		color: colors.text,
		width: '75%',
        position: 'absolute',
        top: -40,
        left: 50,
		padding: 10,
		fontSize: 15,
		borderRadius: 10,
	},
});