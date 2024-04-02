
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';
import ProgressBar from '../../components/ProgressBar';
import { GenerateNewUID } from '../../Illusive/IllusiveSearch';
import * as SQLActions from '../../../SQLActions';
import * as Illusive from '../../Illusive/IllusivePlaylistResolver';
import BigList from 'react-native-big-list';
import { MusicServiceType, Route, Track, Artwork } from '../../../types';
import TrackComponent from '../../components/TrackComponent';
import { MusicServices } from '../../../MusicServices';

export default function ImportMusicServicePlaylist({route}) {
	const ts_route = route as Route<{url: string, title: string}>

	const navigation: NavigationProp<any, any> = useNavigation();
	
	const [isDoneSearching, setDoneSearching] = useState(false);
	const [tracks, setTracks] = useState([] as Track[]);
	const [badRequest, setBadRequest] = useState(false);
	
	const api_url = ts_route.params.url;
	const service_type = ts_route.params.title.replace('Import ', '').replace(' Playlist', '') as MusicServiceType;

	async function addTracksToLibrary(tracks: Track[]){
		const promised_tracks = [];
		for(const track of tracks)
				promised_tracks.push( SQLActions.insertTrackData(track) );
		await Promise.all(promised_tracks);
	}

	async function saveToPlaylist(tracks: Track[], imported_playlist_name: string){
		await addTracksToLibrary(tracks);
		
		const playlist_name = await SQLActions.createPlaylist(imported_playlist_name);
		const promised_playlist_tracks = [];
		for(const track of tracks){
			const track_uid = await SQLActions.getExistingVideoIdUID(track.video_id);
			promised_playlist_tracks.push( SQLActions.insertTrackIntoPlaylist(track_uid.uid, playlist_name) );	
		}
		await Promise.all(promised_playlist_tracks);
	} 

	async function fetchPlaylist() {
		try {
			const music_service_import = await MusicServices.music_service.get(service_type).get_playlist_import(api_url);
			for(let i = 0; i < music_service_import.tracks.length; i++) {
				music_service_import.tracks[i].uid = GenerateNewUID(music_service_import.tracks[i].video_name);
				music_service_import.tracks[i].disabled = true;
				music_service_import.tracks[i].saved = false;
				music_service_import.tracks[i].artwork = SQLActions.getTrackArtworkRP(music_service_import.tracks[i]);
				music_service_import.tracks[i].youtube = service_type !== "SoundCloud";
				music_service_import.tracks[i].spotify = service_type === "Spotify";
				music_service_import.tracks[i].amazonmusic = service_type === "Amazon Music";
				music_service_import.tracks[i].applemusic = service_type === "Apple Music";
				music_service_import.tracks[i].soundcloud = service_type === "SoundCloud";
				if(await SQLActions.checkIfVideoIdExists(music_service_import.tracks[i].video_id))
					music_service_import.tracks[i]['saved'] = true;
			}

			setDoneSearching(true);
			setTracks(music_service_import.tracks);
			setHeader(music_service_import.tracks, music_service_import.title);
		}
		catch(error){
			Alert.alert("error", error);
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

	const renderItem = ({ item }) => ( <TrackComponent track_data={item as Track} write_playlist='LIRBRARY'/> );

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