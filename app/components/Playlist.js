import React, {useEffect,useState} from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, Alert } from 'react-native';
import { useNavigation,useTheme } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import * as SQLActions from '../../SQLActions';


function Playlist(props) {
	const navigation = useNavigation();

	const { colors } = useTheme();
	const styles = themeStyles(colors);

	const [pinned, setPinned] =  useState(props.pinned);

	return(
        <>
			<TouchableOpacity disabled={props.selectMode || false} style={styles.button} onPress={async() => { navigation.navigate('PlaylistSubScreen', {title: props.title, setPlaying: props.setPlaying, downloadVideo: props.downloadVideo }) } } onLongPress={async() => {Alert.alert(
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
					{props.four_track.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
					{props.four_track.length != 0 && props.four_track.length < 4 && <Image source={props.four_track[0].artwork} style={styles.notfound}/>}
						{props.four_track.length >= 4 &&<View>
							<View style={{flexDirection: 'row'}}>
								{props.four_track[0] != undefined && <Image source={props.four_track[0].artwork} style={{width: 35, height: 35, left: 15, borderTopLeftRadius: 5}}/>}
								{props.four_track[1] != undefined && <Image source={props.four_track[1].artwork} style={{width: 35, height: 35, left: 15, borderTopRightRadius: 5}}/>}
							</View>
							<View style={{flexDirection: 'row'}}>
								{props.four_track[2] != undefined && <Image source={props.four_track[2].artwork} style={{width: 35, height: 35, left: 15, borderBottomLeftRadius: 5}}/>}
								{props.four_track[3] != undefined && <Image source={props.four_track[3].artwork} style={{width: 35, height: 35, left: 15, borderBottomRightRadius: 5}}/>}
							</View>
						</View>}
					<View style={{flexDirection: 'column', left: 25}}>
						<Text style={{color: '#FFFFFF', fontSize:15}}>{props.title}</Text>
						<View style={{flexDirection: 'row', top: 5}}>
							{pinned && <MaterialIcons name="push-pin" size={22} color={colors.primary} style={styles.icon}/>}
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
		alignItems: 'flex-start',
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
export default Playlist;