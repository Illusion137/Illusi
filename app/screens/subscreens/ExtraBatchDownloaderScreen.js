import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler, Modal, Pressable} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLActions from '../../../SQLActions';

import { useNavigation, useTheme } from '@react-navigation/native';

function ExtraBatchDownloaderScreen(props) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);

	function setTrackDataFrom(title, position){
		setTrackData({position: position+1, title: title})
	}

	useEffect(() => {
		(async function() {
			let playlists_names = await SQLActions.getAllPlaylists();
			console.log(playlists_names)
			let pushData = []
			pushData.push({key: '0', value: 'Library'})
			for (let i = 0; i < playlists_names.length; i++) {
				pushData.push({key: (i+1).toString(), value: playlists_names[i].playlist_name})
			}
			setPlaylistDownloadData(pushData)
		})()
	}, []);

	const confirmDownloadPlaylistAlert = () =>
    Alert.alert(
      "Download All Tracks in Playlist",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			if(selected === ""){return}
			if(selected === "Library"){
				let filteredData = GLOBALS.SQLTracks.filter(item=>!(item.downloaded || item.imported))
				setEndProgress(filteredData.length)
				for (let i = 0; i < filteredData.length; i++) {
					setTimeout(async() => {
						await route.params?.downloadVideo(filteredData[i].uid, filteredData[i].video_id, filteredData[i].duration, setDProgress, setIsDownloading, setTrackDataFrom, filteredData.length, filteredData[i].video_name)
					},1000)
				}
			}
			else{
				let selected_playlist = selected;
				let playlistTracks = await SQLActions.getPlaylistTracks(selected_playlist.replaceAll(' ', '_'));

				let filteredData = playlistTracks.filter(item=>!(item.downloaded || item.imported))
				setEndProgress(filteredData.length)
				for (let i = 0; i < filteredData.length; i++) {
					setTimeout(async() => {
						await route.params?.downloadVideo(filteredData[i].uid, filteredData[i].video_id, filteredData[i].duration, setDProgress, setIsDownloading, setTrackDataFrom, filteredData.length, filteredData[i].video_name)
					},1000)
				}
			}
		} } ]
    );

	const [selected, setSelected] = React.useState("");
	const [playlistDownloadData, setPlaylistDownloadData] = React.useState("");
	
	const [isDownloading, setIsDownloading] = React.useState(false);
	const [dProgress, setDProgress] = React.useState(0);
	const [endProgress, setEndProgress] = React.useState(0);

	const [trackData, setTrackData] = React.useState({position: 0, title: "title"});

	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>
				<SelectList 
					setSelected={(val) => setSelected(val)}
					data={playlistDownloadData} 
					save="value"
					inputStyles={{backgroundColor: 'white'}}
					boxStyles={{backgroundColor: 'white'}}
					dropdownStyles={{backgroundColor: 'white'}}
				/>
				<ExtrasSectionButton showArrow={false} text='Download all From Playlist' icon='archive-outline' onPress={confirmDownloadPlaylistAlert}/>

				{isDownloading && <Text style={{color: 'white', alignSelf: 'flex-end', right: 10, width: '95%'}}>{trackData.title}: {dProgress}% {trackData.position}/{endProgress} Tracks Completed</Text>}
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
    descriptiontxt:{
		color: '#A0A0A0',
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
	},
});
export default ExtraBatchDownloaderScreen;