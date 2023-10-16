import React, { Component } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Button ,ActionSheetIOS, Alert, Appearance, Image } from 'react-native';
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
import { searchAmazonMusic } from './app/Illusive/IllusiveSearch';
import ExtraBackpackScreen from './app/screens/subscreens/ExtraBackpackScreen';
// const sha1 = require('js-sha1');

import * as ffmpeg from 'react-native-ffmpeg'

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
	  <ExtrasStack.Screen name="Backpack" component={ExtraBackpackScreen} />
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
					unmountOnBlur: false,
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
				initialParams={{setPlaying: this.props.route.params.setPlaying}}
				options={{
					tabBarIcon: ({ color }) => ( <Ionicons name="search" size={25} color={color}/>),
					unmountOnBlur: false,
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
		isLoading: false
	}
	async componentDidMount() {
		try {
			ffmpeg.RNFFmpegConfig.setLogLevel(ffmpeg.LogLevel.AV_LOG_QUIET)
			statisticsCallback = (statistics) => {
				let index = GLOBALS.DOWNLOADING.findIndex(item => item.executionId == statistics.executionId )
				if(index == -1)
					return;
				const progress = Math.floor(statistics.time/1000) / GLOBALS.DOWNLOADING[index].duration 
				GLOBALS.DOWNLOADING[index].progress = Math.floor(progress*100)
				if(GLOBALS.DOWNLOADING[index].progressUpdater != undefined){
					GLOBALS.DOWNLOADING[index].progressUpdater(GLOBALS.DOWNLOADING[index].progress)
				}
			};
			ffmpeg.RNFFmpegConfig.enableStatisticsCallback(statisticsCallback);
			let allPromises = []
			await SQLActions.recreateAllTables();
			await Prefs.fetchPrefs();
			await SQLActions.fixToNewUpdate();
			await SQLActions.fetchTrackData();
			allPromises.push(SQLActions.cleanupRecentlyPlayed())
			if(Prefs.getExperimentalFeatureEnabled('smart_remove_cached_thumbnails'))
				allPromises.push(SQLActions.cleanCache())
			allPromises.push(activateKeepAwakeAsync());
			allPromises.push(Prefs.deepComparePrefsSchemaAndUpdatePrefsSchema());
			allPromises.push(Prefs.fetchAutoLinkedPlaylists());
			await Promise.all(allPromises)
		} catch (error) {
			Alert.alert("Error", error)
		} finally {
			this.setState({isLoading: true})
			if(Prefs.getExperimentalFeatureEnabled('auto_cache_thumbnails'))
				await SQLActions.refreshCache()
		}
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
		// function callback(downloadProgress){
		// 	const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
		// 	let index = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
		// 	if(index !== -1)
		// 		if(GLOBALS.DOWNLOADING[index].progress < progress * 100 + 1){
		// 			GLOBALS.DOWNLOADING[index].progress = Math.floor(progress*100)
		// 			if(progressUpdater != undefined && GLOBALS.DOWNLOADING[index].progress < 95 ){
		// 				progressUpdater(GLOBALS.DOWNLOADING[index].progress)
		// 			}
		// 		}
		// }
		
		GLOBALS.DOWNLOADING.push({'uid': uid, 'progress': 0, 'progressUpdater': progressUpdater, 'duration': duration})
		let downloadQueueMaxLength = Prefs.prefs?.settings?.download_queue_max_length || 1
		this.waitFor(() => isInDownloadRange(uid,downloadQueueMaxLength))
		.then(async() => {
			  const youtubeURL = 'http://www.youtube.com/watch?v=' + video_id;
			  
			  let downloadURI;
			  //140
			  try {
				let requestOptions = {}
				if(Prefs.prefs.settings.use_cookies_on_download){
					requestOptions = {'headers': {
						'Cookies': Prefs.prefs.external_services.youtube_cookies
					}}
				}
				  downloadURI = await ytdl(youtubeURL, { 'quality': 'lowestaudio', 'requestOptions': requestOptions }); // Low:18 - Med:22 - High:37
				//   console.log(downloadURI)
				//   downloadURI = await ytdl(youtubeURL, { quality: '18' }); // Low:18 - Med:22 - High:37
				  downloadURI = downloadURI[0].url;
			  } catch (error) {
				  if(String(error).includes("Video unavailable")){
					SQLActions.addToBackpack(uid);
				  }
				if(startDownloadState != undefined)
					startDownloadState(false)
				let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
				GLOBALS.DOWNLOADING.splice(itemIndex, 1)
				Alert.alert("Coudln't find the file", uid + ' : ' + error)
				return
			  }
			try {
				if(startDownloadState != undefined)
					startDownloadState(true)

				let newUri = FileSystem.documentDirectory + uid + '.m4a'
				ffmpeg.RNFFmpeg.executeAsync(`-y -i ${downloadURI} ${newUri}`, async() => {
					try {						
						let soundTemp = new Audio.Sound();
						await soundTemp.loadAsync({uri: newUri});
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
				
						await SQLActions.setTrackAsDownloaded(uid, uid + '.m4a');
		
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
					} catch (error) {
						if(startDownloadState != undefined)
						startDownloadState(false)
						Alert.alert("Downloading Error","Failed To Download: " + JSON.stringify(uid) + ":\n"+ error);
						let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
						GLOBALS.DOWNLOADING.splice(itemIndex, 1)
						if(GLOBALS.DOWNLOADING.length === 0){
							Alert.alert("Finished Download Playlist")
						}
					}
				}).then(executionId => {
					let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
					GLOBALS.DOWNLOADING[itemIndex]['executionId'] = executionId;
				})

			  	} catch (e) {
				//   setIsDownloading(false)
					if(startDownloadState != undefined)
						startDownloadState(false)
					Alert.alert("Downloading Error","Failed To Download: " + JSON.stringify(uid) + ":\n"+ e);
					let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == uid)
					GLOBALS.DOWNLOADING.splice(itemIndex, 1)
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
						{!this.state.isLoading && <Image style={{flex:1, backgroundColor: 'black', width: '100%', height: '100%'}} source={require('./assets/splash.png')}/>}
						{this.state.isLoading && <Stack.Navigator>
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
						</Stack.Navigator>}
				</NavigationContainer>
			// </Provider>
		);
	}
}
//headerShown: true, headerStyle: {backgroundColor: '#121212',},headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'