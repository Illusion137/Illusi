import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler, Modal, Pressable, FlatList} from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';
import ExtrasSectionButton from '../../components/ExtrasSectionButton';
import * as SQLActions from '../../../SQLActions';
import * as GLOBALS from '../../../globals';
import { useNavigation, useTheme } from '@react-navigation/native';
import { darkThemeDefault } from '../../../Preferences';

function ExtraBatchDownloaderScreen() {
	const { colors } = useTheme() as typeof darkThemeDefault;
	const styles = themeStyles(colors);
	
	const [downloadingTracksData, setDownloadingTracksData] = React.useState([...GLOBALS.DOWNLOADING]);
	const [selected, setSelected] = React.useState("");
	const [playlistDownloadData, setPlaylistDownloadData] = React.useState([] as {key: string, value: string}[]);
	
	const confirmDownloadPlaylistAlert = () =>
    Alert.alert(
		"Download All Tracks in Playlist",
		"Are you sure?",
		[ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			if(selected === ""){return}
			if(selected === "Library"){
				let filteredData = GLOBALS.global_var.SQLTracks.filter(item=>!(item.downloaded || item.imported))
				for (let i = 0; i < filteredData.length; i++) {
					GLOBALS.global_var.downloadTrack(filteredData[i], undefined, undefined, undefined);
				}
			}
			else{
				let selected_playlist = selected;
				let playlistTracks = await SQLActions.getPlaylistTracks(selected_playlist);
				
				let filteredData = playlistTracks.filter(item=>!(item.downloaded || item.imported))
				for (let i = 0; i < filteredData.length; i++) {
					GLOBALS.global_var.downloadTrack(filteredData[i], undefined, undefined, undefined);
				}
			}
		} } ]
	);

	useEffect(() => {
		(async function() {
			let playlists_names = await SQLActions.getAllPlaylists();
			let pushData = []
			pushData.push({key: '0', value: 'Library'})
			for (let i = 0; i < playlists_names.length; i++) {
				pushData.push({key: (i+1).toString(), value: playlists_names[i].playlist_name})
			}
			setPlaylistDownloadData(pushData)
		})()
		const interval = setInterval(() => {
			setDownloadingTracksData([...GLOBALS.DOWNLOADING]);
        }, 100);
  
        //Clearing the interval
        return () => clearInterval(interval);
	}, []);
	
	const renderHeaderItem = (item: {item: any}) => <>
		<Text style={{color: 'white', alignSelf: 'flex-end', right: 10, width: '95%', fontWeight: 'bold'}}>{downloadingTracksData.length} Tracks Remaining</Text>
		<View style={{height: 8}}/>
		<View style={styles.linelong}/>
		<View style={{height: 30}}/>
	</>;
	const renderItem = (item: {item: {uid: string, progress: number}}) => 
	<>
		<View style={{height:8}}/>
		<View style={{flexDirection: 'row'}}>
			<Text numberOfLines={1} style={{color: '#aaaaaa', width: '88%'}}>
				{item.item.uid.replace(/-.+/,'')}: 
			</Text>
			<Text style={{color: 'white', alignSelf: 'flex-end'}}>
				{item.item.progress}%
			</Text>
		</View>
		<View style={{height:8}}/>
		<View style={styles.linelong}/>
	</>;


	return(
		<View style={{backgroundColor: colors.background, width: '100%', flex: 1,}}>
				<SelectList 
					setSelected={(value: string) => setSelected(value)}
					data={playlistDownloadData} 
					save="value"
					arrowicon={<></>}
					searchicon={<></>}
					searchPlaceholder={"Select Playlist"}
					placeholder='Select Playlist'
					inputStyles={{backgroundColor: colors.track, color: 'white'}}
					boxStyles={{backgroundColor: colors.track, borderColor: colors.primary, borderRadius: 5}}
					dropdownStyles={{backgroundColor: colors.track}}
					dropdownTextStyles={{color: 'white'}}
				/>
				<ExtrasSectionButton show_arrow={false} text='Download all From Playlist' icon='archive-outline' onPress={confirmDownloadPlaylistAlert}/>
				<View style={{height: 15}}/>
				<FlatList 
					data={downloadingTracksData} 
					ListHeaderComponent={ renderHeaderItem }
					renderItem={renderItem}
				/>
		</View>
	);
}
const themeStyles = (colors: typeof darkThemeDefault.colors) => StyleSheet.create({
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
export default ExtraBatchDownloaderScreen;