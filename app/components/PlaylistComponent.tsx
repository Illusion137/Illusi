import React, {useState} from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { NavigationProp, useNavigation,useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import * as SQLActions from '../../lib-origin/Illusive/src/illusi/src/sql_actions';
import FourTrackArtwork from './FourTrackArtwork';
import { Playlist } from '../../lib-origin/Illusive/src/types';
import { Prefs } from '../../lib-origin/Illusive/src/prefs';


export default function PlaylistComponent(props: {
	playlist_data: Playlist
	select_mode?: boolean
	refresh_data: () => void
}) {
	const navigation: NavigationProp<any, any> = useNavigation();

	const { colors } = useTheme() as typeof Prefs.dark_theme;
	const styles = theme_styles(colors);

	const [pinned, _] = useState(props.playlist_data.pinned);

	return(
        <>
			<TouchableOpacity disabled={props.select_mode || false} style={styles.button} onPress={async() => { navigation.navigate('Playlist', {uuid: props.playlist_data.uuid}) } } onLongPress={async() => {Alert.alert(
				"Playlist Edit",
				"Pin or Delete a Playlist",
				[
					{
					text: props.playlist_data.pinned ? "Unpin" : "Pin",
					onPress: async() => {
							if(!await SQLActions.is_playlist_pinned(props.playlist_data.uuid)){
								await SQLActions.pin_unpin_playlist(props.playlist_data.uuid, true)
							}
							else{
								await SQLActions.pin_unpin_playlist(props.playlist_data.uuid, false)
							}
							await props.refresh_data();
						}
					},
					{ text: "Delete", onPress: () => Alert.alert("Confirm?","Confirm Delete this playlist?",
								[
									{
										text: "Confirm Delete",
										onPress: async() => {
											await SQLActions.delete_playlist(props.playlist_data.uuid)
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
				]
				); await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}}>
                <>
					<View style={{width: 15}}/>
					<FourTrackArtwork four_track={props.playlist_data.visual_data!.four_track ?? []} size={35}/>
					<View style={{flexDirection: 'column', left: 25}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.playlist_data.title}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
							{pinned ? <MaterialIcons name="push-pin" size={22} color={colors.primary}/> : null}
							<Text style={{color: '#AAAAAA'}}>{props.playlist_data.visual_data!.track_count} Tracks</Text>
						</View>
					</View>
                </> 
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const theme_styles = (colors: typeof Prefs.dark_theme.colors) => StyleSheet.create({
	button:{
		width: '100%',
		height: 80, 
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