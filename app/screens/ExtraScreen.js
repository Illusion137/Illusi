import React, { useState, useEffect, useRef } from 'react';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExtrasSectionButton from '../components/ExtrasSectionButton';
import { useNavigation, useTheme } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import appConfig from '../../app.config';
import { SelectList } from 'react-native-dropdown-select-list';
import GLOBALS from '../../globals';
import * as Sharing from 'expo-sharing';
import WebView from 'react-native-webview';
import * as Battery from 'expo-battery';
import { recreateAllTables, deleteAllTables } from '../../SQLActions';
import * as SQLite from 'expo-sqlite'

function ExtraScreen({route}) {
	const navigation = useNavigation();

    const { colors } = useTheme();
	const styles = themeStyles(colors);

	function setTrackDataFrom(title, position){
		setTrackData({position: position+1, title: title})
	}
	const confirmDeleteDataAlert = () =>
    Alert.alert(
      "Clear All Data",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			
			await GLOBALS.db.closeAsync();
			await GLOBALS.db.deleteAsync();
			GLOBALS.db = SQLite.openDatabase('illusi-db.sqlite3')
			deleteAllTables();
			
			AsyncStorage.clear(); 
			
			for(const file of await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)){
				try {
					// 
					if(!file.includes(RCTAsyncLocalStorage) && file != 'SQLite'){
						await FileSystem.deleteAsync(FileSystem.documentDirectory+file, {idempotent:true});
					}
				} catch (error) {
					
				}
			}
			recreateAllTables();
			
			BackHandler.exitApp() 
		} } ]
    );
	const confirmDeletePlaylistDataAlert = () =>
    Alert.alert(
      "Clear Playlist Data",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			await AsyncStorage.removeItem('Playlists')
			await AsyncStorage.removeItem('RecentPlayed')
		} } ]
    );
	const confirmDownloadPlaylistAlert = () =>
    Alert.alert(
      "Download All Tracks in Playlist",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			if(selected === ""){return}
			if(selected === "Library"){
				let storage = await AsyncStorage.getItem('Library')
				if(storage == null){return}
				let filteredData = JSON.parse(storage).filter(item=>!(item.downloaded || item.imported))
				setEndProgress(filteredData.length)
				for (let i = 0; i < filteredData.length; i++) {
					setTimeout(async() => {
						await route.params?.downloadVideo(filteredData[i].uuid, filteredData[i].video_id, filteredData[i].duration, setDProgress, setIsDownloading, setTrackDataFrom, filteredData.length, filteredData[i].video_name)
					},1000)
				}
			}
			else{
				let storage = await AsyncStorage.getItem('Library')
				if(storage == null){return}
				let libraryMap = new Map(JSON.parse(storage).map((track) => [track.uuid, track]))
				let pstorage = await AsyncStorage.getItem('Playlists')
				let parsedPStorage = JSON.parse(pstorage)
				let pindex = parsedPStorage.findIndex((item,i) => {return item.playlistInfo.title == selected})
				if(pindex === -1) { return }
				let pushData = []
				for(let i = 0; i < parsedPStorage[pindex].playlistInfo.tracks.length; i++){
					pushData.push( libraryMap.get(parsedPStorage[pindex].playlistInfo.tracks[i]) )
				}
				let filteredData = pushData.filter(item=>!(item.downloaded || item.imported))
				setEndProgress(filteredData.length)
				for (let i = 0; i < filteredData.length; i++) {
					setTimeout(async() => {
						await route.params?.downloadVideo(filteredData[i].uuid, filteredData[i].video_id, filteredData[i].duration, setDProgress, setIsDownloading, setTrackDataFrom, filteredData.length, filteredData[i].video_name)
					},1000)
				}
			}
		} } ]
    );

	async function zipData(){
		// console.log(FileSystem.documentDirectory)
		// console.log(await FileSystem.readDirectoryAsync("file:///var/mobile/"))
		const UTI = 'public.item';
		await Sharing.shareAsync(FileSystem.documentDirectory, {UTI});
	}

	useEffect(() => {
		(async function() {
			let pstorage = await AsyncStorage.getItem('Playlists')
			let pushData = []
			pushData.push({key: '0', value: 'Library'})
			if(pstorage != null){
				let parsedPStorage = JSON.parse(pstorage)
				for (let i = 0; i < parsedPStorage.length; i++) {
					pushData.push({key: (i+1).toString(), value: parsedPStorage[i].playlistInfo.title})
				}
			} 
			setPlaylistDownloadData(pushData)
		})()
	}, []);

	const [battery, setBattery] = React.useState(0.0);

	useEffect(() => {
		const intervalId = setInterval(async() => {  //assign interval to a variable to clear it.
			setBattery(await Battery.getBatteryLevelAsync())
		}, 1000)
	  
		return () => clearInterval(intervalId); //This is important
	   
	}, [])
	  
	const [selected, setSelected] = React.useState("");
	const [playlistDownloadData, setPlaylistDownloadData] = React.useState("");
	
	const [isDownloading, setIsDownloading] = React.useState(false);
	const [dProgress, setDProgress] = React.useState(0);
	const [endProgress, setEndProgress] = React.useState(0);

	const [trackData, setTrackData] = React.useState({position: 0, title: "title"});

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<Text style={styles.toptext}>More</Text>
				</View>
			</View>
			{/* <WebView
        style={{ marginTop: 20, width: 320, height: 230 }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        source={{ uri: "https://www.youtube.com/embed/-ZZPOXn6_9w" }}
      /> */}
			<ScrollView>
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

				<Text style={styles.descriptiontxt}>Note that this screen doesn't reload so you may need to reload app to refresh data on this page</Text>
				<Text style={styles.descriptiontxt}>Note 2: When using the playlist downloader don't use the download method from the Library</Text>

				<ExtrasSectionButton showArrow={true} text='Backup, Recover, & Transfer' icon='sync-circle-outline' onPress={async () => {}}/>
				
				<ExtrasSectionButton showArrow={true} text='Settings' icon='settings-outline' onPress={async () => {}}/>
				<ExtrasSectionButton showArrow={true} text='Sleep Timer' icon='timer-outline' onPress={async () => {}}/>
				<ExtrasSectionButton showArrow={true} text='External Services' icon='cog-outline' onPress={async () => {}}/>

				<ExtrasSectionButton showArrow={true} text='Batch Downloader' icon='file-tray-stacked-outline' onPress={async () => {}}/>
				<ExtrasSectionButton showArrow={true} text='Linker' icon='link-outline' onPress={async () => {}}/>
				<ExtrasSectionButton showArrow={true} text='Playlist Converter' icon='list-circle-outline' onPress={async () => {}}/>
				<ExtrasSectionButton showArrow={true} text='Dark Mode' icon='moon-outline' onPress={async () => {}}/>
				<ExtrasSectionButton showArrow={true} text='Themes' icon='brush-outline' onPress={async () => {}}/>

				<ExtrasSectionButton showArrow={true} text='GitHub' icon='logo-github' onPress={async () => {}}/>
				
				<ExtrasSectionButton showArrow={false} text='Zip All Data' icon='file-tray-full-outline' onPress={async () => await zipData()}/>

				<ExtrasSectionButton showArrow={false} text='Clear Playlist Data' icon='trash-outline' onPress={confirmDeletePlaylistDataAlert}/>
				<ExtrasSectionButton showArrow={false} text='Clear All Data' icon='trash-outline' onPress={confirmDeleteDataAlert}/>
				
				<Text style={styles.descriptiontxt}>Illusi Version: {appConfig.version}</Text>
				<Text style={styles.descriptiontxt}>Battery Level: {battery}</Text>
			</ScrollView>
		</View>
	);
}
const themeStyles = (colors) => StyleSheet.create({
	topcontainer:{
		backgroundColor: colors.background,
		flex: 1,
	},
	header:{
		backgroundColor: colors.shelf,
		width: '100%',
		height: '13%',
		top: 0,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	toptext:{
		color: '#FFFFFF',
		fontSize: 18,
		top:10,
		fontWeight: '500'
	},
	descriptiontxt:{
		color: '#A0A0A0',
		marginTop: 10,
		marginBottom: 20,
		marginHorizontal: 12,
		textAlign: 'left'
	},
	line:{
		width: '100%',
		height: 0.8,
		backgroundColor: 'white',
		marginHorizontal: 10,
		top: 50
	}
});
export default ExtraScreen;