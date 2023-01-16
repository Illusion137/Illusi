import React, { Component } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Button ,ActionSheetIOS, Alert } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';

import PlayingSong from './app/components/PlayingSong';
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
import { activateKeepAwake } from 'expo-keep-awake';

LogBox.ignoreLogs([
	'Non-serializable values were found in the navigation state','Error evaluating injectedJavaScript:','react-native-ytdl is out of date!'
]);
const Tab  = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Theme = {
	dark: false,
	colors: {
		primary: '#424ed4',
		background: '#000000',
		card: '#131213',
		text: '#FFFFFF',
		border: '#222222',
		notification: '#1313ff',
	},
};
  
export class Tabs extends Component {
	constructor (props){
		super(props);
	}
	render(){
		return (
			<Tab.Navigator initialRouteName={'Library'} 
			screenOptions={{headerShown: false, animation:'none', tabBarActiveTintColor: Theme.colors.primary, tabBarInactiveTintColor: '#808080', 
			tabBarActiveBackgroundColor:'#202020', tabBarInactiveBackgroundColor: '#202020', tabBarStyle:{backgroundColor:'#202020', height: 90, zIndex:1}}} 
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
	componentDidMount() {
		activateKeepAwake()
	}
	playVideo(data, playlistName){
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
	async downloadVideo(uuid, video_id, progressUpdater, startDownloadState, setTrackData = undefined, length = undefined, title = undefined){
		function callback(downloadProgress){
			const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
			// console.log(' : ', progress)
			
			if(GLOBALS.DOWNLOADING[0].progress < progress * 100 + 1){
				GLOBALS.DOWNLOADING[0].progress = Math.floor(progress*100)
				progressUpdater(GLOBALS.DOWNLOADING[0].progress)
			}
		}
		GLOBALS.DOWNLOADING.push({uuid: uuid, progress: 0})
		this.waitFor(() => GLOBALS.DOWNLOADING[0].uuid === uuid)
  		.then(async() => {
			if(setTrackData != undefined){
				setTrackData(title, length - GLOBALS.DOWNLOADING.length)
			}
			  const youtubeURL = 'http://www.youtube.com/watch?v=' + video_id;
			  
			  let downloadURI;
			  //140
			  try {
				  downloadURI = await ytdl(youtubeURL, { quality: '140' });
				//   console.log(downloadURI[0].url)
			  } catch (error) {
				  GLOBALS.DOWNLOADING.shift()
				  Alert.alert("This file doesn't exist in a m4a format you may try again but idk man")
				  return
			  }
	  
			  const downloadResumable = FileSystem.createDownloadResumable(downloadURI[0].url, FileSystem.documentDirectory + uuid + '.m4a', {}, callback);
			  try {
				//   setIsDownloading(true)
				startDownloadState(true)
				  const { uri } = await downloadResumable.downloadAsync();
				//   console.log('Finished downloading to ', uri);

				  let storage = await AsyncStorage.getItem('Library');
		
				  let allTracks = JSON.parse(storage);
				  let arraySearchNewTracks = allTracks.map(({video_id}) => video_id)
				  allTracks[arraySearchNewTracks.indexOf(video_id)]['downloaded'] = true;
				  allTracks[arraySearchNewTracks.indexOf(video_id)]['uri'] = uuid + '.m4a';
				  await AsyncStorage.setItem('Library',JSON.stringify(allTracks))
				  GLOBALS.DOWNLOADING.shift()
				  if(GLOBALS.DOWNLOADING.length === 0){
					Alert.alert("Finished Download Playlist")
				  }
			  } catch (e) {
				//   setIsDownloading(false)
				  console.error(e);
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
					{this.state.isPlaying && <PlayingSong data={this.state.data} playlist={this.state.playlistName}/>}
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