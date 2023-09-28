import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler, Modal, Pressable, FlatList} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLActions from '../../../SQLActions';
import * as GLOBALS from '../../../globals';
import { useNavigation, useTheme } from '@react-navigation/native';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import * as NetInfo from '@react-native-community/netinfo'
import * as EImage from 'expo-image'
import * as IMGPickExpo from 'expo-image-picker'
import * as NetExpo from 'expo-network'
import * as CelluarExpo from 'expo-cellular'
import * as BlurExpo from 'expo-blur'
import * as AVExpo from 'expo-av'

function ExtraPlaylistConverter({route}) {
	const { colors } = useTheme();
	const styles = themeStyles(colors);
	
	const confirmDownloadPlaylistAlert = () =>
    Alert.alert(
		"Download All Tracks in Playlist",
		"Are you sure?",
		[ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			if(selected === ""){return}
			if(selected === "Library"){
				let filteredData = GLOBALS.SQLTracks.filter(item=>!(item.downloaded || item.imported))
				for (let i = 0; i < filteredData.length; i++) {
					await route.params?.downloadVideo(filteredData[i].uid, filteredData[i].video_id, filteredData[i].duration, undefined, undefined)
				}
			}
			else{
				let selected_playlist = selected;
				let playlistTracks = await SQLActions.getPlaylistTracks(selected_playlist.replaceAll(' ', '_'));
				
				let filteredData = playlistTracks.filter(item=>!(item.downloaded || item.imported))
				for (let i = 0; i < filteredData.length; i++) {
					await route.params?.downloadVideo(filteredData[i].uid, filteredData[i].video_id, filteredData[i].duration, undefined, undefined)
				}
			}
		} } ]
	);

	const [selected, setSelected] = React.useState("");
	const [playlistDownloadData, setPlaylistDownloadData] = React.useState("");

	return(
		<View style={{backgroundColor: colors.backgroundColor, width: '100%', flex: 1,}}>
				<SelectList 
					setSelected={(val) => setSelected(val)}
					data={playlistDownloadData} 
					save="value"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Illusi Playlist"}
					placeholder='Select Illusi Playlist'
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>
				<ExtrasSectionButton showArrow={false} text='Download all From Playlist' icon='archive-outline' onPress={confirmDownloadPlaylistAlert}/>
				<View style={{height: 15}}/>
				{/* <SegmentedControl 
					values={['One', 'Two']}
					selectedIndex={0}
					onChange={(event) => {}}
				/> */}
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
	linelong:{
		width: "100%",
		height: 0.4,
		opacity: 0.2,
		backgroundColor: 'white',
	},
});
export default ExtraPlaylistConverter;