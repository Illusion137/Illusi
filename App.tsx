import React, { Component, useEffect, useState } from 'react';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox, Button ,ActionSheetIOS, Alert, Appearance, Image, View } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';

import LibraryScreen from './app/screens/LibraryScreen';
import PlaylistScreen from './app/screens/PlaylistScreen';
import SearchScreen from './app/screens/SearchScreen';
import ExtraScreen from './app/screens/ExtraScreen';
import SearchHomeScreen from './app/screens/SearchHomeScreen'

import SelectImportMusicServicePlaylist from './app/screens/subscreens/SelectImportMusicServicePlaylist';
import ImportMusicServicePlaylist from './app/screens/subscreens/ImportMusicServicePlaylist';
import Playlist from './app/screens/subscreens/Playlist'
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
import ExternalServicesScreen from './app/screens/subscreens/ExtraExternalServicesScreen';
import ExtraLinkerScreen from './app/screens/subscreens/ExtraLinkerScreen';
import ExtraBatchDownloaderScreen from './app/screens/subscreens/ExtraBatchDownloaderScreen';
import ExtraSettingsExperimentalFeatures from './app/screens/subscreens/ExtraSettingsExperimentalFeatures';
import ExtraPlaylistConverter from './app/screens/subscreens/ExtraPlaylistConverter';
import axios from 'axios';
import { searchAmazonMusic } from './app/Illusive/IllusiveSearch';
import ExtraBackpackScreen from './app/screens/subscreens/ExtraBackpackScreen';
// const sha1 = require('js-sha1');
import useStateWithCallback from 'use-state-with-callback';
import * as ffmpeg from 'react-native-ffmpeg'
import { DownloadTrackResult, PlayingState, SetState, Track } from './types';
import { swapItems } from './app/Illusive/Utils';
import AudioPlayer from './app/screens/subscreens/AudioPlayer';
import ExtraDeveloperScreen from './app/screens/subscreens/ExtraDeveloperScreen';

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

function ExtrasStackScreen(){
	return (
	<ExtrasStack.Navigator screenOptions={{headerShown: true}}>
	  <ExtrasStack.Screen name="Extra" component={ExtraScreen} options={{headerShown: false}}/>
	  <ExtrasStack.Screen name="Backup, Recover & Transfer" component={ExtraRecoveryScreen} />
	  <ExtrasStack.Screen name="Settings" component={ExtraSettingsScreen} />
	  <ExtrasStack.Screen name="Experimental Features" component={ExtraSettingsExperimentalFeatures} />
	  <ExtrasStack.Screen name="External Services" component={ExternalServicesScreen} />
	  <ExtrasStack.Screen name="Batch Downloader" component={ExtraBatchDownloaderScreen} options={{}}/>
	  <ExtrasStack.Screen name="Linker" component={ExtraLinkerScreen} />
	  <ExtrasStack.Screen name="Playlist Converter" component={ExtraPlaylistConverter} />
	  <ExtrasStack.Screen name="Backpack" component={ExtraBackpackScreen} />
	  <ExtrasStack.Screen name="Developer" component={ExtraDeveloperScreen} />
	</ExtrasStack.Navigator>
  );
}

const PlaylistsStack = createNativeStackNavigator();

function PlaylistsStackScreen() {
  return (
	<PlaylistsStack.Navigator screenOptions={{headerShown: false}}>
	  <PlaylistsStack.Screen options={{headerShown: false}} name="PlaylistScreen" component={PlaylistScreen} />
	  <PlaylistsStack.Screen options={{headerShown: false}} name="Playlist" component={Playlist} />
	</PlaylistsStack.Navigator>
  );
}


function Tabs() {
	return (
		<Tab.Navigator initialRouteName={'My Library'} 
		screenOptions={{headerShown: false, tabBarActiveTintColor: Prefs.darkThemeDefault.colors.primary, tabBarInactiveTintColor: Prefs.darkThemeDefault.colors.tabInactive, 
		tabBarActiveBackgroundColor:Prefs.darkThemeDefault.colors.background, tabBarInactiveBackgroundColor: Prefs.darkThemeDefault.colors.background, tabBarStyle:{backgroundColor:Prefs.darkThemeDefault.colors.background, height: 90, zIndex:1}}} 
		detachInactiveScreens={true}
		>
		<Tab.Screen name="My Library" component={LibraryScreen}
			options={{
				tabBarIcon: ({ color }) => ( <Ionicons name="library-sharp" size={30} color={color}/> ),
				unmountOnBlur: false,
			}}
		/>
		<Tab.Screen name="Playlists" component={PlaylistsStackScreen}
			options={{
				tabBarIcon: ({ color }) => ( <Ionicons name="musical-notes" size={25} color={color}/>),
				unmountOnBlur: true,
			}}
			/>
		<Tab.Screen name="Search" component={SearchHomeScreen}
			options={{
				tabBarIcon: ({ color }) => ( <Ionicons name="search" size={25} color={color}/>),
				unmountOnBlur: false,
			}}
			/>
		<Tab.Screen name="Extras" component={ExtrasStackScreen}
			options={{
				tabBarIcon: ({ color }) => ( <Entypo name="dots-three-horizontal" size={25} color={color}/>),
			}}
		/>
		</Tab.Navigator>
	)
}

