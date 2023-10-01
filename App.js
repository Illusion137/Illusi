import React, { Component } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Button ,ActionSheetIOS, Alert, Appearance } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';

import LibraryScreen from './app/screens/LibraryScreen';
import PlaylistScreen from './app/screens/PlaylistScreen';
import SearchScreen from './app/screens/SearchScreen';
import ExtraScreen from './app/screens/ExtraScreen';
import SearchHomeScreen from './app/screens/SearchHomeScreen'

import AddPlaylistFrom from './app/screens/subscreens/AddPlaylistFrom';
import GetAddPlaylistFrom from './app/screens/subscreens/GetAddPlaylistFrom';
import PlaylistSubScreen from './app/screens/subscreens/PlaylistSubScreen'
import ExtraRecoveryScreen from './app/screens/subscreens/ExtraRecoveryScreen';
import ExtraSettingsScreen from './app/screens/subscreens/ExtraSettingsScreen';
import PlaylistAddSearch from './app/screens/subscreens/PlaylistAddSearch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';
import TrackPlayer, { Capability } from 'react-native-track-player';

import * as GLOBALS from './globals';
import * as SQLActions from './SQLActions';
import * as Prefs from './Preferences'

import * as Haptics from 'expo-haptics';

import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import PlayingSong from './app/screens/subscreens/PlayingSong';
import ExternalServicesScreen from './app/screens/subscreens/ExtraExternalServicesScreen';
import ExtraLinkerScreen from './app/screens/subscreens/ExtraLinkerScreen';
import ExtraBatchDownloaderScreen from './app/screens/subscreens/ExtraBatchDownloaderScreen';
import ExtraSettingsExperimentalFeatures from './app/screens/subscreens/ExtraSettingsExperimentalFeatures';
import ExtraPlaylistConverter from './app/screens/subscreens/ExtraPlaylistConverter';
import axios from 'axios';
// import RNFetchBlob from "rn-fetch-blob";

// import { Provider } from 'react-redux';
// import { store } from './redux/store';
// import tracksReducer from './redux/tracksReducer'

// LogBox.ignoreLogs([
// 	'Non-serializable values',
// ]);
LogBox.ignoreLogs([
	'Non-serializable values were found in the navigation state',
]);  
LogBox.ignoreAllLogs();

const Tab  = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ExtrasStack = createNativeStackNavigator();

function ExtrasStackScreen(props) {
  return (
	<ExtrasStack.Navigator options={{headerShown: false}}>
	  <ExtrasStack.Screen name="Extra" component={ExtraScreen} options={{headerShown: false}} initialParams={{downloadVideo: props.route.params.downloadVideo}} />
	  <ExtrasStack.Screen name="Backup, Recover & Transfer" component={ExtraRecoveryScreen} />
	  <ExtrasStack.Screen name="Settings" component={ExtraSettingsScreen} />
	  <ExtrasStack.Screen name="Experimental Features" component={ExtraSettingsExperimentalFeatures} />
	  <ExtrasStack.Screen name="External Services" component={ExternalServicesScreen} />
	  <ExtrasStack.Screen name="Batch Downloader" component={ExtraBatchDownloaderScreen} options={{}}/>
	  <ExtrasStack.Screen name="Linker" component={ExtraLinkerScreen} />
	  <ExtrasStack.Screen name="Playlist Converter" component={ExtraPlaylistConverter} />
	</ExtrasStack.Navigator>
  );
}

const PlaylistsStack = createNativeStackNavigator();

function PlaylistsStackScreen(props) {
  return (
	<PlaylistsStack.Navigator options={{headerShown: false}}>
	  <PlaylistsStack.Screen initialParams={{setPlaying: props.route.params.setPlaying}} options={{headerShown: false}} name="Playlist" component={PlaylistScreen} />
	  <PlaylistsStack.Screen options={{headerShown: false}} name="PlaylistSubScreen" component={PlaylistSubScreen} />
	</PlaylistsStack.Navigator>
  );
}
export class Tabs extends Component {
	constructor (props){
		super(props);
	}
	render(){
		return (
			<Tab.Navigator initialRouteName={'Library'} 
			screenOptions={{headerShown: false, animation:'none', tabBarActiveTintColor: Prefs.darkThemeDefault.colors.primary, tabBarInactiveTintColor: Prefs.darkThemeDefault.colors.tabInactive, 
			tabBarActiveBackgroundColor:Prefs.darkThemeDefault.colors.background, tabBarInactiveBackgroundColor: Prefs.darkThemeDefault.colors.background, tabBarStyle:{backgroundColor:Prefs.darkThemeDefault.colors.background, height: 90, zIndex:1}}} 
			unmountInactiveScreens={true} detachInactiveScreens={true}>
				<Tab.Screen name="My Library" component={LibraryScreen}
				initialParams={{setPlaying: this.props.route.params.setPlaying, downloadVideo: this.props.route.params.downloadVideo}}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="library-sharp" size={30} color={color}/> ),
					unmountOnBlur: true,
				}}
				
				/>
				<Tab.Screen name="Playlists" component={PlaylistsStackScreen}
				initialParams={{setPlaying: this.props.route.params.setPlaying}}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="musical-notes" size={25} color={color}/>),
					unmountOnBlur: true,
				}}
				/>
				<Tab.Screen name="Search" component={SearchHomeScreen}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="search" size={25} color={color}/>),
				}}
				/>
				<Tab.Screen name="Extras" component={ExtrasStackScreen}
				initialParams={{downloadVideo: this.props.route.params.downloadVideo}}
				options={{
					tabBarIcon: ({ color }) => ( <Entypo name="dots-three-horizontal" size={25} color={color}/>),
				}}
				/>
		  	</Tab.Navigator>
		);
	}
}


