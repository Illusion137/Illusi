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
import YTDL from "./app/Illusive/IllusiveYTDL";
import AsyncStorage from '@react-native-async-storage/async-storage';
import ytdl from "react-native-ytdl"
import * as FileSystem from 'expo-file-system';
import TrackPlayer, { Capability } from 'react-native-track-player';
import GLOBALS from './globals';
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import PlayVideoScreen from './app/screens/subscreens/PlayVideoScreen';
import RNFetchBlob from "rn-fetch-blob";

import * as SQLite from 'expo-sqlite'


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
		shelf: '#171a21',
		tabInactive: '#cad1d8',
		line: '#303040',
		searchInput: '#404254',
		searchPlaceholder: '#8080a0',
		inactive: '#8080a0',
		red: '#FF0000',
		playingSong: '#141722',
	},
};
  
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
				<Tab.Screen name="Playlists" component={PlaylistScreen}
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
				<Tab.Screen name="Extras" component={ExtraScreen}
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
		data: [],
		playlistName: '',
	}
	async componentDidMount() {
		await activateKeepAwakeAsync();
	}
	playVideo(data, playlistName){
		console.log(data)
		this.setState({isPlaying: false});
		this.setState({data: data})
		this.setState({playlistName: playlistName})
		this.setState({isPlaying: true});
		GLOBALS.IsPlaying = true
	}
	waitFor(conditionFunction) {
		
		const poll = resolve => {
			if(conditionFunction()) resolve();
			else setTimeout(_ => poll(resolve), 400);
		}
		
		return new Promise(poll);
	}
	async downloadVideo(uuid, video_id, duration, progressUpdater, startDownloadState, setTrackData = undefined, length = undefined, title = undefined){
		function callback(downloadProgress){
			const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
			
			if(GLOBALS.DOWNLOADING[0].progress < progress * 100 + 1){
				GLOBALS.DOWNLOADING[0].progress = Math.floor(progress*100)
				progressUpdater(GLOBALS.DOWNLOADING[0].progress)
			}
		}
		if(setTrackData != undefined){
			setTrackData(title, length - GLOBALS.DOWNLOADING.length)
		}
		  const youtubeURL = 'http://www.youtube.com/watch?v=' + video_id;
		  
		  let downloadURI;
		  //140
		  try {
				
			  downloadURI = await ytdl(youtubeURL); // Low:18 - Med:22 - High:37
			  downloadURI = downloadURI[0].url;
			  console.log(downloadURI)
		  } catch (error) {
			  GLOBALS.DOWNLOADING.shift()
			  Alert.alert("This file doesn't exist in a mp4 format you may try again but idk man")
			  return
		  }

		GLOBALS.DOWNLOADING.push({uuid: uuid, progress: 0})
		this.waitFor(() => GLOBALS.DOWNLOADING[0].uuid === uuid)
  		.then(async() => {

			  const downloadResumable = FileSystem.createDownloadResumable(downloadURI, FileSystem.documentDirectory + uuid + '.mp4', {}, callback);
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

				  let storage = await AsyncStorage.getItem('Library');
		
				  let allTracks = JSON.parse(storage);
				  let arraySearchNewTracks = allTracks.map(({video_id}) => video_id)
				  allTracks[arraySearchNewTracks.indexOf(video_id)]['downloaded'] = true;
				  allTracks[arraySearchNewTracks.indexOf(video_id)]['uri'] = uuid + '.mp4';
				  await AsyncStorage.setItem('Library',JSON.stringify(allTracks))
				  GLOBALS.DOWNLOADING.shift()
				  if(GLOBALS.DOWNLOADING.length === 0){
					Alert.alert("Finished Download Enqueued Tracks")
				  }
			  } catch (e) {
				//   setIsDownloading(false)
					Alert.alert("Downloading Error","Failed To Download: "+JSON.stringify(GLOBALS.DOWNLOADING[0]) + ":\n"+ e);
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
			<NavigationContainer theme={Theme}>
					{this.state.isPlaying && <PlayVideoScreen data={this.state.data} playlist={this.state.playlistName}/>}
					<Stack.Navigator>
						<Stack.Screen name="Tabs" component={Tabs} initialParams={{setPlaying: this.playVideo.bind(this), downloadVideo: this.downloadVideo.bind(this)}} options={{headerShown: false, zIndex: 1}}/>
						<Stack.Screen name="PlaylistSubScreen" component={PlaylistSubScreen} options={{headerShown: false}}/>
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
		);
	}
}
//headerShown: true, headerStyle: {backgroundColor: '#121212',},headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'