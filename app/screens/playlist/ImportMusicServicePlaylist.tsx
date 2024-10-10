
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProgressBar from '../../components/ProgressBar';
import * as SQLActions from '../../../lib-origin/Illusive/src/illusi/src/sql_actions';
import BigList from 'react-native-big-list';
import { MusicServiceType, Route, Track, Artwork } from '../../../lib-origin/Illusive/src/types';

import TrackComponent from '../../components/TrackComponent';
import { Illusive } from '../../../lib-origin/Illusive/src/illusive';
import { generate_new_uid } from '../../../lib-origin/origin/src/utils/util';

export default function ImportMusicServicePlaylist(params: {route: any}) {
	const ts_route = params.route as Route<{url: string, title: string}>

	const navigation: NavigationProp<any, any> = useNavigation();
	
	const [isDoneSearching, setDoneSearching] = useState(false);
	const [tracks, setTracks] = useState([] as Track[]);
	const [badRequest, setBadRequest] = useState(false);
	
	const api_url = ts_route.params.url;
	const service_type = ts_route.params.title.replace('Import ', '').replace(' Playlist', '') as MusicServiceType;

	async function addTracksToLibrary(tracks: Track[]){
			const promised_tracks = [];
			for(const track of tracks)
					promised_tracks.push( SQLActions.insert_track(track) );
			await Promise.all(promised_tracks);
	}

	async function saveToPlaylist(tracks: Track[], imported_title: string){
		await addTracksToLibrary(tracks);
		
		const title = await SQLActions.create_playlist(imported_title);
		const promised_playlist_tracks = [];
		for(const track of tracks){
			const track_uid = await SQLActions.track_from_uid(track.uid);
			promised_playlist_tracks.push( SQLActions.insert_track_playlist(track_uid.uid, title) );	
		}
		await Promise.all(promised_playlist_tracks);
	} 

	async function fetchPlaylist() {
		try {
			const music_service_import = await Illusive.music_service.get(service_type)!.get_playlist!(api_url);
			if(music_service_import === undefined) throw "Something went wrong";
			for(let i = 0; i < music_service_import.tracks.length; i++) {
				music_service_import.tracks[i].playback = {
                    "artwork": Illusive.get_track_artwork(music_service_import.tracks[i]),
                    "added": false,
                    "successful": false
                }
				if(await SQLActions.track_exists(music_service_import.tracks[i]))
					music_service_import.tracks[i].downloading_data!.saved = true;
			}

			setDoneSearching(true);
			setTracks(music_service_import.tracks);
			setHeader(music_service_import.tracks, music_service_import.title);
		}
		catch(error){
			Alert.alert("Import Error", String(error));
		}
	}

	function setHeader(header_tracks: Track[], header_title: string) {
		navigation.setOptions({title: ts_route.params.title});
		navigation.setOptions({ headerRight: () => (
			<Button title='Save' color='#1313ff'
					onPress={() => ActionSheetIOS.showActionSheetWithOptions(
						{
							options: ['Cancel', 'Save Playlist', 'Add Tracks To Library'],
							cancelButtonIndex: 0,
							userInterfaceStyle: 'dark',
						},
						async(button_index) => {
							if (button_index === 0){}
							else if (button_index === 1) await saveToPlaylist(header_tracks, header_title);
							else if (button_index === 2) await addTracksToLibrary(header_tracks);
							if(button_index !== 0) navigation.navigate('Tabs');
						}
					)}
			/> ) 
		})
			
	}
	useEffect(() => {
		fetchPlaylist();
	}, []);

	const renderItem = (item: {item: Track}) => ( <TrackComponent track_data={item.item} write_playlist='LIBRARY'/> );

	return(
		<View style={{backgroundColor: '#181818', width: '100%', flex: 1,}}>
			{badRequest && <Text style={styles.badRequestText}>Bad Request check the url again</Text>}
			{/* { !isDoneSearching && <ProgressBar progressPercent={progress}/>} */}
			{ isDoneSearching && <View style={styles.searchview}>
				<BigList data={tracks} renderItem={renderItem} itemHeight={61} removeClippedSubviews={true} renderFooter={null} renderHeader={null}/>
			</View>}
		</View>
	);
}
const styles = StyleSheet.create({
	nameinput:{
		backgroundColor: '#121212',
		height: 60,
		color: 'white',
		width: '100%',
		padding: 10,
	},
	enterittext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 10
	},
	looksliketext:{
		color: '#909090',
		marginHorizontal: 10,
		marginTop: 15
	},
	exlinktext:{
		color: '#909090',
		marginHorizontal: 10
	},
	searchview:{
		backgroundColor: '#000000',
		top: 0,
		height: '100%'
	},
	badRequestText:{
		position: 'absolute',
		left: '50%',
		top: '50%',
		color: 'white',
		fontSize: 40
	}
});