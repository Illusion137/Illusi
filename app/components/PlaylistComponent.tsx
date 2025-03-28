import {useEffect, useState} from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NavigationProp, useNavigation,useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as GLOBALS from '../../lib-origin/Illusive/src/illusi/src/globals';
import * as SQLPlaylists from '../../lib-origin/Illusive/src/illusi/src/sql/sql_playlists';
import FourTrackArtwork from './FourTrackArtwork';
import { Playlist, Track } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';


export default function PlaylistComponent(props: {
	playlist_data: Playlist
	select?: {
		mode: boolean;
		track: Track;
	}
	compact?: boolean
	refresh_data: () => void
}) {
	const navigation: NavigationProp<any, any> = useNavigation();

	const { colors } = useTheme() as Prefs.Theme;
	const styles = theme_styles(colors);

	const [pinned, set_pinned] = useState(props.playlist_data.pinned);
	const [disabled, set_disabled] = useState(false);

	const select_mode = (props.select?.mode ?? false);
	const compact = (props.compact ?? false);
	const [selected, set_selected] = useState(GLOBALS.global_var.selected_playlists_uuids.has(props.playlist_data.uuid));

	useEffect(() => {
		set_pinned(props.playlist_data.pinned);
	}, [props.playlist_data.pinned]);

	async function is_disabled(): Promise<boolean>{
		if(props.select === undefined) return false;
		return await SQLPlaylists.deep_track_exists_in_playlist(props.playlist_data.uuid, props.select.track)
	}

	useEffect(() => {
		async function init() {
			if(props.select === undefined || disabled === true) return;
			set_disabled(await is_disabled());
		}
		init();
	}, [props.select]);

	function toggle_state(){
		let _selected = !selected; set_selected(_selected); 
		if(_selected){
			GLOBALS.global_var.selected_playlists_uuids.add(props.playlist_data.uuid)
		} else {
			GLOBALS.global_var.selected_playlists_uuids.delete(props.playlist_data.uuid)
		}
	}

	async function on_press(){
		navigation.navigate('Playlist', {uuid: props.playlist_data.uuid}) 
	}

	async function on_hold(){
		Alert.alert(
			"Playlist Edit",
			"Pin or Delete a Playlist",
			[
				{
				text: props.playlist_data.pinned ? "Unpin" : "Pin",
				onPress: async() => {
						if(!(props.playlist_data.pinned ?? false)){
							await SQLPlaylists.pin_unpin_playlist(props.playlist_data.uuid, true)
						}
						else{
							await SQLPlaylists.pin_unpin_playlist(props.playlist_data.uuid, false)
						}
						await props.refresh_data();
					}
				},
				{ text: "Delete", onPress: () => Alert.alert("Confirm?","Confirm Delete this playlist?",
							[
								{
									text: "Confirm Delete",
									onPress: async() => {
										await SQLPlaylists.delete_playlist(props.playlist_data.uuid)
										await props.refresh_data();
									}
									},
								{
									text: "Cancel",
									style: "cancel"
								}
							]) 
				},
				{
				text: "Cancel",
				style: "cancel"
				}
		]);
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
	}

	return(
        <>
			<TouchableOpacity disabled={disabled} style={{...styles.button, opacity: disabled ? 0.5 : 1.0, height: compact ? 55 : 80}} 
					onPress={select_mode ? toggle_state : on_press} 
					onLongPress={select_mode ? () => {} : on_hold}>
				<>
					<View style={{width: 15}}/>
					<FourTrackArtwork thumbnail_uri={props.playlist_data.thumbnail_uri} four_track={props.playlist_data.visual_data!.four_track ?? []} size={compact ? 22 : 35}/>
					<View style={{flexDirection: 'column', left: 25}}>
						<Text style={{color: colors.text, fontSize:15}}>{props.playlist_data.title}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
							{pinned ? <MaterialIcons name="push-pin" size={22} color={colors.primary}/> : null}
							<Text style={{color: colors.subtext}}>{props.playlist_data.visual_data!.track_count} Tracks</Text>
						</View>
					</View>
					{
						!select_mode ? null :
						<View style={{flex:1, justifyContent: 'flex-end', alignItems: 'center'}}>
							<Ionicons name={'checkmark'} size={22} color={selected ? colors.green : "#808080"} style={{ left: 80}}/>
						</View>
					}
                </> 
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: colors.line}}/>
        </>
	);
}
const theme_styles = (colors: Prefs.Theme['colors']) => StyleSheet.create({
	button:{
		width: '100%',
		alignItems: 'center',
        backgroundColor: colors.track,
        flexDirection: 'row'
	},
    notfound:{
		width:70,
		height:70,
		borderRadius: 5,
        left: 15
	}
});