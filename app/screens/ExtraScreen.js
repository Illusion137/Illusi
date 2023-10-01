import React, { useState, useEffect, useRef } from 'react';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { View, Text, Animated, StyleSheet, Image, TouchableOpacity, TouchableHighlight, TextInput, Button, ScrollView , Alert, BackHandler, Modal, Pressable} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ExtrasSectionButton from '../components/ExtrasSectionButton';
import { useNavigation, useTheme } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import appConfig from '../../app.config';
import { SelectList } from 'react-native-dropdown-select-list';
import * as GLOBALS from '../../globals';
import * as Sharing from 'expo-sharing';
import WebView from 'react-native-webview';
import * as Battery from 'expo-battery';
import { recreateAllTables, deleteAllTables, deleteAllPlaylists } from '../../SQLActions';
import * as SQLite from 'expo-sqlite'
import * as Prefs from '../../Preferences'
import * as SQLActions from '../../SQLActions';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import CookieManager from '@react-native-community/cookies';

function ExtraScreen({route}) {
	const navigation = useNavigation();

    const { colors } = useTheme();
	const styles = themeStyles(colors);
	
	const darkModeIndexMap = new Map([['ON',0],['OFF',1]])

	let keepPrefs = false;

	const confirmDeleteDataAlert = () =>
    Alert.alert(
      "Clear All Data",
      "Are you sure?",
      [ { text: "Cancel", onPress: () => {keepPrefs = false}},
        { text: "OK", onPress: async() => {
			await GLOBALS.db.closeAsync();
			await GLOBALS.db.deleteAsync();
			GLOBALS.db = SQLite.openDatabase('illusi-db.sqlite3')
			deleteAllTables();
			
			for(const file of await FileSystem.readDirectoryAsync(FileSystem.documentDirectory)){
				try {
					if(!(file.includes("RCTAsyncLocalStorage") || file == 'SQLite' || file == '“RCTAsyncLocalStorage_V1”')){
						await FileSystem.deleteAsync(FileSystem.documentDirectory+file, {idempotent:true});
					}
				} catch (error) {
					console.log(error)
				}
			}
			await SQLActions.deleteCacheDirs();
			await SQLActions.createCacheDirs();
			await recreateAllTables();
			if(!keepPrefs){
				await CookieManager.clearAll();
				await Prefs.resetPrefs();
				keepPrefs=false;
			}
			GLOBALS.SQLTracks = []
			// BackHandler.exitApp() 
		} } ]
    );
	const confirmDeletePlaylistDataAlert = () =>
    Alert.alert(
      "Clear Playlist Data",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			await deleteAllPlaylists();
		} } ]
    );
	const confirmResetPrefsAlert = () =>
    Alert.alert(
      "Reset all settings to defaults?",
      "Are you sure?",
      [ { text: "Cancel"},
        { text: "OK", onPress: async() => {
			await Prefs.resetPrefs();
		} } ]
    );

	async function zipData(){
		const UTI = 'public.item';
		await Sharing.shareAsync(FileSystem.documentDirectory, {UTI});
	}

	const [battery, setBattery] = React.useState(0.0);

	useEffect(() => {
		const intervalId = setInterval(async() => {  //assign interval to a variable to clear it.
			setBattery(await Battery.getBatteryLevelAsync())
		}, 1000)
	  
		return () => clearInterval(intervalId); //This is important
	   
	}, [])

	return (
		<View style={styles.topcontainer}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', bottom: 20, alignItems: 'center'}}>
					<Text style={styles.toptext}>More</Text>
				</View>
			</View>
			<ScrollView>
				<View style={styles.linelong}/>
					<ExtrasSectionButton showArrow={true} text='Backup, Recover, & Transfer' icon='sync-circle-outline' onPress={async () => navigation.navigate('Backup, Recover & Transfer')}/>
				<View style={styles.linelong}/>

				<Text style={styles.descriptiontxt}>Backup your music, transfer your playlists to other devices, recover deleted music and more</Text>
				
				<View style={styles.linelong}/>
					<ExtrasSectionButton showArrow={true} text='Settings' icon='settings-outline' onPress={async () => navigation.navigate('Settings') }/>
					<View style={styles.lineshort}/>	
					<ExtrasSectionButton showArrow={true} text='Sleep Timer' icon='timer-outline' onPress={async () => {}}/>
					<View style={styles.lineshort}/>	
					<ExtrasSectionButton showArrow={true} text='External Services' icon='cog-outline' onPress={async () => navigation.navigate('External Services')}/>
				<View style={styles.linelong}/>

				<Text style={styles.descriptiontxt}>Sign into external Music Services services such as YouTube, YouTube Music, Spotify and Amazon Music for extra features.</Text>

				<View style={styles.linelong}/>
					<ExtrasSectionButton showArrow={true} text='Batch Downloader' icon='file-tray-stacked-outline' onPress={async () => navigation.navigate('Batch Downloader', {'downloadVideo': route.params?.downloadVideo.bind(this)})}/>
					<View style={styles.lineshort}/>	
					<ExtrasSectionButton showArrow={true} text='Linker' icon='link-outline' onPress={async () => navigation.navigate('Linker')}/>
				<View style={styles.linelong}/>

				<Text style={styles.descriptiontxt}>Hard Link playlist and other data from other Music Services. Automatically fetched on app startup.</Text>

				<View style={styles.linelong}/>
					<ExtrasSectionButton showArrow={true} text='Playlist Converter' icon='list-circle-outline' onPress={async () => navigation.navigate('Playlist Converter')}/>
				<View style={styles.linelong}/>

				<Text style={styles.descriptiontxt}>Transfer playlists back to other Music Services.</Text>

				<Text style={styles.descriptiontxt}>Customize all the colors of Illusi; save and share custom themes.</Text>

				<View style={styles.linelong}/>
					<ExtrasSectionButton showArrow={true} text='GitHub' icon='logo-github' onPress={async () => {}}/>
					<View style={styles.lineshort}/>	
					<ExtrasSectionButton showArrow={false} text='Zip All Data' icon='file-tray-full-outline' onPress={async () => await zipData()}/>
					<View style={styles.lineshort}/>
					<ExtrasSectionButton showArrow={false} text='Reset Settings' icon='sync' onPress={confirmResetPrefsAlert}/>
					<View style={styles.lineshort}/>	
					<ExtrasSectionButton showArrow={false} text='Clear Playlist Data' icon='trash-outline' onPress={confirmDeletePlaylistDataAlert}/>
					<View style={styles.lineshort}/>	
					<ExtrasSectionButton showArrow={false} text='Clear All Data' icon='trash-outline' onPress={confirmDeleteDataAlert}/>
					{Prefs.prefs.settings.enable_dev_features && 
						<>
							<View style={styles.lineshort}/>
							<ExtrasSectionButton showArrow={false} text='Clear All Data; Keep Preferences' icon='trash-outline' onPress={() => { keepPrefs=true;confirmDeleteDataAlert();}}/>
						</>
					}
				<View style={styles.linelong}/>
				
				<Text style={styles.descriptiontxt}>Illusi Version: {appConfig.version} Beta</Text>
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
	linelong:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: 'white',
	},
	lineshort:{
		width: "100%",
		height: 0.4,
		opacity: 0.1,
		backgroundColor: 'white',
		marginLeft: 42
	},
	sectionContainer:{
		width: '100%', 
		height: 50, 
		backgroundColor: colors.track, 
		flexDirection: 'row', 
		alignItems: 'center'
	},
	btnsectionText:{
		color: '#FFFFFF',
		fontSize: 16,
		left:20
	}
});
export default ExtraScreen;