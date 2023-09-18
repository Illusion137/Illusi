import React, { Component } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Button ,ActionSheetIOS, Alert } from 'react-native';
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

import GLOBALS from './globals';
import * as SQLActions from './SQLActions';
import * as Prefs from './Preferences'

import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import PlayingSong from './app/screens/subscreens/PlayingSong';
import ExternalServicesScreen from './app/screens/subscreens/ExtraExternalServicesScreen';
import ExtraLinkerScreen from './app/screens/subscreens/ExtraLinkerScreen';
import ExtraBatchDownloaderScreen from './app/screens/subscreens/ExtraBatchDownloaderScreen';
// import RNFetchBlob from "rn-fetch-blob";

// import { Provider } from 'react-redux';
// import { store } from './redux/store';
// import tracksReducer from './redux/tracksReducer'

// LogBox.ignoreLogs([
// 	'Non-serializable values',
// ]);
LogBox.ignoreAllLogs();

const Tab  = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Theme = {
	dark: false,
	colors: {
		primary: '#462cc9',
		background: '#0d1016',
		card: '#131213',
		text: '#ffffff',
		subtext: '#8c939d',
		border: '#222222',
		notification: '#1313ff',
		shelf: '#161B22',
		tabInactive: '#cad1d8',
		line: '#303040',
		searchInput: '#404254',
		searchPlaceholder: '#8080a0',
		inactive: '#8080a0',
		red: '#FF0000',
		playingSong: '#141722',
		playScreen: '#141722',
		track: '#141722',
	},
};

const ExtrasStack = createNativeStackNavigator();

function ExtrasStackScreen() {
  return (
	<ExtrasStack.Navigator options={{headerShown: false}}>
	  <ExtrasStack.Screen name="Extra" component={ExtraScreen} options={{headerShown: false}} />
	  <ExtrasStack.Screen name="Backup, Recover & Transfer" component={ExtraRecoveryScreen} />
	  <ExtrasStack.Screen name="Settings" component={ExtraSettingsScreen} />
	  <ExtrasStack.Screen name="External Services" component={ExternalServicesScreen} />
	  <ExtrasStack.Screen name="Batch Downloader" component={ExtraBatchDownloaderScreen} />
	  <ExtrasStack.Screen name="Linker" component={ExtraLinkerScreen} />
	  {/* <ExtrasStack.Screen name="Backup, Recover & Transfer" component={} /> */}
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
			screenOptions={{headerShown: false, animation:'none', tabBarActiveTintColor: Theme.colors.primary, tabBarInactiveTintColor: Theme.colors.tabInactive, 
			tabBarActiveBackgroundColor:Theme.colors.background, tabBarInactiveBackgroundColor: Theme.colors.background, tabBarStyle:{backgroundColor:Theme.colors.background, height: 90, zIndex:1}}} 
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
		await activateKeepAwakeAsync();
		await SQLActions.recreateAllTables();
		if(await Prefs.isPrefsEmpty())
			await Prefs.resetPrefs();
		await Prefs.fetchAutoLinkedPlaylists();
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
	async downloadVideo(uid, video_id, duration, progressUpdater, startDownloadState, setTrackData = undefined, length = undefined, title = undefined){
		function callback(downloadProgress){
			const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
			let index = GLOBALS.DOWNLOADING.findIndex((item, i) => {
				return item.uid == uid
			})
			if(index !== -1)
				if(GLOBALS.DOWNLOADING[index].progress < progress * 100 + 1){
					GLOBALS.DOWNLOADING[index].progress = Math.floor(progress*100)
					progressUpdater(GLOBALS.DOWNLOADING[index].progress)
				}
		}
		if(setTrackData != undefined){
			setTrackData(title, length - GLOBALS.DOWNLOADING.length)
		}
		  const youtubeURL = 'http://www.youtube.com/watch?v=' + video_id;
		  
		  let downloadURI;
		  //140
		  try {
				
			  downloadURI = await ytdl(youtubeURL, { quality: '18' }); // Low:18 - Med:22 - High:37
			  downloadURI = downloadURI[0].url;
			//   console.log(downloadURI)
		  } catch (error) {
			  GLOBALS.DOWNLOADING.shift()
			  Alert.alert("This file doesn't exist in a mp4 format you may try again but idk man")
			  return
		  }

		GLOBALS.DOWNLOADING.push({uid: uid, progress: 0})
		this.waitFor(() => GLOBALS.DOWNLOADING[0].uid === uid || GLOBALS.DOWNLOADING[1]?.uid === uid || GLOBALS.DOWNLOADING[2]?.uid === uid)
  		.then(async() => {

			  const downloadResumable = FileSystem.createDownloadResumable(downloadURI, FileSystem.documentDirectory + uid + '.mp4', {}, callback);
			  try {
				//   setIsDownloading(true)
				startDownloadState(true)
				  const { uri } = await downloadResumable.downloadAsync();

				  let soundTemp = new Audio.Sound();
				  await soundTemp.loadAsync({uri: uri});
				  let metaData = await soundTemp.getStatusAsync();
				//   console.log(metaData)
				  if(!metaData.isLoaded){
					await soundTemp.unloadAsync();
					throw new Error('No load');
				  }
				  else{
					  await soundTemp.unloadAsync();
				  }

				//   console.log('Finished downloading to ', uri);
		
				  await SQLActions.setTrackAsDownloaded(uid, uid + '.mp4');

				  GLOBALS.DOWNLOADING.shift()
				  if(GLOBALS.DOWNLOADING.length === 0){
					Alert.alert("Finished Download Enqueued Tracks")
				  }
			  } catch (e) {
				//   setIsDownloading(false)
					Alert.alert("Downloading Error","Failed To Download: " + JSON.stringify(uid) + ":\n"+ e);
					GLOBALS.DOWNLOADING.shift()
					if(GLOBALS.DOWNLOADING.length === 0){
						Alert.alert("Finished Download Playlist")
					}
			  }
				startDownloadState(false)
		});
	}
	render(){
		return (
			// <Provider store={store}>
				<NavigationContainer theme={Theme}>
						{this.state.isPlaying && <PlayingSong data={this.state.data} playlist={this.state.playlistName}/>}
						<Stack.Navigator>
							<Stack.Screen name="Tabs" component={Tabs} initialParams={{setPlaying: this.playVideo.bind(this), downloadVideo: this.downloadVideo.bind(this)}} options={{headerShown: false, zIndex: 1}}/>
							<Stack.Screen name="Add To Playlist" component={PlaylistAddSearch} options={{headerShown: true}} />
							<Stack.Screen name="Backup & Recovery" component={ExtraRecoveryScreen}/>
							<Stack.Screen name="Settings" component={ExtraSettingsScreen}/>
							<Stack.Screen name="AddPlaylistFrom" component={AddPlaylistFrom}  options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: '#121212',} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: '#424ed4',
									headerRight: () => (
										<Button
											color='#808080'
											onPress={() => {}}
											title="Next"
										/>
										),
									})} />
							<Stack.Screen name="GetAddPlaylistFrom" component={GetAddPlaylistFrom} options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: '#121212',} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: 'blue',
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