export default function App() {
	const [playingTracks, setPlayingTracks] = useState([] as Track[]);
	const [playingFrom, setPlayingFrom] = useState("");
	const [isPlaying, setIsPlaying] = useState("OFF" as PlayingState);
	const [isLoading, setIsLoading] = useState(true);
	
	useEffect(() => {
		(async function() {
			try {
				GLOBALS.global_var.playTracks = playTracks;
				GLOBALS.global_var.downloadTrack = downloadTrack;
				ffmpeg.RNFFmpegConfig.setLogLevel(ffmpeg.LogLevel.AV_LOG_QUIET)
				const statisticsCallback = (statistics: ffmpeg.Statistics) => {
					let index = GLOBALS.DOWNLOADING.findIndex(item => item.execution_id == statistics.executionId )
					if(index == -1)
						return;
					const progress = Math.floor(statistics.time/1000) / GLOBALS.DOWNLOADING[index].duration 
					GLOBALS.DOWNLOADING[index].progress = Math.floor(progress*100)
					if(GLOBALS.DOWNLOADING[index].progress_updater !== undefined){
						(GLOBALS.DOWNLOADING[index].progress_updater as SetState)(GLOBALS.DOWNLOADING[index].progress);
					}
				};
				ffmpeg.RNFFmpegConfig.enableStatisticsCallback(statisticsCallback);
				const all_promises = []
				await SQLActions.recreateAllTables();
				await Prefs.fetchPrefs();
				await SQLActions.fixToNewUpdate();
				await SQLActions.fetchTrackData();
				all_promises.push(SQLActions.cleanupRecentlyPlayed())
				if(Prefs.getExperimentalFeatureEnabled('smart_remove_cached_thumbnails'))
					all_promises.push(SQLActions.cleanCache())
				all_promises.push(activateKeepAwakeAsync());
				all_promises.push(Prefs.deepComparePrefsSchemaAndUpdatePrefsSchema());
				all_promises.push(Prefs.fetchAutoLinkedPlaylists());
				await Promise.all(all_promises)
			} catch (error) {
				Alert.alert("Error", String(error));
			} finally {
				setIsLoading(false);
				if(Prefs.getExperimentalFeatureEnabled('auto_cache_thumbnails'))
					await SQLActions.refreshCache()
			}
		})();
	},[]);
	useEffect(() => {
		if(isPlaying == "LOADING"){
			setIsPlaying("ON");
			GLOBALS.global_var.IsPlaying = true;
		}
	}, [isPlaying])

	function playTracks(first_track: Track, tracks: Track[], playlist_name: string){
		if(tracks.length === 0) return;
		if(!GLOBALS.global_var.ableToPlayAgainMutex || first_track.imported || first_track.downloaded){
			GLOBALS.global_var.ableToPlayAgainMutex = true
			if(Prefs.prefs.settings.only_play_downloaded && playlist_name !== "YouTube Mix"){
				tracks = tracks.filter((item) => item.downloaded || item.imported)
			}
			if(tracks.length > 0)
				if(Prefs.prefs.settings.always_shuffle) { // PLAY SHUFFLE
					let current_index = tracks.length;
					let random_index: number;
			
					while (current_index != 0) {
						random_index = Math.floor(Math.random() * current_index);
						current_index--;
			
						[tracks[current_index], tracks[random_index]] = [
						tracks[random_index], tracks[current_index]];
					}
					
					const this_index = tracks.findIndex((item) => item.uid == first_track.uid);
					tracks = swapItems(tracks, 0, this_index);
				}
				else { // PLAY ORDER
					const this_index = tracks.findIndex((item) => item.uid == first_track.uid);
					tracks = swapItems(tracks, 0, this_index);
				}
			GLOBALS.global_var.ableToPlayAgainMutex = false;
		} else{
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
			return;
		}
		if(tracks.length === 0) return;
		setPlayingTracks(tracks);
		setPlayingFrom(playlist_name);
		setIsPlaying("LOADING");
	}
	function waitFor(condition_function: () => boolean) {
		const poll = (resolve: any) => {
			if(condition_function()) resolve();
			else setTimeout(_ => poll(resolve), 400);
		}
		
		return new Promise(poll);
	}
	async function downloadTrack(track: Track, progress_updater: SetState|undefined, start_download: SetState|undefined, set_finished_downloaded: SetState | undefined = undefined): Promise<DownloadTrackResult>{
		function isInDownloadRange(uid: string, download_queue_max_length: number){
			for(let i = 0; i < download_queue_max_length; i++){
				if(GLOBALS.DOWNLOADING[i]?.uid === uid)
					return true;
			}
			return false;
		}
		
		GLOBALS.DOWNLOADING.push({'uid': track.uid, 'progress': 0, 'progress_updater': progress_updater, 'duration': track.video_duration})
		const download_queue_max_length = Prefs.prefs?.settings?.download_queue_max_length ?? 1
		waitFor(() => isInDownloadRange(track.uid, download_queue_max_length))
		.then(async() => {
			const youtube_url = `http://www.youtube.com/watch?v=${track.video_id}`;
			let download_uri;
			//140
			try {
			let requestOptions = {}
			if(Prefs.prefs.settings.use_cookies_on_download){
				requestOptions = {'headers': {
					'Cookies': Prefs.prefs.external_services.youtube_cookies
				}}
			}
			download_uri = await ytdl(youtube_url, { 'quality': 'lowestaudio', 'requestOptions': requestOptions }); // Low:18 - Med:22 - High:37
			download_uri = download_uri[0].url;
			} catch (error) {
				if(String(error).includes("Video unavailable")){
				SQLActions.addToBackpack(track.uid);
			}
			if(start_download != undefined)
				start_download(false)
			let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == track.uid)
			GLOBALS.DOWNLOADING.splice(itemIndex, 1)
			Alert.alert("Coudln't find the file", track.uid + ' : ' + error)
			return "ERROR";
			}
			try {
				if(start_download != undefined)
					start_download(true)

				const new_uri = FileSystem.documentDirectory + track.uid + '.m4a'
				ffmpeg.RNFFmpeg.executeAsync(`-y -i ${download_uri} ${new_uri}`, async() => {
					try {						
						const sound_temp = new Audio.Sound();
						await sound_temp.loadAsync({uri: new_uri});
						const meta_data = await sound_temp.getStatusAsync();
						await sound_temp.unloadAsync();
						if(meta_data.isLoaded === false){
							throw new Error('No load');
						}
						if(Math.round((meta_data.durationMillis ?? 0)/1000) < 3){
							throw new Error('Invalid Duration');
						}
				
						await SQLActions.setTrackAsDownloaded(track.uid, track.uid + '.m4a');
		
						const item_index = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == track.uid);
						GLOBALS.DOWNLOADING.splice(item_index, 1);
						
						await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
						
						if(GLOBALS.DOWNLOADING.length === 0){
							Alert.alert("Finished Download Enqueued Tracks");
						}
						if(start_download != undefined)
							start_download(false);
						if(set_finished_downloaded != undefined)
							set_finished_downloaded(true);
					} catch (error) {
						if(start_download != undefined)
							start_download(false);
						Alert.alert("Downloading Error","Failed To Download: " + JSON.stringify(track.uid) + ":\n"+ error);
						const item_index = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == track.uid);
						GLOBALS.DOWNLOADING.splice(item_index, 1)
						if(GLOBALS.DOWNLOADING.length === 0){
							Alert.alert("Finished Download Playlist")
						}
					}
				}).then(executionId => {
					let itemIndex = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == track.uid)
					GLOBALS.DOWNLOADING[itemIndex]['execution_id'] = executionId;
				})

			  	} catch (e) {
					if(start_download != undefined)
						start_download(false)
					Alert.alert("Downloading Error","Failed To Download: " + JSON.stringify(track.uid) + ":\n"+ e);
					const item_index = GLOBALS.DOWNLOADING.findIndex((item) => item.uid == track.uid)
					GLOBALS.DOWNLOADING.splice(item_index, 1)
					if(GLOBALS.DOWNLOADING.length === 0){
						Alert.alert("Finished Download Playlist")
					}
			  	}
				return "GOOD";
			});
		return "GOOD";
	}
	return (
		// <Provider store={store}>
			<NavigationContainer theme={Prefs.darkThemeDefault}>
					{/* {this.state.is_playing && <PlayingSong tracks={this.state.tracks} playing_from={this.state.playing_from}/>} */}
					{isLoading && <Image style={{flex:1, backgroundColor: 'black', width: '100%', height: '100%'}} source={require('./assets/splash.png')}/>}
					{isPlaying == "ON" && <AudioPlayer tracks={playingTracks} playing_from={playingFrom}/> }
					{!isLoading && <Stack.Navigator>
						<Stack.Screen name="Tabs" component={Tabs} options={{headerShown: false}}/>
						<Stack.Screen name="Add To Playlist" component={PlaylistAddSearch} options={{headerShown: true}} />
						<Stack.Screen name="Backup & Recovery" component={ExtraRecoveryScreen}/>
						<Stack.Screen name="Settings" component={ExtraSettingsScreen}/>
						<Stack.Screen name="SelectImportMusicServicePlaylist" component={SelectImportMusicServicePlaylist}  options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: Prefs.darkThemeDefault.colors.background,} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: Prefs.darkThemeDefault.colors.primary,
								headerRight: () => (
									<Button
										color='#808080'
										onPress={() => {}}
										title="Next"
									/>
									),
								})} />
						<Stack.Screen name="ImportMusicServicePlaylist" component={ImportMusicServicePlaylist} options={({ navigation }) => ({ headerShown: true, headerStyle: {backgroundColor: Prefs.darkThemeDefault.colors.background,} ,headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'}, headerTintColor: 'blue',
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
//headerShown: true, headerStyle: {backgroundColor: '#121212',},headerTitleStyle: {fontWeight: '500',color: '#FFFFFF'