export default class App extends Component{
	state = {
		isPlaying: false,
		isPlayingRestart: false,
		data: [],
		playlistName: '',
	}
	async componentDidMount() {
		let allPromises = []
		await Prefs.fetchPrefs();
		// let config = {
		// 	method: 'get',
		// 	maxBodyLength: Infinity,
		// 	url: 'https://www.youtube.com/playlist?list=PLnIB0XeUqT-hKBe6Jtj_C_yZfVGpSy3Uz',
		// 	headers: { 
		// 	  'authority': 'www.youtube.com', 
		// 	  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7', 
		// 	  'accept-language': 'en-US,en;q=0.9', 
		// 	  'cache-control': 'max-age=0', 
		// 	  'Cookies': 'VISITOR_INFO1_LIVE=UndynOG0Vuk; VISITOR_PRIVACY_METADATA=CgJVUxICGgA%3D; _gcl_au=1.1.1654163908.1692824047; LOGIN_INFO=AFmmF2swRAIgb_DfnlDOCMB92erwqc_sH_CpB4KtzNhJYjU1CuXxXEkCIHvBDT5WZwjYdg83tWunFwVkmS01JTxVgX81hC3OqfsB:QUQ3MjNmengyWXFTaHJaSHlZWS00NVhJZ0xWSW5RNmQ4NG45R3lyV0NDR05WZ0dqVllGbDdfeGRkX3hqZHRUSUtIbDlfQThMQTZ3d0RwRmtDWklxMlE0Ui1RZFZhajZITU5RTk5PWEJoS3h0NmRObV90Uk56dHZ2VktURkFEeVRDYU9lYVJUOE1iREd0MVg3ZlI2ODJQREJNLS0zQlhMRWV3; SID=bQgdkMpssHpUHDgFcciNnNw_NyNMRChG7t82C9YE5Wjp87MjzWmCNYZ_90ajMk-xvWpRxg.; __Secure-1PSID=bQgdkMpssHpUHDgFcciNnNw_NyNMRChG7t82C9YE5Wjp87MjDvZY6SmfFiorazcuJ4QhtQ.; __Secure-3PSID=bQgdkMpssHpUHDgFcciNnNw_NyNMRChG7t82C9YE5Wjp87MjSV9SulFnNgBZg8RbZscbFw.; HSID=AmKautbw6k4YOyt90; SSID=AKankHoBJZsx73vzj; APISID=KDAVZ_L7nKQWrkZw/AVCcwbHhDYb0uhTDR; SAPISID=n9T8rzcU26SQRCoz/A7fo727lUFjaLq6tw; __Secure-1PAPISID=n9T8rzcU26SQRCoz/A7fo727lUFjaLq6tw; __Secure-3PAPISID=n9T8rzcU26SQRCoz/A7fo727lUFjaLq6tw; YSC=O44K8c5EADY; PREF=f6=40000080&volume=34&f7=140&tz=America.Phoenix&autoplay=true&f5=20000; __Secure-1PSIDTS=sidts-CjEB3e41hXzDF6khxWMSodXxnZeIlG3cI-ty6eaTuLUGmNBTgQIDhCRJXHRdP_arcYpZEAA; __Secure-3PSIDTS=sidts-CjEB3e41hXzDF6khxWMSodXxnZeIlG3cI-ty6eaTuLUGmNBTgQIDhCRJXHRdP_arcYpZEAA; SIDCC=ACA-OxMNIXK41kR5qYI2m42lbLKJMuqP7r9XigW5uPuk6bSqUXc1u-A779Lu9rNj818dQ67D8P9y; __Secure-1PSIDCC=ACA-OxNP7RLjH_JmNw4x7MPRBnzAPAeYv723TGmzY9fkyqwEVFPy1XprCQn8egNj7KCYJKB7Vqg; __Secure-3PSIDCC=ACA-OxPYB20YtS4bzip8csuUUqpWo2VUMzqOoi-3xtAVtYljGy3lE_lTt47dmNwbEhojeCira44; GPS=1; PREF=f6=40000000&volume=34&f7=140&tz=America.Phoenix&autoplay=true&f5=20000; SIDCC=ACA-OxMHnJ7iFq02jvw6PjBvdT14lL2-6UC_LtqYjxlEwrYvALbaUaOcosu1ZiFpGqZkTU8u81Ib; VISITOR_INFO1_LIVE=UndynOG0Vuk; VISITOR_PRIVACY_METADATA=CgJVUxICGgA%3D; __Secure-1PSIDCC=ACA-OxOc2zhrEgsDXZ2YPI-5tu1kVsMNb6uH3C8ftz2lEOZ5UlJ3h6-0_w8nB2PKHCeNHxhIsRk; __Secure-3PSIDCC=ACA-OxMC5yI7P4VnBykBN0Gr9rM74ZUUWOel3Py-K-BOSdb12Ejh8r1oaWllTbNzTEc5X5yW97Q',  
		// 	  'sec-ch-ua': '"Google Chrome";v="117", "Not;A=Brand";v="8", "Chromium";v="117"', 
		// 	  'sec-ch-ua-arch': '"x86"', 
		// 	  'sec-ch-ua-bitness': '"64"', 
		// 	  'sec-ch-ua-full-version': '"117.0.5938.92"', 
		// 	  'sec-ch-ua-full-version-list': '"Google Chrome";v="117.0.5938.92", "Not;A=Brand";v="8.0.0.0", "Chromium";v="117.0.5938.92"', 
		// 	  'sec-ch-ua-mobile': '?0', 
		// 	  'sec-ch-ua-model': '""', 
		// 	  'sec-ch-ua-platform': '"Windows"', 
		// 	  'sec-ch-ua-platform-version': '"15.0.0"', 
		// 	  'sec-ch-ua-wow64': '?0', 
		// 	  'sec-fetch-dest': 'document', 
		// 	  'sec-fetch-mode': 'navigate', 
		// 	  'sec-fetch-site': 'none', 
		// 	  'sec-fetch-user': '?1', 
		// 	  'service-worker-navigation-preload': 'true', 
		// 	  'upgrade-insecure-requests': '1', 
		// 	  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36', 
		// 	  'x-client-data': 'CKS1yQEIh7bJAQiitskBCKmdygEI6NTKAQiQ+soBCJahywEI85jNAQiFoM0BCNy9zQEI38TNAQi5ys0BCMXRzQEI1NTNAQjM1s0BCOLWzQEI+cDUFRi60s0BGOuNpRc='
		// 	}
		//   };
		  
		//   axios.request(config)
		//   .then((response) => {
		// 	console.log(JSON.stringify(response.data));
		//   })
		//   .catch((error) => {
		// 	console.log(error);
		//   });
		allPromises.push(SQLActions.cleanupRecentlyPlayed())
		allPromises.push(activateKeepAwakeAsync());
		allPromises.push(SQLActions.recreateAllTables());
		allPromises.push(Prefs.deepComparePrefsSchemaAndUpdatePrefsSchema());
		allPromises.push(Prefs.fetchAutoLinkedPlaylists());
		allPromises.push(SQLActions.createCacheDirs());
		Promise.all(allPromises)
	}
	playVideo(data, playlistName){
		this.setState({isPlaying: false}, () => {
			this.setState({data: data})
			this.setState({playlistName: playlistName})
			this.setState({isPlaying: false})
			this.setState({isPlaying: true})
			GLOBALS.IsPlaying = true}
		)
	}
	waitFor(conditionFunction) {
		const poll = resolve => {
			if(conditionFunction()) resolve();
			else setTimeout(_ => poll(resolve), 400);
		}
		
		return new Promise(poll);
	}
	async downloadVideo(uid, video_id, duration, progressUpdater, startDownloadState, setFinishedDownloadedState = undefined){
		function isInDownloadRange(uid, downloadQueueMaxLength){
			for(let i = 0; i < downloadQueueMaxLength; i++){
				if(GLOBALS.DOWNLOADING[i]?.uid === uid)
					return true;
			}
			return false;
		}
		function callback(downloadProgress){
			const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
			let index = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
			if(index !== -1)
				if(GLOBALS.DOWNLOADING[index].progress < progress * 100 + 1){
					GLOBALS.DOWNLOADING[index].progress = Math.floor(progress*100)
					if(progressUpdater != undefined){
						progressUpdater(GLOBALS.DOWNLOADING[index].progress)
					}
				}
		}
		
		GLOBALS.DOWNLOADING.push({uid: uid, progress: 0})
		let downloadQueueMaxLength = Prefs.prefs?.settings?.download_queue_max_length || 1
		this.waitFor(() => isInDownloadRange(uid,downloadQueueMaxLength))
		.then(async() => {
			  const youtubeURL = 'http://www.youtube.com/watch?v=' + video_id;
			  
			  let downloadURI;
			  //140
			  try {
				  downloadURI = await ytdl(youtubeURL, { quality: '18' }); // Low:18 - Med:22 - High:37
				  downloadURI = downloadURI[0].url;
			  } catch (error) {
				  let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
				  GLOBALS.DOWNLOADING.splice(itemIndex, 1)
				  Alert.alert("This file doesn't exist in a mp4 format you may try again but idk man")
				  return
			  }
			const downloadResumable = FileSystem.createDownloadResumable(downloadURI, FileSystem.documentDirectory + uid + '.mp4', {}, callback);
			try {
				if(startDownloadState != undefined)
					startDownloadState(true)
				const { uri } = await downloadResumable.downloadAsync();

				let soundTemp = new Audio.Sound();
				await soundTemp.loadAsync({uri: uri});
				let metaData = await soundTemp.getStatusAsync();
				if(!metaData.isLoaded){
					await soundTemp.unloadAsync();
					throw new Error('No load');
				} else if(Math.round(metaData.durationMillis/1000) < 3){
					await soundTemp.unloadAsync();
					throw new Error('Invalid Duration');
				}
				else{
					await soundTemp.unloadAsync();
				}

		
				await SQLActions.setTrackAsDownloaded(uid, uid + '.mp4');

				let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
				GLOBALS.DOWNLOADING.splice(itemIndex, 1)
				
				await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
				
				if(GLOBALS.DOWNLOADING.length === 0){
					Alert.alert("Finished Download Enqueued Tracks")
				}
				if(startDownloadState != undefined)
					startDownloadState(false)
				if(setFinishedDownloadedState != undefined)
					setFinishedDownloadedState(true)
			  	} catch (e) {
				//   setIsDownloading(false)
					Alert.alert("Downloading Error","Failed To Download: " + JSON.stringify(uid) + ":\n"+ e);
					GLOBALS.DOWNLOADING.shift()
					if(GLOBALS.DOWNLOADING.length === 0){
						Alert.alert("Finished Download Playlist")
					}
			  	}
		});
	}
	render(){
		return (
			// <Provider store={store}>
				<NavigationContainer theme={Prefs.darkThemeDefault}>
						{this.state.isPlaying && <PlayingSong data={this.state.data} playlist={this.state.playlistName}/>}
						<Stack.Navigator>
							<Stack.Screen name="Tabs" component={Tabs} initialParams={{setPlaying: this.playVideo.bind(this), downloadVideo: this.downloadVideo.bind(this)}} options={{headerShown: false, zIndex: 1}}/>
							<Stack.Screen name="Add To Playlist" component={PlaylistAddSearch} options={{headerShown: true}} />
							<Stack.Screen name="Backup & Recovery" component={ExtraRecoveryScreen}/>
							<Stack.Screen name="Settings" component={ExtraSettingsScreen}/>
							<Stack.Screen name="AddPlaylistFrom" component={AddPlaylistFrom}  options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: Prefs.darkThemeDefault.colors.background,} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: Prefs.darkThemeDefault.colors.primary,
									headerRight: () => (
										<Button
											color='#808080'
											onPress={() => {}}
											title="Next"
										/>
										),
									})} />
							<Stack.Screen name="GetAddPlaylistFrom" component={GetAddPlaylistFrom} options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: Prefs.darkThemeDefault.colors.background,} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: 'blue',
									headerRight: () => (
										<Button
											color='#1313ff'
											onPress={() => ActionSheetIOS.showActionSheetWithOptions(
												{
												options: ['Cancel', 'Save Playlist', 'Add Tracks To Library'],
												cancelButtonIndex: 0,
												userInterfaceStyle: 'dark',
												
												},
												(buttonIndex) => {
												if (buttonIndex === 0) {
												} else if (buttonIndex === 1) {
												} else if (buttonIndex === 2) {
												}
												}
											)
										}
											title="Save"
										/>
										),
									})}/>
						</Stack.Navigator>
				</NavigationContainer>
			// </Provider>
		);
	}
}
//headerShown: true, headerStyle: {backgroundColor: '#121212',},headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'