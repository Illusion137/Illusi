import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';
import { artist_string, duration_to_string } from '../../lib-origin/Illusive/src/illusive_utilts';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';
import { EditMode, Track } from '../../lib-origin/Illusive/src/types';
import { is_empty } from '../../lib-origin/origin/src/utils/util';
import { push_track_to_playing_queue, play } from '../../lib-origin/Illusive/src/illusi/src/play';
import { delete_track, insert_into_write_playlist, download_track } from '../../lib-origin/Illusive/src/illusi/src/components/track';
import { Constants } from '../../lib-origin/Illusive/src/constants';
import { IoniconsTouchableOpacity } from './TouchableIconOpacity';

function TrackComponent(props: {
		track_data: Track
		write_playlist_uuid?: typeof Constants.library_write_playlist | string,
		from?: string,
        playlist_uuid?: string,
		edit_mode?: EditMode,
        track_callback?: () => Track[]
		refresh_data?: () => Promise<void>
		add_from?: (show: boolean, track: Track|null) => any
	}) {

	const [is_downloading, set_is_downloading] = useState( GLOBALS.downloading.findIndex((item) => item.uid == props.track_data.uid) !== -1);
	const [is_downloaded, set_is_downloaded] = useState(!is_empty(props.track_data.media_uri));
	const [playlist_saved, set_playlist_saved] = useState(
        ((props.track_data.downloading_data?.playlist_saved ?? false) 
            && props.write_playlist_uuid !== Constants.library_write_playlist) 
                || ((props.track_data.downloading_data?.saved ?? false) && props.write_playlist_uuid === Constants.library_write_playlist));
	const [downloading_progress, set_downloading_progress] = useState(0);
	
    const disabled_from_write_playlist = props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist;
    const disabled_from_edit_mode = Prefs.get_pref("edit_mode_disables_playing") && props.edit_mode !== undefined && props.edit_mode  !== "NONE";
    const disabled_from_full_queue = Prefs.get_pref("full_queue_disables_playing") && GLOBALS.global_var.playing_queue.length > 0;

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

    let interval: any;
	useEffect(() => {
        const depth = Prefs.get_pref('download_queue_max_length');
        const index = GLOBALS.downloading.slice(0, depth).findIndex(item => item?.uid === props.track_data.uid);
        const is_currently_downloading = index !== -1;
        if(is_currently_downloading){
            set_is_downloading(true);
            set_downloading_progress(GLOBALS.downloading[index]?.progress);
            interval = setInterval(() => {
                const inner_depth = Prefs.get_pref('download_queue_max_length');
                const inner_index = GLOBALS.downloading.slice(0, inner_depth).findIndex(item => item?.uid === props.track_data.uid);
                if(inner_index === -1){
                    set_is_downloading(false);
                    clearInterval(interval);
                    const idx = GLOBALS.global_var.sql_tracks.findIndex(item => item.uid === props.track_data.uid);
                    if(idx !== -1 && !is_empty(GLOBALS.global_var.sql_tracks[idx].media_uri))
                        set_is_downloaded(true);
                    return;
                }
                set_downloading_progress(GLOBALS.downloading[index]?.progress);
            }, 4000)
        }
        return () => clearInterval(interval);
    }, []);

	return (
		<TouchableOpacity
            activeOpacity={disabled_from_write_playlist ? 0.9 : 0.2}
			disabled={disabled_from_edit_mode || disabled_from_write_playlist}
			style={{backgroundColor: colors.track, opacity: props.write_playlist_uuid !== undefined && props.write_playlist_uuid !== Constants.library_write_playlist && playlist_saved ? 0.5 : 1}} 
			onLongPress={() => push_track_to_playing_queue(props.track_data)} 
			onPress={() => {if(!disabled_from_full_queue && props.from !== undefined && props.track_callback !== undefined) play(props.track_data, props.from, props.track_callback)}}>
			<View style={styles.track_box}>
				<View style={styles.centered}>
					<Image source={props.track_data.playback!.artwork as {'uri': string}} style={styles.image}></Image>
					{Prefs.get_pref('show_track_duration') && props.track_data.duration !== undefined && 
						<View style={{position: 'absolute', left: duration_to_string(props.track_data.duration).left - 8, bottom: 8, borderRadius: 4, backgroundColor: '#000000a0', padding:1}}>
							<Text style={{color:'white', fontSize:10}}>{duration_to_string(props.track_data.duration).duration}</Text>
						</View>
					}
				</View>
				<View style={{ width: props.write_playlist_uuid != undefined ? '60%' : '65%', top: 5, left: 20 }}>
					<Text style={styles.title} numberOfLines={1} >{Prefs.get_pref('alt_titles') && !is_empty(props.track_data.alt_title) ? props.track_data.alt_title : props.track_data.title}</Text>
					<Text style={styles.artist} numberOfLines={1} >{artist_string(props.track_data)}</Text>
                    { Prefs.get_pref('simple_tags') ? <View style={{flexDirection: 'row'}}>
    					<Text style={styles.album} numberOfLines={1} >{props.track_data.album?.name ?? ""}</Text>
                        {((props.track_data.explicit ?? "NONE") === "EXPLICIT") ? <MaterialIcons name="explicit" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.lyrics_uri)     ? <MaterialIcons name="closed-caption" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.thumbnail_uri)  ? <Ionicons name="image-outline" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {(is_downloaded)                           ? <Ionicons name="save-sharp" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {(is_downloading)                          ? <MaterialIcons name="downloading" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
					</View> : null }
                    { !Prefs.get_pref('simple_tags') ? <View style={{flexDirection: 'row'}}>
                        {(is_downloaded)                           ? <Ionicons name="save-sharp" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.youtube_id)     ? <Ionicons name="logo-youtube" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.imported_id)    ? <Ionicons name="cloud-upload" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.soundcloud_id)  ? <MaterialCommunityIcons name="soundcloud" size={15} color={colors.primary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.spotify_id)     ? <MaterialCommunityIcons name="spotify" size={15} color={colors.secondary} style={styles.icon_thick}/> : null}
                        {!is_empty(props.track_data.applemusic_id)  ? <MaterialCommunityIcons name="apple" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.amazonmusic_id) ? <Ionicons name="logo-amazon" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.thumbnail_uri)  ? <Ionicons name="image-outline" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.lyrics_uri)     ? <MaterialIcons name="closed-caption" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {!is_empty(props.track_data.meta?.unavailable) ? <MaterialCommunityIcons name="file-hidden" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {(is_downloading)                          ? <MaterialIcons name="downloading" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {((props.track_data.explicit ?? "NONE") === "CLEAN") ? <MaterialIcons name="clean-hands" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
                        {((props.track_data.explicit ?? "NONE") === "EXPLICIT") ? <MaterialIcons name="explicit" size={15} color={colors.secondary} style={styles.icon_thin}/> : null}
					</View> : null }
				</View>
				{props.write_playlist_uuid !== undefined && props.playlist_uuid !== Constants.library_write_playlist &&
                    <IoniconsTouchableOpacity on_press={() => {
						insert_into_write_playlist(props.track_data, props.write_playlist_uuid, playlist_saved, set_playlist_saved, props.refresh_data);
						if(props.add_from !== undefined && Prefs.get_pref('add_from_modal')) props.add_from(true, props.track_data);
					}} style={{...styles.centered, paddingRight: 30}} icon_name={!playlist_saved ? "add" : "checkmark"} icon_size={30} icon_color={colors.primary} icon_style={{left: 15}}/>
				}
				{props.edit_mode === "DOWNLOAD" && (!is_downloaded || Prefs.get_pref('can_redownload')) && is_empty(props.track_data.imported_id) && !is_downloading && 
                    <IoniconsTouchableOpacity on_press={() => download_track(props.track_data, is_downloading, set_is_downloading, set_is_downloaded, set_downloading_progress)} style={styles.centered} icon_name='download-outline' icon_size={30} icon_color={is_downloaded && Prefs.get_pref('can_redownload') ? colors.orange : colors.primary} icon_style={{left: 10}}/>
				}
				{is_downloading && 
					<Text style={{color: 'white', alignSelf: 'flex-end', right: 10, bottom: 10}}>{downloading_progress}%</Text>
				}
				{props.edit_mode === "DELETE" && !is_downloading &&
                    <IoniconsTouchableOpacity on_press={() => delete_track(props.track_data, props.write_playlist_uuid, props.refresh_data)} style={styles.centered} icon_name='trash-outline' icon_size={30} icon_color={colors.red} icon_style={styles.else_icon}/>
				}
                {props.edit_mode === "EDIT" && !is_downloading && 
                    <IoniconsTouchableOpacity on_press={() => {}} style={styles.centered} icon_name='pencil-outline' icon_size={30} icon_color={colors.orange} icon_style={styles.else_icon}/>
				}
			</View>
			<View style={styles.line}/>
		</TouchableOpacity>
	);
}

const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	track_box:{
		width: '100%',
		height: 60,
		flexDirection: 'row',
	},
    image:{
		left: 10,
		height: 48,
		width: 60,
		borderRadius: 2,
        resizeMode: "cover",
	},
	text:{
		width: '65%',
		top: 5,
		left: 20
	},
	title:{
		color: colors.title,
		fontSize:15,
	},
	artist:{
		color: colors.subtext,
		fontSize:14
	},
    album:{
		color: colors.deeptext,
		fontSize: 12,
        top: 1,
        marginRight: 4
	},
	line:{
		height: 1,
		backgroundColor: colors.line,
		width: '90%',
		left: 85
	},
	icon_thin:{
		marginRight: 5
	},
    icon_thick:{
		marginRight: 3
	},
	else_icon:{
		right: 10,
		paddingTop: 10,
		paddingBottom: 10,
		paddingLeft: 30,
		paddingRight: 30
	},
    centered:{
        justifyContent: "center"
    }
});

export default TrackComponent;