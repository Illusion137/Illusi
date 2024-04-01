
import React,  { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, TouchableHighlight, Image, FlatList, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SongComponentSearch from '../../components/SongComponentSearch';
import ProgressBar from '../../components/ProgressBar';
import { GenerateNewUID } from '../../Illusive/IllusiveSearch';
import * as SQLActions from '../../../SQLActions';
import * as Illusive from '../../Illusive/IllusivePlaylistResolver';
import BigList from 'react-native-big-list';
import { Track } from '../../../types';
import TrackComponent from '../../components/TrackComponent';
import { MusicServices } from '../../../MusicServices';

export default function ImportServicePlaylist({route}) {
	const inputRef = useRef()
	const navigation: NavigationProp<any, any> = useNavigation();
	
	const [progress, setProgress] = useState(0);
	const [isDoneSearching, setDoneSearching] = useState(false)
	const [tracks, setTracks] = useState([])
	let serviceT = "";
	let serviceTEx = "";
	// const [title, setTitle] = useState('')
	const [badRequest, setBadRequest] = useState(false);
	
	const url = route.params.url;
	const service = route.params.title.toString().split(' ')[1]

	function setHeader(header_data, header_title) {
		navigation.setOptions({title: route.params.title})
		navigation.setOptions({ headerRight: () => (
			<Button
			color='#1313ff'
			onPress={() => ActionSheetIOS.showActionSheetWithOptions(
				{
				  options: ['Cancel', 'Save Playlist', 'Add Tracks To Library'],
				  cancelButtonIndex: 0,
				  userInterfaceStyle: 'dark',
				},
				async(buttonIndex) => {
				  if (buttonIndex === 0) {
				  } else if (buttonIndex === 1) {
						let m_title = header_title;
						let playlist_name = await SQLActions.createPlaylist(m_title);
						let allPromiseTracks = []
						for(const track of header_data){
							let uid = GenerateNewUID(track.video_name)
							let t = new Track({
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"uid": uid,
								"youtube": serviceT == "YouTube" ? true : false,
								"spotify": serviceTEx == "Spotify" ? true : false,
								"amazonmusic": serviceTEx == "Amazon" ? true : false,
								"exid": track.exid
							})
							if(!(await SQLActions.checkIfVideoIdExists(track.video_id))){
								allPromiseTracks.push(SQLActions.insertTrackData(t));
								allPromiseTracks.push(SQLActions.insertTrackIntoPlaylist(t.uid, playlist_name));
							} else{
								const videoIDUIDTrack = await SQLActions.getExistingVideoIdUID(track.video_id);
								allPromiseTracks.push(SQLActions.insertTrackIntoPlaylist(videoIDUIDTrack.uid, playlist_name));	
							}
						}
						await Promise.all(allPromiseTracks)
						navigation.navigate('Tabs')
						
				  } else if (buttonIndex === 2) {
					let allPromiseTracks = []
					for(const track of header_data){
						let uid = GenerateNewUID(track.video_name)
						if(!(await SQLActions.checkIfVideoIdExists(track.video_id))){
							allPromiseTracks.push(SQLActions.insertTrackData(new Track({
								"video_duration": track.video_duration,
								"video_name": track.video_name,
								"video_creator": track.video_creator,
								"video_id": track.video_id,
								"saved": true,
								"uid": uid,
								"youtube": serviceT == "YouTube" ? true : false,
								"spotify": serviceTEx == "Spotify" ? true : false,
								"amazonmusic": serviceTEx == "Amazon" ? true : false,
								"exid": track.exid
							})))
						}
					}
					await Promise.all(allPromiseTracks)
					navigation.navigate('Tabs')
				}
			}
			)
		}
		title="Save"
		/>
		)})
	}
	useEffect(() => {
		(async function() {
				try {
					const music_service_import = await MusicServices.music_service.get(service).get_playlist_import(url);
					for(let i = 0; i < music_service_import.tracks.length; i++) {
						music_service_import.tracks[i].uid = GenerateNewUID(music_service_import.tracks[i].video_name);
						music_service_import.tracks[i].disabled = true;
						music_service_import.tracks[i].saved = false;
						if(await SQLActions.checkIfVideoIdExists(music_service_import.tracks[i].video_id))
							music_service_import.tracks[i]['saved'] = true;
					}

					serviceT = 'YouTube';
					setDoneSearching(true);
					setHeader(music_service_import.tracks, music_service_import.title);
				}
				catch(error){
					console.log(error)
				}
			})();
	}, []);

	const renderItem = ({ item }) => (
		<TrackComponent track_data={item as Track}/>
		// <SongComponentSearch disabled={true} video_id={item.video_id} video_name={item.video_name} video_creator={item.video_creator} video_duration={item.video_duration} saved={item.saved} downloaded={item.downloaded} uid={GenerateNewUID(item.video_name)}/>
	);

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