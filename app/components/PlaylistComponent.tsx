import React, {useEffect,useState} from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, Alert } from 'react-native';
import { NavigationProp, useNavigation,useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import * as SQLActions from '../../SQLActions';
import FourTrackArtwork from './FourTrackArtwork';
import { Track } from '../../types';


export default function PlaylistComponent(props: {
	title: string 
	pinned: boolean 
	four_track: Track[] 
	track_count: number
	select_mode?: boolean
	refreshData: () => void
}) {
	const navigation: NavigationProp<any, any> = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [pinned, setPinned] = useState(props.pinned);

	return(
        <>
			<TouchableOpacity disabled={props.select_mode || false} style={styles.button} onPress={async() => { navigation.navigate('Playlist', {title: props.title}) } } onLongPress={async() => {Alert.alert(
				"Playlist Edit",
				"Pin or Delete a Playlist",
				[
					{
					text: props.pinned ? "Unpin" : "Pin",
					onPress: async() => {
							if(!await SQLActions.getIsPlaylistsPinned(props.title)){
								await SQLActions.pinUnpinPlaylist(props.title, true)
							}
							else{
								await SQLActions.pinUnpinPlaylist(props.title, false)
							}
							await props.refreshData();
						}
					},
					{ text: "Delete", onPress: () => Alert.alert("Confirm?","Confirm Delete this playlist?",
								[
									{
										text: "Confirm Delete",
										onPress: async() => {
											await SQLActions.deletePlaylist(props.title)
											await props.refreshData();
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
					<FourTrackArtwork four_track={props.four_track} size={35}/>
					<View style={{flexDirection: 'column', left: 25}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.title}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
							{pinned && <MaterialIcons name="push-pin" size={22} color={colors.primary}/>}
							<Text style={{color: '#AAAAAA'}}>{props.track_count} Tracks</Text>
						</View>
					</View>
                </> 
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const themeStyles = (colors) => StyleSheet.create({
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