import React, {useEffect,useState} from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import * as SQLActions from '../../SQLActions';


function Playlist(props) {
	const navigation = useNavigation();

    // useEffect( () => {
	// 	(async function() {
	// 		let storage = await AsyncStorage.getItem(props.title);
	// 		if (storage == null){
	// 			setData([]);
	// 			return;
	// 		}
	// 		let playlists = [];
	// 		storage.toString().split('::').forEach(d => {
	// 			playlists.push(JSON.parse(d));
	// 		});
	// 		setData(playlists);
	// 	})();
	// }, []);

	const [pinned, setPinned] =  useState(props.pinned);

	return(
        <>
			<TouchableOpacity style={styles.button} onPress={async() => { navigation.navigate('PlaylistSubScreen', {title: props.title, setPlaying: props.setPlaying }) } } onLongPress={async() => {Alert.alert(
				"Playlist Edit",
				"Pin or Delete a Playlist",
				[
					{
					text: props.pinned ? "Unpin" : "Pin",
					onPress: async() => {
							if(!await SQLActions.getIsPlaylistsPinned(props.title)){
								await SQLActions.pinUnpinPlaylist(props.title, true)
								setPinned(true)
							}
							else{
								await SQLActions.pinUnpinPlaylist(props.title, false)
								setPinned(false)
							}
						}
					},
					{ text: "Delete", onPress: () => Alert.alert("Confirm?","Confirm Delete this playlist?",
								[
									{
										text: "Confirm Delete",
										onPress: async() => {
											SQLActions.deletePlaylist(props.title)
										}
										},
									{
										text: "Cancel",
										// onPress: () => console.log("Cancel Pressed"),
										style: "cancel"
									}

									
								]) 
					},
					{
					text: "Cancel",
					// onPress: () => console.log("Cancel Pressed"),
					style: "cancel"
					}
				]
				);
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}}>
                <>
					{props.four_track.length == 0 && <Image source={require('../../assets/notfound.png')} style={styles.notfound}/>}
						<View>
                            <View style={{flexDirection: 'row'}}>
                                {props.four_track[2]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[2].video_id}/mqdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderTopLeftRadius: 5}}/>}
                                {props.four_track[3]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[3].video_id}/mqdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderTopRightRadius: 5}}/>}
                            </View>
                            <View style={{flexDirection: 'row'}}>
                                {props.four_track[0]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[0].video_id}/mqdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderBottomLeftRadius: 5}}/>}
                                {props.four_track[1]?.video_id != undefined && <Image source={{uri: `https://img.youtube.com/vi/${props.four_track[1].video_id}/mqdefault.jpg`}} style={{width: 35, height: 35, left: 15, borderBottomRightRadius: 5}}/>}
                            </View>
                        </View>
                    <View style={{flexDirection: 'column', left: 25}}>
                        <Text style={{color: '#FFFFFF', fontSize:15}}>{props.title}</Text>
                        <View style={{flexDirection: 'row', top: 5}}>
                            {pinned && <MaterialIcons name="push-pin" size={22} color='#424ed4' style={styles.icon}/>}
                            <Text style={{color: '#AAAAAA'}}>{props.track_count} Tracks</Text>
                        </View>
                    </View>
                </> 
            </TouchableOpacity>
            <View style={{width:'100%', height: 1, marginLeft:90, backgroundColor: '#303030'}}/>
        </>
	);
}
const styles = StyleSheet.create({
	button:{
		width: '100%',
		height: 80, 
		alignItems: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#000000',
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